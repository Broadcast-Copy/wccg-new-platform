-- =====================================================================
-- supabase/tests/profiles_air_time.test.sql
-- Re-runnable proof for migration 119 (sermons + DJ mixes public on the
-- church's / DJ's profile from their AIR TIME).
--
-- SAFE AGAINST PRODUCTION: one transaction that ends in ROLLBACK. It inserts
-- sermons rows only for a far-future Sunday / a 2020 Sunday / an unknown code
-- (all rolled back), moves ONE existing published dj_drops row to a 2099 week
-- (rolled back; its status is never touched, so no DJ notification fires),
-- inserts no dj_drops row (that trigger mails the admins), and creates no
-- account.
--
-- Run AFTER 119 is applied (MCP execute_sql or the SQL editor). The last
-- SELECT returns one row per check; every `ok` must be true. To dry-run BEFORE
-- applying, paste the body of 119 (without its own begin;/commit;) right after
-- the `begin;` below.
--
-- Actors (set role + request.jwt.claims): anon, owner, and the DJ who owns the
-- moved drop (a real linked DJ account, looked up, never hard-coded).
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

create function pg_temp.become(p_who text)
returns void language plpgsql as $$
begin
  if p_who = 'anon' then
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  elsif p_who = 'owner' then
    perform set_config('role', 'none', true);
    perform set_config('request.jwt.claims', '', true);
  else  -- a profile id
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_who, 'role', 'authenticated')::text, true);
  end if;
end $$;

-- ------------------------------------------------------------ fixtures --
-- One published drop whose DJ has a linked account: it is moved to a 2099
-- week below, so it is "not aired yet".
create temp table _fx as
select d.id as drop_id, d.week_of as old_week, j.user_id::text as dj_user,
       (select p.id::text from public.profiles p join auth.users u on u.id = p.id
         where not exists (select 1 from public.user_roles ur where ur.profile_id = p.id)
         order by p.created_at limit 1) as plain_user
  from public.dj_drops d
  join public.djs j on j.id = d.dj_id
 where d.status = 'published' and j.user_id is not null
 order by d.published_at desc nulls last
 limit 1;
grant select on _fx to public;

create temp table _ids (label text primary key, id uuid);
grant all on _ids to public;

do $$ begin
  perform pg_temp.chk('fixture: a published drop of a linked DJ exists',
    (select drop_id from pg_temp._fx) is not null);
  perform pg_temp.chk('fixture: a signed-in account with no role exists',
    (select plain_user from pg_temp._fx) is not null);
end $$;

-- ======================================================== schema facts --
do $$ begin
  perform pg_temp.chk('sermon_churches: the five known codes, each on an existing show',
    (select count(*) from public.sermon_churches c join public.shows s on s.id = c.show_id
      where c.code in ('gpn1','thm1','dvp1','pmb1','lcc1')) = 5);
  perform pg_temp.chk('sermons: every archive row got an airs_at',
    not exists (select 1 from public.sermons where airs_at is null
                 and church_code in (select code from public.sermon_churches)));
  perform pg_temp.chk('dj_drops: every row got an airs_at',
    not exists (select 1 from public.dj_drops where airs_at is null));
  perform pg_temp.chk('sermon_airs_at: pmb1 on 2026-09-27 = 13:00 EDT',
    public.sermon_airs_at('pmb1', '2026-09-27', 'station_wccg') = '2026-09-27 17:00:00+00',
    public.sermon_airs_at('pmb1', '2026-09-27', 'station_wccg')::text);
  perform pg_temp.chk('sermon_airs_at: gpn1 on 2026-12-27 = 08:00 EST',
    public.sermon_airs_at('gpn1', '2026-12-27', 'station_wccg') = '2026-12-27 13:00:00+00',
    public.sermon_airs_at('gpn1', '2026-12-27', 'station_wccg')::text);
  perform pg_temp.chk('sermon_airs_at: unknown code -> NULL (never public)',
    public.sermon_airs_at('zzz9', '2026-09-27', 'station_wccg') is null);
  perform pg_temp.chk('dj_drop_airs_at: a Saturday 22:00 slot, week of 2026-09-21 -> Sat 09-26 22:00 EDT',
    (select public.dj_drop_airs_at(s.id, '2026-09-21', s.station_id)
       from public.dj_slots s where s.day_of_week = 6 and s.start_time = '22:00' limit 1)
      = '2026-09-27 02:00:00+00');
  perform pg_temp.chk('dj_drop_airs_at: a Sunday slot is the END of its ISO week (+6 days)',
    (select public.dj_drop_airs_at(s.id, '2026-09-21', s.station_id)::date
       from public.dj_slots s where s.day_of_week = 0 limit 1) = '2026-09-27');
  perform pg_temp.chk('the four DJ-portal/staff drop policies are still there',
    (select count(*) from pg_policies where schemaname = 'public' and tablename = 'dj_drops'
       and policyname in ('DJs read own drops','Production reads all drops',
                          'Admins read all drops','DJs update own drops')) = 4);
  perform pg_temp.chk('sermons: no client write policy exists',
    not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sermons'
                 and cmd in ('INSERT','UPDATE','DELETE','ALL') and policyname <> 'tenant_isolation'));
  perform pg_temp.chk('new tables have RLS on',
    (select relrowsecurity from pg_class where oid = 'public.sermon_churches'::regclass));
  perform pg_temp.chk('anon/authenticated cannot call the airs_at helpers',
    not has_function_privilege('anon', 'public.sermon_airs_at(text,date,text)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.dj_drop_airs_at(text,date,text)', 'EXECUTE')
    and has_function_privilege('service_role', 'public.sermon_airs_at(text,date,text)', 'EXECUTE'));
  perform pg_temp.chk('every new SECURITY DEFINER function pins search_path',
    not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.prosecdef
                   and p.proname in ('sermon_airs_at','dj_drop_airs_at','sermons_set_airs_at','dj_drops_set_airs_at')
                   and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')));
  perform pg_temp.chk('sermons bucket: audio only, 600 MB cap',
    (select file_size_limit = 629145600 and 'audio/mpeg' = any(allowed_mime_types)
       from storage.buckets where id = 'sermons'));
end $$;

-- ====================================================== sermon fixtures --
-- (owner = service-role-equivalent writer; the edge function writes this way)
with ins as (
  insert into public.sermons (church_code, air_date, storage_path, format, size_bytes, airs_at)
  values ('pmb1', '2099-12-27', 'pmb1/2099-12-27-test.mp3', 'mp3', 1234, '2000-01-01'),  -- airs_at given: must be ignored
         ('pmb1', '2020-01-05', 'pmb1/2020-01-05-test.mp3', 'mp3', 1234, null),
         ('zzz9', '2026-09-27', 'zzz9/2026-09-27-test.mp3', 'mp3', 1234, null)
  returning id, church_code, air_date
)
insert into pg_temp._ids
select case when church_code = 'zzz9' then 'unknown'
            when air_date = '2099-12-27' then 'future' else 'past' end, id
  from ins;

do $$ begin
  perform pg_temp.chk('insert: a caller-supplied airs_at is ignored (trigger computes it)',
    (select airs_at from public.sermons where id = (select id from pg_temp._ids where label = 'future'))
      = '2099-12-27 18:00:00+00');
end $$;

-- An aired archive row: airs_at can't be pushed or pulled by an UPDATE.
update public.sermons set airs_at = '2099-01-01', size_bytes = size_bytes
 where id = (select id from pg_temp._ids where label = 'past');
do $$ begin
  perform pg_temp.chk('update: an aired sermon''s airs_at is frozen',
    (select airs_at from public.sermons where id = (select id from pg_temp._ids where label = 'past'))
      = '2020-01-05 18:00:00+00');
end $$;

-- ========================================================= drop fixture --
update public.dj_drops set week_of = '2099-12-28' where id = (select drop_id from pg_temp._fx);
do $$ begin
  perform pg_temp.chk('drop moved to week 2099-12-28 -> airs_at recomputed into 2099',
    (select extract(year from airs_at) = 2099 from public.dj_drops where id = (select drop_id from pg_temp._fx)));
end $$;

-- ================================================================ anon --
select pg_temp.become('anon');
do $$ begin
  perform pg_temp.chk('anon: sees an aired sermon',
    exists (select 1 from public.sermons where id = (select id from pg_temp._ids where label = 'past')));
  perform pg_temp.chk('anon: does NOT see a sermon before its air time',
    not exists (select 1 from public.sermons where id = (select id from pg_temp._ids where label = 'future')));
  perform pg_temp.chk('anon: does NOT see a sermon of an unknown church',
    not exists (select 1 from public.sermons where id = (select id from pg_temp._ids where label = 'unknown')));
  perform pg_temp.chk('anon: sees no sermon whose airs_at is in the future',
    not exists (select 1 from public.sermons where airs_at > now()));
  perform pg_temp.chk('anon: the aired archive is still public (>= 500 rows)',
    (select count(*) from public.sermons) >= 500, (select count(*) from public.sermons)::text);
  perform pg_temp.chk('anon: does NOT see the published drop moved to 2099',
    not exists (select 1 from public.dj_drops where id = (select drop_id from pg_temp._fx)));
  perform pg_temp.chk('anon: sees no drop that has not aired yet',
    not exists (select 1 from public.dj_drops where airs_at > now()));
  perform pg_temp.chk('anon: sees no unpublished drop',
    not exists (select 1 from public.dj_drops where status <> 'published'));
  perform pg_temp.chk('anon: aired published drops are still public (>= 300 rows)',
    (select count(*) from public.dj_drops) >= 300, (select count(*) from public.dj_drops)::text);
  perform pg_temp.chk('anon: can read sermon_churches (the public schedule)',
    (select count(*) from public.sermon_churches) = 5);
  perform pg_temp.chk('anon: cannot list the sermons bucket',
    not exists (select 1 from storage.objects where bucket_id = 'sermons'));
end $$;
select pg_temp.expect_error('anon: cannot INSERT a sermon',
  $q$insert into public.sermons (church_code, air_date, storage_path) values ('pmb1', '2099-12-20', 'x')$q$);
select pg_temp.expect_error('anon: cannot INSERT a sermon church',
  $q$insert into public.sermon_churches (code, show_id, air_time) values ('abc1', 'show_lewis_chapel', '10:00')$q$);
select pg_temp.expect_error('anon: cannot call sermon_airs_at over RPC',
  $q$select public.sermon_airs_at('pmb1', '2026-09-27', 'station_wccg')$q$);
do $$
declare n int;
begin
  update public.sermons set storage_path = 'hijack' where church_code = 'pmb1';
  get diagnostics n = row_count;
  perform pg_temp.chk('anon: UPDATE of sermons touches 0 rows', n = 0, n::text);
  delete from public.sermons where church_code = 'pmb1';
  get diagnostics n = row_count;
  perform pg_temp.chk('anon: DELETE of sermons touches 0 rows', n = 0, n::text);
end $$;

-- ============================================ a plain signed-in account ==
select pg_temp.become((select plain_user from pg_temp._fx));
do $$ begin
  perform pg_temp.chk('signed-in listener: cannot list the sermons bucket (no early peek)',
    not exists (select 1 from storage.objects where bucket_id = 'sermons'));
  perform pg_temp.chk('signed-in listener: does NOT see a sermon before its air time',
    not exists (select 1 from public.sermons where id = (select id from pg_temp._ids where label = 'future')));
  perform pg_temp.chk('signed-in listener: does NOT see the drop moved to 2099',
    not exists (select 1 from public.dj_drops where id = (select drop_id from pg_temp._fx)));
end $$;

-- ================================================ the drop's own DJ ==
-- The DJ portal must still show the DJ their own not-yet-aired drop.
select pg_temp.become((select dj_user from pg_temp._fx));
do $$ begin
  perform pg_temp.chk('DJ: still sees their own not-yet-aired drop (portal unchanged)',
    exists (select 1 from public.dj_drops where id = (select drop_id from pg_temp._fx)));
end $$;

-- ============================================================= result --
select pg_temp.become('owner');
select n, ok, label, detail from pg_temp._r order by ok, n;

rollback;
