-- =====================================================================
-- 116_bc_license_keys
-- Software licence keys for Broadcast Copy packages, managed from the back
-- office (platform.broadcastcopy.ai/admin, platform admins only), plus the
-- validation endpoint the software can call later.
--
-- NOTHING ENFORCES THESE YET. No station software checks a key, and the
-- flagship station must never stop because of one. The validation function
-- only answers and records; what a client does with the answer is a later,
-- separate, owner-approved change.
--
-- ---------------------------------------------------------------- the key --
-- Format:  BCK1-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
--   'BCK1' = Broadcast Copy key, format version 1. Then 32 characters of
--   Crockford base32 (0-9 A-Z without I L O U), i.e. 160 random bits from
--   pgcrypto's gen_random_bytes (the OS CSPRNG). Crockford because a person
--   may read it off one screen and type it on another: validation forgives
--   case, spaces, hyphens, O-for-0 and I/L-for-1.
-- Stored: key_prefix = 'BCK1-' + the first 4 characters (20 bits, so a person
--   can tell keys apart in a list) and key_hash = hex SHA-256 of the canonical
--   key ('BCK1' + the 32 characters). The full key is returned ONCE by the
--   issue/rotate RPC and exists nowhere else -- not in this table, not in the
--   audit trail.
--
-- Why an UNSALTED SHA-256 is enough here (Jev 0.65, sha256): salting and slow
-- hashes exist to protect LOW-entropy secrets (passwords) from dictionary and
-- rainbow-table attacks. These keys are uniformly random: even knowing the
-- visible prefix, 140 bits remain, so recovering a key from a leaked hash is a
-- 2^140 brute force -- infeasible with or without salt. A deterministic hash
-- also gives an indexed equality lookup at validation time (the unique index
-- on key_hash), where a per-row salt would force a scan or a prefix bucket.
--
-- ------------------------------------------------------------ validation --
-- bc_license_validate(key, fingerprint, package, version, hostname) is
-- anon-callable (Jev 0.96, anon_rpc) -- the Suite Manager already reads the
-- release registry with the publishable key. It answers only about the key it
-- was given: status active | revoked | expired | unknown (or rate_limited /
-- invalid_request), plus allowed + reason for THIS machine and package (Jev
-- 0.99: the key's status stays 'active' and allowed=false says 'machine_limit'
-- or 'package_not_covered'). An active key's answer names its own licensee and
-- station; nothing about any other tenant is reachable.
--
-- Guessing resistance: the 140 unknown bits are the defence -- at a million
-- guesses a second, finding one key of a thousand would take ~10^30 years.
-- On top of that the function throttles: 10 failed lookups per 15 minutes per
-- client IP and per machine fingerprint (each kept only as a SHA-256), after
-- which it answers rate_limited without looking anything up. The IP comes from
-- the request headers PostgREST passes in (cf-connecting-ip, x-real-ip, else
-- the first x-forwarded-for hop, per Supabase's guidance) and can be forged by
-- a determined client, so it is noise reduction, not the security boundary.
--
-- ------------------------------------------------------------ activations --
-- One row per (key, machine fingerprint, package). A key's machine limit
-- counts DISTINCT fingerprints not released by an admin. An already-activated
-- machine keeps answering allowed=true even after the limit is reached; a new
-- machine past the limit is refused and NOT recorded. Rotation (re-issue)
-- leaves the old key's activations on the old key as history (Jev 0.98).
--
-- ----------------------------------------------------------------- access --
-- All three tables: RLS on, NO privilege for anon or authenticated. The only
-- ways in are the SECURITY DEFINER functions below: bc_admin_license_* check
-- is_platform_admin() first and raise 42501 otherwise; bc_license_validate is
-- the one anon entry point. Every admin write is recorded in bc_admin_audit
-- (migration 115) without the key or its hash.
--
-- CONTROL-PLANE ONLY: listed in supabase/TENANCY.md and dropped from new
-- station databases by the strip script. No defaults name any station.
-- =====================================================================

begin;

-- ================================================================ tables ==

create table if not exists public.bc_license_keys (
  id                text primary key default ('lic_' || replace(gen_random_uuid()::text, '-', '')),
  -- The licensee. A key always belongs to an organization; station_id narrows
  -- it to one of that organization's stations (null = organization-wide).
  -- RESTRICT: a licence is a commercial record, so an organization or station
  -- that holds one cannot be deleted by accident.
  org_id            text not null references public.organizations(id) on delete restrict,
  station_id        text references public.stations(id) on delete restrict,
  key_prefix        text not null,
  key_hash          text not null,
  label             text,
  notes             text,
  -- Package names this key covers; null = every package.
  packages          text[],
  -- Distinct machines allowed at once; null = no limit.
  max_activations   integer,
  -- null = never expires.
  expires_at        timestamptz,
  issued_by         uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  revoked_at        timestamptz,
  revoked_by        uuid,
  revoke_reason     text,
  -- Set on a re-issued key: the key it replaced.
  replaces_id       text references public.bc_license_keys(id) on delete set null,
  last_validated_at timestamptz,
  constraint bc_license_keys_hash_unique unique (key_hash),
  constraint bc_license_keys_hash_format check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint bc_license_keys_prefix_format check (key_prefix ~ '^BCK1-[0-9A-HJKMNP-TV-Z]{4}$'),
  constraint bc_license_keys_limit_sane check (max_activations is null or max_activations between 1 and 100000),
  constraint bc_license_keys_packages_sane check (
    packages is null or (cardinality(packages) between 1 and 50 and array_position(packages, null) is null)
  ),
  constraint bc_license_keys_label_len check (label is null or length(label) <= 200),
  constraint bc_license_keys_notes_len check (notes is null or length(notes) <= 4000),
  constraint bc_license_keys_revoked_pair check ((revoked_at is null) = (revoke_reason is null))
);

create index if not exists idx_bc_license_keys_org     on public.bc_license_keys (org_id, created_at desc);
create index if not exists idx_bc_license_keys_station on public.bc_license_keys (station_id) where station_id is not null;
create index if not exists idx_bc_license_keys_replaces on public.bc_license_keys (replaces_id) where replaces_id is not null;

drop trigger if exists set_updated_at_bc_license_keys on public.bc_license_keys;
create trigger set_updated_at_bc_license_keys before update on public.bc_license_keys
  for each row execute function public.update_updated_at_column();

comment on table public.bc_license_keys is
  'Software licence keys (migration 116). Only a SHA-256 hash and a short prefix are stored; the key is shown once. No client privileges: admin RPCs and bc_license_validate only.';

create table if not exists public.bc_license_activations (
  id          text primary key default ('act_' || replace(gen_random_uuid()::text, '-', '')),
  license_id  text not null references public.bc_license_keys(id) on delete cascade,
  -- An opaque, stable machine id supplied by the client (recommended: a
  -- SHA-256 of the OS machine GUID), never a hardware serial in the clear.
  fingerprint text not null,
  hostname    text,
  package     text not null,
  version     text,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  check_count integer not null default 1,
  -- An admin freed this machine's seat; it counts again if it checks back in.
  released_at timestamptz,
  released_by uuid,
  constraint bc_license_activations_unique unique (license_id, fingerprint, package)
);

create index if not exists idx_bc_license_activations_license on public.bc_license_activations (license_id, last_seen desc);

-- Failed-lookup counters for the validation throttle. Buckets are
-- 'ip:<sha256>' / 'fp:<sha256>' -- no raw IP address is stored.
create table if not exists public.bc_license_throttle (
  bucket       text not null,
  window_start timestamptz not null,
  failures     integer not null default 0,
  primary key (bucket, window_start)
);

create index if not exists idx_bc_license_throttle_window on public.bc_license_throttle (window_start);

-- ------------------------------------------------------------------- RLS --
alter table public.bc_license_keys        enable row level security;
alter table public.bc_license_activations enable row level security;
alter table public.bc_license_throttle    enable row level security;

revoke all on table public.bc_license_keys        from anon, authenticated;
revoke all on table public.bc_license_activations from anon, authenticated;
revoke all on table public.bc_license_throttle    from anon, authenticated;
grant all on table public.bc_license_keys        to service_role;
grant all on table public.bc_license_activations to service_role;
grant all on table public.bc_license_throttle    to service_role;

-- The service role only (tooling). No policy exists for anon or authenticated,
-- and neither holds a privilege: every client path is a function below.
drop policy if exists bc_license_keys_service on public.bc_license_keys;
create policy bc_license_keys_service on public.bc_license_keys
  for all to service_role using (true) with check (true);
drop policy if exists bc_license_activations_service on public.bc_license_activations;
create policy bc_license_activations_service on public.bc_license_activations
  for all to service_role using (true) with check (true);
drop policy if exists bc_license_throttle_service on public.bc_license_throttle;
create policy bc_license_throttle_service on public.bc_license_throttle
  for all to service_role using (true) with check (true);

-- =============================================================== helpers ==
-- Internal: none of these is executable by a client role.

-- Raise 42501 unless the caller is a platform admin. First line of every
-- bc_admin_* function.
create or replace function public.bc_require_platform_admin()
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not coalesce(public.is_platform_admin(), false) then
    raise exception 'platform admin only' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.bc_require_platform_admin() from public, anon, authenticated;

-- A new canonical key: 'BCK1' + 32 Crockford base32 characters (160 bits).
create or replace function public.bc_license_generate()
returns text
language plpgsql
volatile
set search_path = pg_catalog
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  raw  bytea := extensions.gen_random_bytes(20);
  acc  bigint;
  res  text := 'BCK1';
  i    int;
  j    int;
begin
  -- 20 bytes = 4 blocks of 40 bits; each block becomes 8 characters.
  for i in 0..3 loop
    acc := 0;
    for j in 0..4 loop
      acc := (acc << 8) | get_byte(raw, i * 5 + j);
    end loop;
    for j in reverse 7..0 loop
      res := res || substr(alphabet, ((acc >> (j * 5)) & 31)::int + 1, 1);
    end loop;
  end loop;
  return res;
end;
$$;
revoke execute on function public.bc_license_generate() from public, anon, authenticated;

-- What a person typed -> the canonical key, or null if it cannot be one.
-- Forgives case, spaces, hyphens, O->0, I/L->1, and a missing 'BCK1' tag.
create or replace function public.bc_license_canonical(p_key text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
           when k ~ '^BCK1[0-9A-HJKMNP-TV-Z]{32}$' then k
           when k ~ '^[0-9A-HJKMNP-TV-Z]{32}$'     then 'BCK1' || k
         end
  from (
    select translate(upper(regexp_replace(left(coalesce(p_key, ''), 200), '[^0-9A-Za-z]', '', 'g')), 'OIL', '011') as k
  ) x;
$$;
revoke execute on function public.bc_license_canonical(text) from public, anon, authenticated;

create or replace function public.bc_license_hash(p_canonical text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select encode(sha256(convert_to(p_canonical, 'UTF8')), 'hex');
$$;
revoke execute on function public.bc_license_hash(text) from public, anon, authenticated;

-- Canonical -> 'BCK1-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX'.
create or replace function public.bc_license_display(p_canonical text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select 'BCK1-' || string_agg(substr(p_canonical, 5 + g * 4, 4), '-' order by g)
  from generate_series(0, 7) g;
$$;
revoke execute on function public.bc_license_display(text) from public, anon, authenticated;

create or replace function public.bc_license_status(p_revoked_at timestamptz, p_expires_at timestamptz)
returns text
language sql
stable
set search_path = pg_catalog
as $$
  select case
           when p_revoked_at is not null then 'revoked'
           when p_expires_at is not null and p_expires_at <= now() then 'expired'
           else 'active'
         end;
$$;
revoke execute on function public.bc_license_status(timestamptz, timestamptz) from public, anon, authenticated;

-- A package list as the admin typed it -> sorted, de-duplicated, validated,
-- or null for "every package".
create or replace function public.bc_license_clean_packages(p_packages text[])
returns text[]
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v text[];
  p text;
begin
  select array_agg(distinct lower(btrim(x)) order by lower(btrim(x)))
    into v
  from unnest(coalesce(p_packages, '{}'::text[])) x
  where x is not null and btrim(x) <> '';
  if v is null then return null; end if;
  foreach p in array v loop
    if p !~ '^[a-z0-9][a-z0-9._-]{0,63}$' then
      raise exception 'invalid package name "%": use lower-case letters, digits, dot, dash or underscore', p
        using errcode = '22023';
    end if;
  end loop;
  if cardinality(v) > 50 then
    raise exception 'at most 50 packages per key' using errcode = '22023';
  end if;
  return v;
end;
$$;
revoke execute on function public.bc_license_clean_packages(text[]) from public, anon, authenticated;

-- The row as the audit trail and the admin UI may see it: never the hash.
create or replace function public.bc_license_public(k public.bc_license_keys)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select to_jsonb(k) - 'key_hash'
         || jsonb_build_object('status', public.bc_license_status(k.revoked_at, k.expires_at));
$$;
revoke execute on function public.bc_license_public(public.bc_license_keys) from public, anon, authenticated;

-- ======================================================== admin: read ==

create or replace function public.bc_admin_licenses()
returns table (
  id                text,
  org_id            text,
  org_name          text,
  station_id        text,
  station_name      text,
  station_call_sign text,
  key_prefix        text,
  label             text,
  notes             text,
  packages          text[],
  max_activations   integer,
  expires_at        timestamptz,
  status            text,
  created_at        timestamptz,
  issued_by_email   text,
  revoked_at        timestamptz,
  revoke_reason     text,
  replaces_id       text,
  replaced_by_id    text,
  machines          integer,
  last_validated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
#variable_conflict use_column
begin
  perform public.bc_require_platform_admin();
  return query
  select
    k.id, k.org_id, o.name, k.station_id, s.name, s.call_sign,
    k.key_prefix, k.label, k.notes, k.packages, k.max_activations, k.expires_at,
    public.bc_license_status(k.revoked_at, k.expires_at),
    k.created_at,
    (select u.email::text from auth.users u where u.id = k.issued_by),
    k.revoked_at, k.revoke_reason, k.replaces_id,
    (select r.id from public.bc_license_keys r where r.replaces_id = k.id order by r.created_at desc limit 1),
    (select count(distinct a.fingerprint)::int from public.bc_license_activations a
      where a.license_id = k.id and a.released_at is null),
    k.last_validated_at
  from public.bc_license_keys k
  join public.organizations o on o.id = k.org_id
  left join public.stations s on s.id = k.station_id
  order by k.created_at desc;
end;
$$;
revoke execute on function public.bc_admin_licenses() from public, anon;
grant execute on function public.bc_admin_licenses() to authenticated;

create or replace function public.bc_admin_license_activations(p_license_id text)
returns table (
  id          text,
  fingerprint text,
  hostname    text,
  package     text,
  version     text,
  first_seen  timestamptz,
  last_seen   timestamptz,
  check_count integer,
  released_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
#variable_conflict use_column
begin
  perform public.bc_require_platform_admin();
  return query
  select a.id, a.fingerprint, a.hostname, a.package, a.version,
         a.first_seen, a.last_seen, a.check_count, a.released_at
  from public.bc_license_activations a
  where a.license_id = p_license_id
  order by a.released_at nulls first, a.last_seen desc;
end;
$$;
revoke execute on function public.bc_admin_license_activations(text) from public, anon;
grant execute on function public.bc_admin_license_activations(text) to authenticated;

-- ======================================================= admin: write ==

-- Issue a key. p_org_id and/or p_station_id: a station alone implies its
-- organization; both must agree. Returns { id, key, key_prefix } -- the only
-- time the full key ever leaves the database.
create or replace function public.bc_admin_license_issue(
  p_org_id          text,
  p_station_id      text        default null,
  p_packages        text[]      default null,
  p_max_activations integer     default null,
  p_expires_at      timestamptz default null,
  p_label           text        default null,
  p_notes           text        default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org     text := nullif(btrim(coalesce(p_org_id, '')), '');
  v_station text := nullif(btrim(coalesce(p_station_id, '')), '');
  v_st_org  text;
  v_key     text;
  v_hash    text;
  k         public.bc_license_keys;
begin
  perform public.bc_require_platform_admin();

  if v_station is not null then
    select s.org_id into v_st_org from public.stations s where s.id = v_station;
    if v_st_org is null then
      raise exception 'station not found' using errcode = 'P0002';
    end if;
    if v_org is not null and v_org <> v_st_org then
      raise exception 'that station belongs to a different organization' using errcode = '22023';
    end if;
    v_org := v_st_org;
  end if;
  if v_org is null then
    raise exception 'choose an organization or a station' using errcode = '22023';
  end if;
  if not exists (select 1 from public.organizations o where o.id = v_org) then
    raise exception 'organization not found' using errcode = 'P0002';
  end if;
  if p_max_activations is not null and (p_max_activations < 1 or p_max_activations > 100000) then
    raise exception 'machine limit must be between 1 and 100000, or empty for no limit' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'expiry must be in the future' using errcode = '22023';
  end if;

  -- A collision at 160 bits will not happen; the loop just makes it a
  -- non-event rather than a unique-violation error if it ever did.
  loop
    v_key  := public.bc_license_generate();
    v_hash := public.bc_license_hash(v_key);
    exit when not exists (select 1 from public.bc_license_keys x where x.key_hash = v_hash);
  end loop;

  insert into public.bc_license_keys
    (org_id, station_id, key_prefix, key_hash, label, notes, packages, max_activations, expires_at, issued_by)
  values (
    v_org, v_station,
    'BCK1-' || substr(v_key, 5, 4),
    v_hash,
    nullif(left(btrim(coalesce(p_label, '')), 200), ''),
    nullif(left(btrim(coalesce(p_notes, '')), 4000), ''),
    public.bc_license_clean_packages(p_packages),
    p_max_activations,
    p_expires_at,
    auth.uid()
  )
  returning * into k;

  perform public.bc_audit('license.issue', 'bc_license_keys', k.id, null, public.bc_license_public(k));

  return jsonb_build_object('id', k.id, 'key', public.bc_license_display(v_key), 'key_prefix', k.key_prefix);
end;
$$;
revoke execute on function public.bc_admin_license_issue(text, text, text[], integer, timestamptz, text, text) from public, anon;
grant execute on function public.bc_admin_license_issue(text, text, text[], integer, timestamptz, text, text) to authenticated;

-- Edit a key. p_patch carries only the fields to change, so "set to null"
-- (no limit / never expires / every package) is distinguishable from "leave":
--   label, notes, packages (array or null), max_activations (int or null),
--   expires_at (ISO timestamp or null).
-- A revoked key accepts label/notes only.
create or replace function public.bc_admin_license_update(p_id text, p_patch jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  k_old public.bc_license_keys;
  k     public.bc_license_keys;
  v_key text;
  v_pkgs text[];
  v_max  integer;
  v_exp  timestamptz;
begin
  perform public.bc_require_platform_admin();
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'patch must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('label', 'notes', 'packages', 'max_activations', 'expires_at') then
      raise exception 'field "%" cannot be edited', v_key using errcode = '22023';
    end if;
  end loop;

  select * into k_old from public.bc_license_keys where id = p_id for update;
  if k_old.id is null then
    raise exception 'licence key not found' using errcode = 'P0002';
  end if;
  if k_old.revoked_at is not null
     and (p_patch ?| array['packages', 'max_activations', 'expires_at']) then
    raise exception 'a revoked key cannot change scope; re-issue it instead' using errcode = '22023';
  end if;

  v_pkgs := k_old.packages;
  if p_patch ? 'packages' then
    if jsonb_typeof(p_patch -> 'packages') = 'null' then
      v_pkgs := null;
    elsif jsonb_typeof(p_patch -> 'packages') = 'array' then
      v_pkgs := public.bc_license_clean_packages(array(select jsonb_array_elements_text(p_patch -> 'packages')));
    else
      raise exception 'packages must be a list or null' using errcode = '22023';
    end if;
  end if;

  v_max := k_old.max_activations;
  if p_patch ? 'max_activations' then
    v_max := (p_patch ->> 'max_activations')::integer;
    if v_max is not null and (v_max < 1 or v_max > 100000) then
      raise exception 'machine limit must be between 1 and 100000, or empty for no limit' using errcode = '22023';
    end if;
  end if;

  v_exp := k_old.expires_at;
  if p_patch ? 'expires_at' then
    v_exp := (p_patch ->> 'expires_at')::timestamptz;
  end if;

  update public.bc_license_keys set
    label = case when p_patch ? 'label'
                 then nullif(left(btrim(coalesce(p_patch ->> 'label', '')), 200), '') else label end,
    notes = case when p_patch ? 'notes'
                 then nullif(left(btrim(coalesce(p_patch ->> 'notes', '')), 4000), '') else notes end,
    packages = v_pkgs,
    max_activations = v_max,
    expires_at = v_exp
  where id = p_id
  returning * into k;

  perform public.bc_audit('license.update', 'bc_license_keys', k.id,
                          public.bc_license_public(k_old), public.bc_license_public(k));
  return public.bc_license_public(k);
end;
$$;
revoke execute on function public.bc_admin_license_update(text, jsonb) from public, anon;
grant execute on function public.bc_admin_license_update(text, jsonb) to authenticated;

create or replace function public.bc_admin_license_revoke(p_id text, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  k_old public.bc_license_keys;
  k     public.bc_license_keys;
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 500), '');
begin
  perform public.bc_require_platform_admin();
  if v_reason is null then
    raise exception 'give a reason for revoking' using errcode = '22023';
  end if;
  select * into k_old from public.bc_license_keys where id = p_id for update;
  if k_old.id is null then
    raise exception 'licence key not found' using errcode = 'P0002';
  end if;
  if k_old.revoked_at is not null then
    raise exception 'this key is already revoked' using errcode = '22023';
  end if;

  update public.bc_license_keys
     set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = v_reason
   where id = p_id
  returning * into k;

  perform public.bc_audit('license.revoke', 'bc_license_keys', k.id,
                          public.bc_license_public(k_old), public.bc_license_public(k), v_reason);
  return public.bc_license_public(k);
end;
$$;
revoke execute on function public.bc_admin_license_revoke(text, text) from public, anon;
grant execute on function public.bc_admin_license_revoke(text, text) to authenticated;

-- Re-issue: a NEW key with the same licensee and scope, and the old key
-- revoked in the same transaction. Returns { id, key, key_prefix, replaces_id }.
-- The old key's activations stay with it as history; machines activate again
-- with the new key.
create or replace function public.bc_admin_license_rotate(p_id text, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  k_old  public.bc_license_keys;
  k_rev  public.bc_license_keys;
  k_new  public.bc_license_keys;
  v_key  text;
  v_hash text;
  v_reason text := coalesce(nullif(left(btrim(coalesce(p_reason, '')), 500), ''), 're-issued');
begin
  perform public.bc_require_platform_admin();
  select * into k_old from public.bc_license_keys where id = p_id for update;
  if k_old.id is null then
    raise exception 'licence key not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.bc_license_keys r where r.replaces_id = k_old.id) then
    raise exception 'this key has already been re-issued' using errcode = '22023';
  end if;
  if k_old.expires_at is not null and k_old.expires_at <= now() then
    raise exception 'this key expired on %; extend its expiry first, then re-issue', k_old.expires_at
      using errcode = '22023';
  end if;

  loop
    v_key  := public.bc_license_generate();
    v_hash := public.bc_license_hash(v_key);
    exit when not exists (select 1 from public.bc_license_keys x where x.key_hash = v_hash);
  end loop;

  insert into public.bc_license_keys
    (org_id, station_id, key_prefix, key_hash, label, notes, packages, max_activations, expires_at, issued_by, replaces_id)
  values (
    k_old.org_id, k_old.station_id,
    'BCK1-' || substr(v_key, 5, 4), v_hash,
    k_old.label, k_old.notes, k_old.packages, k_old.max_activations, k_old.expires_at,
    auth.uid(), k_old.id
  )
  returning * into k_new;

  if k_old.revoked_at is null then
    update public.bc_license_keys
       set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = v_reason
     where id = k_old.id
    returning * into k_rev;
  else
    k_rev := k_old;
  end if;

  perform public.bc_audit('license.rotate', 'bc_license_keys', k_new.id,
                          public.bc_license_public(k_old),
                          jsonb_build_object('new', public.bc_license_public(k_new),
                                             'old', public.bc_license_public(k_rev)),
                          v_reason);

  return jsonb_build_object('id', k_new.id, 'key', public.bc_license_display(v_key),
                            'key_prefix', k_new.key_prefix, 'replaces_id', k_old.id);
end;
$$;
revoke execute on function public.bc_admin_license_rotate(text, text) from public, anon;
grant execute on function public.bc_admin_license_rotate(text, text) to authenticated;

-- Free a machine's seat (a replaced PC, a reinstall). The row is kept.
create or replace function public.bc_admin_license_release_activation(p_activation_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  a_old public.bc_license_activations;
  a     public.bc_license_activations;
begin
  perform public.bc_require_platform_admin();
  select * into a_old from public.bc_license_activations where id = p_activation_id for update;
  if a_old.id is null then
    raise exception 'activation not found' using errcode = 'P0002';
  end if;
  if a_old.released_at is not null then
    raise exception 'this seat is already released' using errcode = '22023';
  end if;
  -- The whole machine: every package row for this fingerprint on this key.
  update public.bc_license_activations
     set released_at = now(), released_by = auth.uid()
   where license_id = a_old.license_id and fingerprint = a_old.fingerprint and released_at is null;
  select * into a from public.bc_license_activations where id = p_activation_id;
  perform public.bc_audit('license.release_machine', 'bc_license_activations', a.id,
                          to_jsonb(a_old), to_jsonb(a));
  return to_jsonb(a);
end;
$$;
revoke execute on function public.bc_admin_license_release_activation(text) from public, anon;
grant execute on function public.bc_admin_license_release_activation(text) to authenticated;

-- ============================================== validation (anon-callable) ==

create or replace function public.bc_license_validate(
  p_key         text,
  p_fingerprint text,
  p_package     text,
  p_version     text default null,
  p_hostname    text default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  c_max_failures constant integer := 10;
  c_window       constant interval := interval '15 minutes';
  v_headers  jsonb;
  v_ip       text;
  v_window   timestamptz := date_bin(c_window, now(), timestamptz '2000-01-01 00:00:00+00');
  v_buckets  text[];
  v_fp       text := btrim(coalesce(p_fingerprint, ''));
  v_pkg      text := lower(btrim(coalesce(p_package, '')));
  v_version  text := nullif(left(regexp_replace(coalesce(p_version, ''), '[^0-9A-Za-z.+_-]', '', 'g'), 64), '');
  v_host     text := nullif(left(regexp_replace(coalesce(p_hostname, ''), '[^0-9A-Za-z._-]', '', 'g'), 253), '');
  v_canon    text;
  v_status   text;
  v_machines integer;
  v_known    boolean;
  k          public.bc_license_keys;
begin
  -- 1. Shape of the request. Nothing is looked up or counted for a request
  --    that could not be a real client's.
  if v_fp !~ '^[A-Za-z0-9._:-]{8,128}$' then
    return jsonb_build_object('status', 'invalid_request', 'allowed', false, 'reason', 'bad_fingerprint');
  end if;
  if v_pkg !~ '^[a-z0-9][a-z0-9._-]{0,63}$' then
    return jsonb_build_object('status', 'invalid_request', 'allowed', false, 'reason', 'bad_package');
  end if;

  -- 2. Throttle buckets: hashed client IP (when the request carries one) and
  --    hashed fingerprint.
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;
  v_ip := btrim(coalesce(v_headers ->> 'cf-connecting-ip',
                         v_headers ->> 'x-real-ip',
                         split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1),
                         ''));
  v_buckets := array['fp:' || public.bc_license_hash(v_fp)];
  if v_ip <> '' then
    v_buckets := v_buckets || ('ip:' || public.bc_license_hash(v_ip));
  end if;

  if exists (select 1 from public.bc_license_throttle t
             where t.bucket = any (v_buckets) and t.window_start = v_window
               and t.failures >= c_max_failures) then
    return jsonb_build_object(
      'status', 'rate_limited', 'allowed', false, 'reason', 'too_many_failed_attempts',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_window + c_window - now())))::int));
  end if;

  -- 3. Look the key up by its hash. The row lock serialises seat counting for
  --    concurrent activations of the same key.
  v_canon := public.bc_license_canonical(p_key);
  if v_canon is not null then
    select * into k from public.bc_license_keys x
     where x.key_hash = public.bc_license_hash(v_canon)
     for update;
  end if;

  if k.id is null then
    insert into public.bc_license_throttle as t (bucket, window_start, failures)
    select b, v_window, 1 from unnest(v_buckets) b
    on conflict (bucket, window_start) do update set failures = t.failures + 1;
    -- Opportunistic pruning keeps the counter table small without a cron job.
    if random() < 0.02 then
      delete from public.bc_license_throttle where window_start < now() - interval '1 day';
    end if;
    return jsonb_build_object('status', 'unknown', 'allowed', false, 'reason', 'unknown_key');
  end if;

  v_status := public.bc_license_status(k.revoked_at, k.expires_at);
  update public.bc_license_keys set last_validated_at = now() where id = k.id;

  -- 4. Revoked / expired: answer, and note the check on the machine's
  --    existing activation (so an admin sees a revoked key still in use), but
  --    never create one.
  if v_status <> 'active' then
    update public.bc_license_activations a
       set last_seen = now(), check_count = a.check_count + 1,
           version = coalesce(v_version, a.version), hostname = coalesce(v_host, a.hostname)
     where a.license_id = k.id and a.fingerprint = v_fp and a.package = v_pkg;
    return jsonb_build_object(
      'status', v_status, 'allowed', false, 'reason', v_status,
      'expires_at', case when v_status = 'expired' then k.expires_at end);
  end if;

  -- 5. Active key: is this package covered?
  if k.packages is not null and not (v_pkg = any (k.packages)) then
    return jsonb_build_object('status', 'active', 'allowed', false, 'reason', 'package_not_covered');
  end if;

  -- 6. Machine limit: a machine already holding a seat on this key keeps it;
  --    a new machine needs a free seat.
  select exists (select 1 from public.bc_license_activations a
                  where a.license_id = k.id and a.fingerprint = v_fp and a.released_at is null)
    into v_known;
  select count(distinct a.fingerprint)::int into v_machines
    from public.bc_license_activations a
   where a.license_id = k.id and a.released_at is null;

  if not v_known and k.max_activations is not null and v_machines >= k.max_activations then
    return jsonb_build_object(
      'status', 'active', 'allowed', false, 'reason', 'machine_limit',
      'machines_used', v_machines, 'max_machines', k.max_activations);
  end if;

  insert into public.bc_license_activations as a (license_id, fingerprint, hostname, package, version)
  values (k.id, v_fp, v_host, v_pkg, v_version)
  on conflict (license_id, fingerprint, package) do update set
    last_seen   = now(),
    check_count = a.check_count + 1,
    version     = coalesce(excluded.version, a.version),
    hostname    = coalesce(excluded.hostname, a.hostname),
    released_at = null,
    released_by = null;

  return jsonb_build_object(
    'status', 'active', 'allowed', true, 'reason', 'ok',
    'expires_at', k.expires_at,
    'packages', to_jsonb(k.packages),
    'machines_used', case when v_known then v_machines else v_machines + 1 end,
    'max_machines', k.max_activations,
    'licensed_to', (select o.name from public.organizations o where o.id = k.org_id),
    'station', (select s.name from public.stations s where s.id = k.station_id));
end;
$$;
revoke execute on function public.bc_license_validate(text, text, text, text, text) from public;
grant execute on function public.bc_license_validate(text, text, text, text, text) to anon, authenticated, service_role;

commit;
