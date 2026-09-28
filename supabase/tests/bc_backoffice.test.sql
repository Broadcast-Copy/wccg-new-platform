-- =====================================================================
-- supabase/tests/bc_backoffice.test.sql
-- Re-runnable proof for migrations 115-118 (the Broadcast Copy back office:
-- audit trail, licence keys, users & roles, organizations/stations).
--
-- SAFE AGAINST PRODUCTION: everything runs inside ONE transaction that ends in
-- ROLLBACK, so nothing it creates, changes or records survives. It inserts no
-- lead (bc_leads INSERT fires an e-mail via pg_net), creates no auth account,
-- and never truncates anything.
--
-- Run AFTER 115-118 are applied (MCP execute_sql, or the SQL editor). The last
-- statement before the rollback returns one row per check; every `ok` must be
-- true. To dry-run BEFORE applying, paste the four migration bodies (without
-- their own begin;/commit; lines) right after the `begin;` below.
--
-- Actors, simulated with `set role` + request.jwt.claims:
--   anon         -- the public key, signed out
--   plain        -- an existing signed-in account that is NOT a super admin
--   super admin  -- 4a0999a6-b7a1-4509-88ec-09302426a7b4
-- =====================================================================

begin;

-- ------------------------------------------------------------- harness --
create temp table _r (n serial, label text, ok boolean, detail text);
grant all on _r to public;
grant usage on sequence _r_n_seq to public;

create function pg_temp.chk(p_label text, p_ok boolean, p_detail text default null)
returns void language sql as $$
  insert into pg_temp._r (label, ok, detail) values (p_label, coalesce(p_ok, false), p_detail);
$$;

create function pg_temp.expect_error(p_label text, p_sql text, p_state text default '42501')
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    perform pg_temp.chk(p_label, false, 'no error raised');
  exception when others then
    perform pg_temp.chk(p_label, sqlstate = p_state, sqlstate || ': ' || sqlerrm);
  end;
end $$;

create function pg_temp.expect_rows(p_label text, p_sql text, p_expected bigint)
returns void language plpgsql as $$
declare n bigint;
begin
  begin
    execute format('select count(*) from (%s) q', p_sql) into n;
    perform pg_temp.chk(p_label, n = p_expected, 'rows=' || n || ' expected=' || p_expected);
  exception when others then
    perform pg_temp.chk(p_label, false, sqlstate || ': ' || sqlerrm);
  end;
end $$;

-- Switch actor. SET ROLE is checked against the SESSION user, so switching
-- back up from anon works.
create function pg_temp.become(p_who text)
returns void language plpgsql as $$
begin
  if p_who = 'anon' then
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  elsif p_who = 'owner' then
    perform set_config('role', 'none', true);
    perform set_config('request.jwt.claims', '', true);
  else
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims',
      json_build_object('sub', (select case p_who when 'sa' then sa else plain end from pg_temp._fx),
                        'role', 'authenticated')::text, true);
  end if;
  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.7, 10.0.0.1"}', true);
end $$;

-- Validate as the public key would.
create function pg_temp.v(p_key text, p_fp text, p_pkg text default 'airsuite-console',
                          p_ip text default '203.0.113.7')
returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform pg_temp.become('anon');
  perform set_config('request.headers',
    json_build_object('x-forwarded-for', p_ip || ', 10.0.0.1')::text, true);
  r := public.bc_license_validate(p_key, p_fp, p_pkg, '1.2.3', 'TEST-PC');
  perform pg_temp.become('owner');
  return r;
end $$;

-- ------------------------------------------------------------ fixtures --
create temp table _fx as
select
  '4a0999a6-b7a1-4509-88ec-09302426a7b4'::uuid as sa,
  (select p.id from public.profiles p
     join auth.users u on u.id = p.id
    where not exists (select 1 from public.user_roles ur
                       where ur.profile_id = p.id and replace(ur.role_id, 'role_', '') = 'super_admin')
    order by p.created_at limit 1) as plain,
  (select s.id from public.stations s
     join public.airsuite_station_status a on a.station_id = s.id
    where a.updated_at > now() - interval '7 days'
    order by s.created_at limit 1) as live_station;
grant select on _fx to public;

-- A throwaway tenant, created and destroyed inside this transaction.
insert into public.organizations (id, name, slug, status)
values ('org_bctest_backoffice', 'Backoffice Test Org', 'bctest-backoffice-org', 'active');
insert into public.stations (id, org_id, name, slug, call_sign, status, is_public)
values ('station_bctest_backoffice', 'org_bctest_backoffice', 'Backoffice Test FM', 'bctest-backoffice-fm',
        'WTST', 'active', false);

create temp table _keys (name text primary key, id text, key text);
grant all on _keys to public;

do $$ begin
  perform pg_temp.chk('fixture: super admin exists and is the only one',
    (select count(distinct profile_id) from public.user_roles
      where replace(role_id, 'role_', '') = 'super_admin') = 1
    and exists (select 1 from public.user_roles ur, pg_temp._fx f
                 where ur.profile_id = f.sa and replace(ur.role_id, 'role_', '') = 'super_admin'));
  perform pg_temp.chk('fixture: a non-admin account exists', (select plain from pg_temp._fx) is not null);
  perform pg_temp.chk('fixture: a live station exists', (select live_station from pg_temp._fx) is not null);
end $$;

-- ==================================================== super admin: keys --
select pg_temp.become('sa');

do $$
declare r jsonb; k record; body text;
begin
  perform pg_temp.chk('sa: is_platform_admin() is true', public.is_platform_admin());

  -- Issue: returned once, well-formed; only hash + prefix stored.
  r := public.bc_admin_license_issue('org_bctest_backoffice', null, null, null, null, 'basic', 'test');
  insert into pg_temp._keys values ('basic', r ->> 'id', r ->> 'key');
  perform pg_temp.chk('issue: key format BCK1-XXXX x8',
    (r ->> 'key') ~ '^BCK1(-[0-9A-HJKMNP-TV-Z]{4}){8}$', r ->> 'key_prefix');
  perform pg_temp.chk('issue: prefix is the first group', (r ->> 'key') like (r ->> 'key_prefix') || '-%');

  perform pg_temp.become('owner');
  select * into k from public.bc_license_keys where id = r ->> 'id';
  body := replace(substr(r ->> 'key', 6), '-', '');
  perform pg_temp.chk('issue: stored hash = sha256(canonical key)',
    k.key_hash = encode(sha256(convert_to('BCK1' || body, 'UTF8')), 'hex'));
  perform pg_temp.chk('issue: the key itself is stored nowhere in the row',
    position(body in to_jsonb(k)::text) = 0);
  perform pg_temp.chk('issue: audit row written without key or hash',
    exists (select 1 from public.bc_admin_audit a where a.action = 'license.issue' and a.target_id = k.id
             and a.actor_id = (select sa from pg_temp._fx)
             and position(body in coalesce(a.after::text, '')) = 0
             and position(k.key_hash in coalesce(a.after::text, '')) = 0));
  perform pg_temp.become('sa');

  -- Scoped keys used below.
  r := public.bc_admin_license_issue(null, 'station_bctest_backoffice', null, 1, null, 'one seat', null);
  insert into pg_temp._keys values ('oneseat', r ->> 'id', r ->> 'key');
  r := public.bc_admin_license_issue('org_bctest_backoffice', null, array['AirSuite-Console', 'airsuite-console'],
                                     null, null, 'console only', null);
  insert into pg_temp._keys values ('console', r ->> 'id', r ->> 'key');
  perform pg_temp.chk('issue: packages cleaned + de-duplicated',
    (select packages from public.bc_admin_licenses() where id = r ->> 'id') = array['airsuite-console']);
  r := public.bc_admin_license_issue('org_bctest_backoffice', null, null, null, now() + interval '1 day', 'expiring', null);
  insert into pg_temp._keys values ('expiring', r ->> 'id', r ->> 'key');
  r := public.bc_admin_license_issue('org_bctest_backoffice', null, null, null, null, 'to revoke', null);
  insert into pg_temp._keys values ('revoke', r ->> 'id', r ->> 'key');
  r := public.bc_admin_license_issue('org_bctest_backoffice', null, null, null, null, 'to rotate', null);
  insert into pg_temp._keys values ('rotate', r ->> 'id', r ->> 'key');

  perform pg_temp.chk('issue: station key inherits the station''s org',
    (select org_id from public.bc_admin_licenses() where id = (select id from pg_temp._keys where name = 'oneseat'))
      = 'org_bctest_backoffice');
  perform pg_temp.chk('list: bc_admin_licenses shows the new keys as active',
    (select count(*) from public.bc_admin_licenses() where org_id = 'org_bctest_backoffice' and status = 'active') = 6);
end $$;

select pg_temp.expect_error('issue: station of another org refused',
  $q$select public.bc_admin_license_issue('org_bctest_backoffice', (select live_station from pg_temp._fx))$q$, '22023');
select pg_temp.expect_error('issue: past expiry refused',
  $q$select public.bc_admin_license_issue('org_bctest_backoffice', null, null, null, now() - interval '1 hour')$q$, '22023');
select pg_temp.expect_error('issue: bad package name refused',
  $q$select public.bc_admin_license_issue('org_bctest_backoffice', null, array['Bad Name!'])$q$, '22023');

-- ============================================ validation (as anon) --
select pg_temp.become('owner');
do $$
declare r jsonb; k text;
begin
  select key into k from pg_temp._keys where name = 'basic';
  r := pg_temp.v(k, 'fp-machine-aaaa');
  perform pg_temp.chk('validate: active key -> active/allowed', r ->> 'status' = 'active' and (r ->> 'allowed')::boolean, r::text);
  perform pg_temp.chk('validate: answer carries only this licence''s own fields',
    (select array_agg(x order by x) from jsonb_object_keys(r) x)
      <@ array['allowed','expires_at','licensed_to','machines_used','max_machines','packages','reason','station','status']);
  perform pg_temp.chk('validate: activation recorded',
    exists (select 1 from public.bc_license_activations a
             where a.license_id = (select id from pg_temp._keys where name = 'basic')
               and a.fingerprint = 'fp-machine-aaaa' and a.package = 'airsuite-console'
               and a.version = '1.2.3' and a.hostname = 'TEST-PC'));
  r := pg_temp.v(lower(replace(k, '-', ' ')), 'fp-machine-aaaa');
  perform pg_temp.chk('validate: forgives case and separators', r ->> 'status' = 'active', r::text);
  r := pg_temp.v(substr(k, 6), 'fp-machine-aaaa');
  perform pg_temp.chk('validate: forgives a missing BCK1 tag', r ->> 'status' = 'active', r::text);
  perform pg_temp.chk('validate: repeat check bumps the same activation',
    (select check_count from public.bc_license_activations a
      where a.license_id = (select id from pg_temp._keys where name = 'basic') and a.fingerprint = 'fp-machine-aaaa') = 3);

  -- Machine limit.
  select key into k from pg_temp._keys where name = 'oneseat';
  r := pg_temp.v(k, 'fp-machine-one1');
  perform pg_temp.chk('limit: first machine allowed', (r ->> 'allowed')::boolean, r::text);
  r := pg_temp.v(k, 'fp-machine-two2');
  perform pg_temp.chk('limit: second machine refused, key still active',
    r ->> 'status' = 'active' and not (r ->> 'allowed')::boolean and r ->> 'reason' = 'machine_limit', r::text);
  perform pg_temp.chk('limit: refused machine not recorded',
    not exists (select 1 from public.bc_license_activations where fingerprint = 'fp-machine-two2'));
  r := pg_temp.v(k, 'fp-machine-one1', 'studio-agent');
  perform pg_temp.chk('limit: activated machine may add another package', (r ->> 'allowed')::boolean, r::text);

  -- Package scope.
  select key into k from pg_temp._keys where name = 'console';
  r := pg_temp.v(k, 'fp-machine-cccc', 'studio-agent');
  perform pg_temp.chk('scope: uncovered package refused',
    r ->> 'status' = 'active' and r ->> 'reason' = 'package_not_covered', r::text);
  r := pg_temp.v(k, 'fp-machine-cccc', 'airsuite-console');
  perform pg_temp.chk('scope: covered package allowed', (r ->> 'allowed')::boolean, r::text);

  -- Unknown and malformed.
  r := pg_temp.v('BCK1-0000-0000-0000-0000-0000-0000-0000-0000', 'fp-machine-uuuu');
  perform pg_temp.chk('validate: unknown key -> unknown', r ->> 'status' = 'unknown' and not (r ->> 'allowed')::boolean, r::text);
  r := pg_temp.v('not a key', 'fp-machine-uuuu');
  perform pg_temp.chk('validate: malformed key -> unknown', r ->> 'status' = 'unknown', r::text);
  r := pg_temp.v(k, 'x');
  perform pg_temp.chk('validate: bad fingerprint -> invalid_request', r ->> 'status' = 'invalid_request', r::text);
end $$;

-- Expire one key the only way possible: time passes (simulated by the owner).
update public.bc_license_keys set expires_at = now() - interval '1 minute'
 where id = (select id from pg_temp._keys where name = 'expiring');

do $$
declare r jsonb;
begin
  r := pg_temp.v((select key from pg_temp._keys where name = 'expiring'), 'fp-machine-eeee');
  perform pg_temp.chk('validate: expired key -> expired', r ->> 'status' = 'expired' and not (r ->> 'allowed')::boolean, r::text);
  perform pg_temp.chk('validate: expired key records no new activation',
    not exists (select 1 from public.bc_license_activations where fingerprint = 'fp-machine-eeee'));
end $$;

-- ================================= super admin: edit / revoke / rotate --
select pg_temp.become('sa');
do $$
declare r jsonb; v jsonb; old_key text; new_key text;
begin
  -- Update: set to null = "no limit / every package / never".
  r := public.bc_admin_license_update((select id from pg_temp._keys where name = 'console'),
         '{"packages": null, "max_activations": 5, "expires_at": null, "label": "edited"}');
  perform pg_temp.chk('update: patch applied',
    r -> 'packages' = 'null'::jsonb and (r ->> 'max_activations')::int = 5 and r ->> 'label' = 'edited'
    and r -> 'expires_at' = 'null'::jsonb and not (r ? 'key_hash'), r::text);

  -- Revoke.
  r := public.bc_admin_license_revoke((select id from pg_temp._keys where name = 'revoke'), 'test revoke');
  perform pg_temp.chk('revoke: status revoked', r ->> 'status' = 'revoked', r ->> 'status');
  v := pg_temp.v((select key from pg_temp._keys where name = 'revoke'), 'fp-machine-rrrr');
  perform pg_temp.chk('validate: revoked key -> revoked', v ->> 'status' = 'revoked' and not (v ->> 'allowed')::boolean, v::text);
  perform pg_temp.become('sa');

  -- Rotate.
  select key into old_key from pg_temp._keys where name = 'rotate';
  r := public.bc_admin_license_rotate((select id from pg_temp._keys where name = 'rotate'), 'test rotate');
  new_key := r ->> 'key';
  insert into pg_temp._keys values ('rotated', r ->> 'id', new_key);
  perform pg_temp.chk('rotate: a different key returned once', new_key is not null and new_key <> old_key);
  perform pg_temp.chk('rotate: new key replaces the old',
    (select replaces_id from public.bc_admin_licenses() where id = r ->> 'id') = (select id from pg_temp._keys where name = 'rotate')
    and (select status from public.bc_admin_licenses() where id = (select id from pg_temp._keys where name = 'rotate')) = 'revoked'
    and (select replaced_by_id from public.bc_admin_licenses() where id = (select id from pg_temp._keys where name = 'rotate')) = r ->> 'id');
  v := pg_temp.v(new_key, 'fp-machine-nnnn');
  perform pg_temp.chk('rotate: new key validates active', v ->> 'status' = 'active', v::text);
  v := pg_temp.v(old_key, 'fp-machine-nnnn');
  perform pg_temp.chk('rotate: old key validates revoked', v ->> 'status' = 'revoked', v::text);
end $$;

select pg_temp.become('sa');
select pg_temp.expect_error('revoke: twice refused',
  $q$select public.bc_admin_license_revoke((select id from pg_temp._keys where name = 'revoke'), 'again')$q$, '22023');
select pg_temp.expect_error('rotate: twice refused',
  $q$select public.bc_admin_license_rotate((select id from pg_temp._keys where name = 'rotate'))$q$, '22023');
select pg_temp.expect_error('revoke: reason required',
  $q$select public.bc_admin_license_revoke((select id from pg_temp._keys where name = 'basic'), '  ')$q$, '22023');

-- Release a seat, then the refused machine fits.
do $$
declare v jsonb;
begin
  perform public.bc_admin_license_release_activation(
    (select a.id from public.bc_admin_license_activations((select id from pg_temp._keys where name = 'oneseat')) a
      where a.fingerprint = 'fp-machine-one1' limit 1));
  perform pg_temp.chk('release: machine seat freed (all its packages)',
    (select count(*) from public.bc_admin_license_activations((select id from pg_temp._keys where name = 'oneseat'))
      where released_at is null) = 0);
  v := pg_temp.v((select key from pg_temp._keys where name = 'oneseat'), 'fp-machine-two2');
  perform pg_temp.chk('release: the other machine now fits', (v ->> 'allowed')::boolean, v::text);
end $$;

-- ========================================================= throttle --
do $$
declare v jsonb; i int;
begin
  -- Ten wrong keys from one machine at one address.
  for i in 1..10 loop
    v := pg_temp.v('BCK1-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-' || lpad(i::text, 4, '0'),
                   'fp-guesser-9999', 'airsuite-console', '198.51.100.1');
  end loop;
  perform pg_temp.chk('throttle: the 10th failure is still answered unknown', v ->> 'status' = 'unknown', v::text);
  v := pg_temp.v((select key from pg_temp._keys where name = 'basic'), 'fp-guesser-9999',
                 'airsuite-console', '198.51.100.2');
  perform pg_temp.chk('throttle: the fingerprint is locked, even with a real key from a new address',
    v ->> 'status' = 'rate_limited' and (v ->> 'retry_after_seconds')::int > 0, v::text);
  v := pg_temp.v((select key from pg_temp._keys where name = 'basic'), 'fp-other-machine',
                 'airsuite-console', '198.51.100.1');
  perform pg_temp.chk('throttle: the address is locked, even for another machine', v ->> 'status' = 'rate_limited', v::text);
  v := pg_temp.v((select key from pg_temp._keys where name = 'basic'), 'fp-other-machine',
                 'airsuite-console', '198.51.100.3');
  perform pg_temp.chk('throttle: a clean machine at a clean address is unaffected', v ->> 'status' = 'active', v::text);
  perform pg_temp.chk('throttle: stores hashes, never the raw IP or fingerprint',
    not exists (select 1 from public.bc_license_throttle
                 where bucket like '%198.51.100%' or bucket like '%fp-guesser%')
    and exists (select 1 from public.bc_license_throttle where bucket ~ '^(ip|fp):[0-9a-f]{64}$'));
end $$;

-- ================================================ super admin: tenants --
select pg_temp.become('sa');
do $$
declare d jsonb; s public.stations; o public.organizations;
begin
  perform pg_temp.chk('orgs: listed with counts',
    exists (select 1 from public.bc_admin_orgs() where id = 'org_bctest_backoffice'
             and station_count = 1 and active_licenses >= 3));
  d := public.bc_admin_org_detail('org_bctest_backoffice');
  perform pg_temp.chk('org detail: stations, members, licences',
    jsonb_array_length(d -> 'stations') = 1 and jsonb_array_length(d -> 'licenses') = 7
    and d -> 'members' = '[]'::jsonb);

  s := public.bc_admin_set_station_status('station_bctest_backoffice', 'suspended');
  perform pg_temp.chk('status: a station that is not on air can be suspended', s.status = 'suspended');
  o := public.bc_admin_set_org_status('org_bctest_backoffice', 'suspended');
  perform pg_temp.chk('status: its org can be suspended', o.status = 'suspended');
  perform pg_temp.chk('status: both changes audited',
    (select count(*) from public.bc_admin_audit where target_id in ('station_bctest_backoffice', 'org_bctest_backoffice')
       and action in ('station.status', 'org.status')) = 2);

  o := public.bc_update_org('org_bctest_backoffice', 'Backoffice Test Org Renamed');
  perform pg_temp.chk('rename: existing bc_update_org still works for admins and is audited',
    o.name = 'Backoffice Test Org Renamed'
    and exists (select 1 from public.bc_admin_audit where action = 'org.rename' and target_id = 'org_bctest_backoffice'));
  s := public.bc_update_station('station_bctest_backoffice', 'Renamed FM', null, null);
  perform pg_temp.chk('rename: existing bc_update_station still works and is audited',
    s.name = 'Renamed FM'
    and exists (select 1 from public.bc_admin_audit where action = 'station.update' and target_id = 'station_bctest_backoffice'));

  perform pg_temp.chk('device keys: listing shows presence, never the key',
    exists (select 1 from public.bc_admin_station_keys() k, pg_temp._fx f where k.station_id = f.live_station and k.has_key)
    and not exists (select 1 from pg_proc p, unnest(p.proargnames) n
                     where p.proname = 'bc_admin_station_keys' and n = 'key'));
end $$;

select pg_temp.expect_error('status: live station cannot be taken off active',
  $q$select public.bc_admin_set_station_status((select live_station from pg_temp._fx), 'suspended')$q$);
select pg_temp.expect_error('status: org owning a live station cannot be suspended',
  $q$select public.bc_admin_set_org_status((select org_id from public.stations where id = (select live_station from pg_temp._fx)), 'suspended')$q$);
select pg_temp.expect_error('status: unknown status value refused',
  $q$select public.bc_admin_set_station_status('station_bctest_backoffice', 'deleted')$q$, '22023');

-- Content tables: the admin writes directly (existing RLS policy), the 115
-- trigger records it.
do $$
declare n int;
begin
  update public.bc_releases set title = coalesce(title, '') || ' (audit test)'
   where id = (select id from public.bc_releases order by created_at limit 1);
  get diagnostics n = row_count;
  perform pg_temp.chk('content: admin updates a release through RLS', n = 1);
  perform pg_temp.chk('content: the release update is audited with before/after',
    exists (select 1 from public.bc_admin_audit where action = 'row.update' and target_type = 'bc_releases'
             and before is not null and after is not null
             and actor_id = (select sa from pg_temp._fx)));
end $$;

-- =================================================== users & roles --
select pg_temp.become('sa');
do $$
declare r jsonb;
begin
  perform pg_temp.chk('users: listed with sign-in data, super admin first',
    (select is_super_admin from public.bc_admin_users(null, false, 1, 0)) is true
    and (select count(*) from public.bc_admin_users(null, false, 200, 0)) > 1
    and (select total_count from public.bc_admin_users(null, true, 50, 0) limit 1) = 1);

  r := public.bc_admin_grant_super_admin((select plain from pg_temp._fx));
  perform pg_temp.chk('roles: grant super_admin', (r ->> 'super_admin')::boolean
    and (select count(*) from public.bc_admin_users(null, true, 50, 0)) = 2);
  r := public.bc_admin_revoke_super_admin((select plain from pg_temp._fx));
  perform pg_temp.chk('roles: revoke super_admin while another remains', not (r ->> 'super_admin')::boolean);
  perform pg_temp.chk('roles: grant and revoke audited',
    (select count(*) from public.bc_admin_audit where action in ('role.grant', 'role.revoke')
       and target_id = (select plain from pg_temp._fx)::text) = 2);
end $$;

select pg_temp.expect_error('roles: the LAST super admin cannot be revoked (RPC)',
  $q$select public.bc_admin_revoke_super_admin((select sa from pg_temp._fx))$q$);

-- The trigger, bypassing the RPC entirely (as the database owner).
select pg_temp.become('owner');
select pg_temp.expect_error('roles: the LAST super admin cannot be deleted directly (trigger)',
  $q$do $b$ begin
       delete from public.user_roles where profile_id = (select sa from pg_temp._fx)
          and replace(role_id, 'role_', '') = 'super_admin';
       set constraints public.bc_guard_last_super_admin immediate;
     end $b$$q$);
do $$
begin
  -- A swap inside one transaction is allowed: grant B, remove A, check.
  begin
    insert into public.user_roles (profile_id, role_id) values ((select plain from pg_temp._fx), 'super_admin');
    delete from public.user_roles where profile_id = (select sa from pg_temp._fx)
       and replace(role_id, 'role_', '') = 'super_admin';
    set constraints public.bc_guard_last_super_admin immediate;
    raise exception using errcode = 'P0100', message = 'swap ok';
  exception
    when sqlstate 'P0100' then perform pg_temp.chk('roles: swapping admins in one transaction is allowed', true);
    when others then perform pg_temp.chk('roles: swapping admins in one transaction is allowed', false, sqlstate || ': ' || sqlerrm);
  end;
  set constraints public.bc_guard_last_super_admin deferred;
  perform pg_temp.chk('roles: the super admin is still a super admin',
    exists (select 1 from public.user_roles ur, pg_temp._fx f
             where ur.profile_id = f.sa and replace(ur.role_id, 'role_', '') = 'super_admin'));
end $$;

-- ================================================ audit is append-only --
select pg_temp.become('sa');
do $$ begin
  perform pg_temp.chk('audit: the super admin reads the trail (every action above)',
    (select count(distinct action) from public.bc_admin_audit
      where action in ('license.issue', 'license.update', 'license.revoke', 'license.rotate',
                       'license.release_machine', 'org.status', 'station.status', 'org.rename',
                       'station.update', 'row.update', 'role.grant', 'role.revoke')) = 12);
end $$;
select pg_temp.expect_error('audit: super admin cannot UPDATE it', $q$update public.bc_admin_audit set note = 'x'$q$);
select pg_temp.expect_error('audit: super admin cannot DELETE it', $q$delete from public.bc_admin_audit$q$);
select pg_temp.expect_error('audit: super admin cannot INSERT into it', $q$insert into public.bc_admin_audit (actor_role, action, target_type) values ('x','x','x')$q$);
select pg_temp.expect_error('audit: super admin cannot call the writer',
  $q$select public.bc_audit('x', 'x', null, null, null)$q$);
select pg_temp.become('owner');
select pg_temp.expect_error('audit: even the table owner cannot UPDATE (trigger)', $q$update public.bc_admin_audit set note = 'x'$q$);
select pg_temp.expect_error('audit: even the table owner cannot DELETE (trigger)', $q$delete from public.bc_admin_audit$q$);
do $$ begin
  perform pg_temp.chk('audit: no licence key or hash anywhere in the trail',
    not exists (select 1 from public.bc_admin_audit a, pg_temp._keys k
                 where position(replace(substr(k.key, 6), '-', '') in coalesce(a.before::text, '') || coalesce(a.after::text, '')) > 0)
    and not exists (select 1 from public.bc_admin_audit a, public.bc_license_keys l
                     where position(l.key_hash in coalesce(a.before::text, '') || coalesce(a.after::text, '')) > 0));
end $$;

-- ====================================================== ordinary user --
select pg_temp.become('plain');
do $$ begin
  perform pg_temp.chk('plain: is_platform_admin() is false', not public.is_platform_admin());
end $$;
select pg_temp.expect_error('plain: bc_admin_licenses', $q$select * from public.bc_admin_licenses()$q$);
select pg_temp.expect_error('plain: bc_admin_license_activations', $q$select * from public.bc_admin_license_activations('x')$q$);
select pg_temp.expect_error('plain: bc_admin_license_issue', $q$select public.bc_admin_license_issue('org_bctest_backoffice')$q$);
select pg_temp.expect_error('plain: bc_admin_license_update', $q$select public.bc_admin_license_update((select id from pg_temp._keys where name='basic'), '{"label":"x"}')$q$);
select pg_temp.expect_error('plain: bc_admin_license_revoke', $q$select public.bc_admin_license_revoke((select id from pg_temp._keys where name='basic'), 'x')$q$);
select pg_temp.expect_error('plain: bc_admin_license_rotate', $q$select public.bc_admin_license_rotate((select id from pg_temp._keys where name='basic'))$q$);
select pg_temp.expect_error('plain: bc_admin_license_release_activation', $q$select public.bc_admin_license_release_activation('x')$q$);
select pg_temp.expect_error('plain: bc_admin_users', $q$select * from public.bc_admin_users()$q$);
select pg_temp.expect_error('plain: bc_admin_grant_super_admin (self)', $q$select public.bc_admin_grant_super_admin((select plain from pg_temp._fx))$q$);
select pg_temp.expect_error('plain: bc_admin_revoke_super_admin', $q$select public.bc_admin_revoke_super_admin((select sa from pg_temp._fx))$q$);
select pg_temp.expect_error('plain: bc_admin_orgs', $q$select * from public.bc_admin_orgs()$q$);
select pg_temp.expect_error('plain: bc_admin_org_detail', $q$select public.bc_admin_org_detail('org_bctest_backoffice')$q$);
select pg_temp.expect_error('plain: bc_admin_set_org_status', $q$select public.bc_admin_set_org_status('org_bctest_backoffice', 'active')$q$);
select pg_temp.expect_error('plain: bc_admin_set_station_status', $q$select public.bc_admin_set_station_status('station_bctest_backoffice', 'active')$q$);
select pg_temp.expect_error('plain: bc_admin_station_keys', $q$select * from public.bc_admin_station_keys()$q$);
select pg_temp.expect_error('plain: bc_update_org on an org it does not own', $q$select public.bc_update_org('org_bctest_backoffice', 'x')$q$);
select pg_temp.expect_error('plain: bc_update_station on a station it does not run', $q$select public.bc_update_station('station_bctest_backoffice', 'x', null, null)$q$);
select pg_temp.expect_error('plain: internal bc_audit', $q$select public.bc_audit('x','x',null,null,null)$q$);
select pg_temp.expect_error('plain: internal bc_license_generate', $q$select public.bc_license_generate()$q$);
select pg_temp.expect_error('plain: internal bc_require_platform_admin', $q$select public.bc_require_platform_admin()$q$);
select pg_temp.expect_error('plain: select bc_license_keys', $q$select 1 from public.bc_license_keys$q$);
select pg_temp.expect_error('plain: select bc_license_activations', $q$select 1 from public.bc_license_activations$q$);
select pg_temp.expect_error('plain: select bc_license_throttle', $q$select 1 from public.bc_license_throttle$q$);
select pg_temp.expect_error('plain: insert bc_license_keys', $q$insert into public.bc_license_keys (org_id, key_prefix, key_hash) values ('org_bctest_backoffice', 'BCK1-AAAA', repeat('a', 64))$q$);
select pg_temp.expect_error('plain: select airsuite_station_keys', $q$select 1 from public.airsuite_station_keys$q$);
select pg_temp.expect_error('plain: insert bc_admin_audit', $q$insert into public.bc_admin_audit (actor_role, action, target_type) values ('x','x','x')$q$);
select pg_temp.expect_error('plain: update bc_admin_audit', $q$update public.bc_admin_audit set note = 'x'$q$);
select pg_temp.expect_rows('plain: bc_admin_audit reads 0 rows (RLS)', $q$select 1 from public.bc_admin_audit$q$, 0);
select pg_temp.expect_rows('plain: bc_leads reads 0 rows (RLS)', $q$select 1 from public.bc_leads$q$, 0);
select pg_temp.expect_rows('plain: unpublished releases invisible', $q$select 1 from public.bc_releases where not is_published$q$, 0);
do $$
declare n int;
begin
  update public.bc_releases set title = 'hijack' where true;
  get diagnostics n = row_count;
  perform pg_temp.chk('plain: cannot update releases (0 rows)', n = 0, 'rows=' || n);
  update public.bc_docs set title = 'hijack' where true;
  get diagnostics n = row_count;
  perform pg_temp.chk('plain: cannot update docs (0 rows)', n = 0, 'rows=' || n);
  update public.bc_changelog set title = 'hijack' where true;
  get diagnostics n = row_count;
  perform pg_temp.chk('plain: cannot update changelog (0 rows)', n = 0, 'rows=' || n);
  update public.bc_features set name = 'hijack' where true;
  get diagnostics n = row_count;
  perform pg_temp.chk('plain: cannot update features (0 rows)', n = 0, 'rows=' || n);
  update public.bc_leads set status = 'won' where true;
  get diagnostics n = row_count;
  perform pg_temp.chk('plain: cannot update leads (0 rows)', n = 0, 'rows=' || n);
end $$;

-- ================================================================ anon --
select pg_temp.become('anon');
select pg_temp.expect_error('anon: bc_admin_licenses', $q$select * from public.bc_admin_licenses()$q$);
select pg_temp.expect_error('anon: bc_admin_license_issue', $q$select public.bc_admin_license_issue('org_bctest_backoffice')$q$);
select pg_temp.expect_error('anon: bc_admin_license_revoke', $q$select public.bc_admin_license_revoke('x', 'x')$q$);
select pg_temp.expect_error('anon: bc_admin_license_rotate', $q$select public.bc_admin_license_rotate('x')$q$);
select pg_temp.expect_error('anon: bc_admin_license_update', $q$select public.bc_admin_license_update('x', '{}')$q$);
select pg_temp.expect_error('anon: bc_admin_license_activations', $q$select * from public.bc_admin_license_activations('x')$q$);
select pg_temp.expect_error('anon: bc_admin_license_release_activation', $q$select public.bc_admin_license_release_activation('x')$q$);
select pg_temp.expect_error('anon: bc_admin_users', $q$select * from public.bc_admin_users()$q$);
select pg_temp.expect_error('anon: bc_admin_grant_super_admin', $q$select public.bc_admin_grant_super_admin(gen_random_uuid())$q$);
select pg_temp.expect_error('anon: bc_admin_revoke_super_admin', $q$select public.bc_admin_revoke_super_admin(gen_random_uuid())$q$);
select pg_temp.expect_error('anon: bc_admin_orgs', $q$select * from public.bc_admin_orgs()$q$);
select pg_temp.expect_error('anon: bc_admin_org_detail', $q$select public.bc_admin_org_detail('x')$q$);
select pg_temp.expect_error('anon: bc_admin_set_org_status', $q$select public.bc_admin_set_org_status('x', 'active')$q$);
select pg_temp.expect_error('anon: bc_admin_set_station_status', $q$select public.bc_admin_set_station_status('x', 'active')$q$);
select pg_temp.expect_error('anon: bc_admin_station_keys', $q$select * from public.bc_admin_station_keys()$q$);
select pg_temp.expect_error('anon: internal bc_audit', $q$select public.bc_audit('x','x',null,null,null)$q$);
select pg_temp.expect_error('anon: select bc_license_keys', $q$select 1 from public.bc_license_keys$q$);
select pg_temp.expect_error('anon: select bc_license_activations', $q$select 1 from public.bc_license_activations$q$);
select pg_temp.expect_error('anon: select bc_license_throttle', $q$select 1 from public.bc_license_throttle$q$);
select pg_temp.expect_error('anon: select bc_admin_audit', $q$select 1 from public.bc_admin_audit$q$);
select pg_temp.expect_error('anon: insert bc_admin_audit', $q$insert into public.bc_admin_audit (actor_role, action, target_type) values ('x','x','x')$q$);
select pg_temp.expect_error('anon: select airsuite_station_keys', $q$select 1 from public.airsuite_station_keys$q$);
select pg_temp.expect_error('anon: select bc_leads', $q$select 1 from public.bc_leads$q$);
select pg_temp.become('owner');
do $$ begin
  perform pg_temp.chk('anon: may still INSERT the form''s columns into bc_leads',
    has_column_privilege('anon', 'public.bc_leads', 'email', 'INSERT')
    and has_column_privilege('anon', 'public.bc_leads', 'source', 'INSERT')
    and has_column_privilege('authenticated', 'public.bc_leads', 'call_sign', 'INSERT'));
  perform pg_temp.chk('anon: may NOT set status, notes or id on a lead',
    not has_column_privilege('anon', 'public.bc_leads', 'status', 'INSERT')
    and not has_column_privilege('anon', 'public.bc_leads', 'notes', 'INSERT')
    and not has_column_privilege('anon', 'public.bc_leads', 'id', 'INSERT'));
  perform pg_temp.chk('anon: can execute bc_license_validate only',
    has_function_privilege('anon', 'public.bc_license_validate(text,text,text,text,text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.bc_admin_license_issue(text,text,text[],integer,timestamptz,text,text)', 'EXECUTE'));
  perform pg_temp.chk('service role: airsuite_station_keys still readable (live heartbeat)',
    has_table_privilege('service_role', 'public.airsuite_station_keys', 'SELECT'));
  perform pg_temp.chk('every new table has RLS on',
    (select bool_and(c.relrowsecurity) from pg_class c
      where c.oid in ('public.bc_admin_audit'::regclass, 'public.bc_license_keys'::regclass,
                      'public.bc_license_activations'::regclass, 'public.bc_license_throttle'::regclass)));
  perform pg_temp.chk('every new SECURITY DEFINER function pins search_path',
    not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.prosecdef
                   and (p.proname like 'bc\_admin\_%' or p.proname like 'bc\_license\_%'
                        or p.proname in ('bc_audit', 'bc_audit_row_change', 'bc_require_platform_admin',
                                         'bc_guard_last_super_admin', 'bc_guard_user_roles_truncate',
                                         'bc_station_is_live', 'bc_update_org', 'bc_update_station'))
                   and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')));
end $$;

-- ============================================================= result --
select pg_temp.become('owner');
select n, ok, label, detail from pg_temp._r order by ok, n;

rollback;
