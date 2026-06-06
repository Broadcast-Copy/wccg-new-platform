-- =====================================================================
-- 059_backfill_profile_avatars
-- Profiles had no avatars, so the members directory / public profiles showed
-- only gradient initials. The DJ portraits ship as static assets under
-- apps/web/public/images/hosts and are catalogued (name -> imageUrl) in
-- src/data/hosts.ts. There is no DB key linking a DJ to its static portrait, so
-- we match on a NORMALIZED name key (lowercase, alphanumerics only) between the
-- linked DJ's display_name and the static catalogue, plus a few explicit aliases
-- where the asset name and the DB stage name diverge. Only fills empty avatars;
-- never overwrites a custom one. Idempotent.
-- DJs with no shipped portrait (Drop, VI, KVNG, Corleone, Admin) keep initials.
-- =====================================================================

with img(name, url) as (values
  ('Yung Joc','/images/hosts/yung-joc.png'),
  ('Angela Yee','/images/hosts/angela-yee.png'),
  ('Incognito','/images/hosts/incognito.png'),
  ('Shorty Corleone','/images/hosts/shorty-corleone.png'),
  ('DJ Ricovelli','/images/hosts/dj-ricoveli.png'),
  ('DJ Tony Neal','/images/hosts/dj-tony-neal.png'),
  ('DJ Ike GDA','/images/hosts/dj-ike-gda.png'),
  ('DJ Izzynice','/images/hosts/dj-izzynice.png'),
  ('DJ SpinWiz','/images/hosts/dj-spinwiz.png'),
  ('DJ Rayn','/images/hosts/dj-rayn.png'),
  ('DJ TommyGee Mixx','/images/hosts/dj-tommygeemixx.png'),
  ('DJ Yodo','/images/hosts/dj-yodo.png'),
  ('DJ Chuck T','/images/hosts/dj-chuck-t.png'),
  ('DJ DaddyBlack','/images/hosts/dj-daddyblack.png'),
  ('DJ Daffie','/images/hosts/dj-daffie.png'),
  ('DJ Dane Dinero','/images/hosts/dj-dane-dinero.png'),
  ('DJ Itanist','/images/hosts/dj-itanist.png'),
  ('DJ Jay B','/images/hosts/dj-jay-b.png'),
  ('DJ Juice','/images/hosts/dj-juice.png'),
  ('DJ Killako','/images/hosts/dj-killako.png'),
  ('DJ KingViv','/images/hosts/dj-kingviv.png'),
  ('DJ LJ','/images/hosts/dj-lj.png'),
  ('DJ Lou Diamonds','/images/hosts/dj-loudiamonds.png'),
  ('DJ Official','/images/hosts/dj-official.png'),
  ('DJ Swazzey','/images/hosts/dj-swazzey.png'),
  ('DJ T-Money','/images/hosts/dj-t-money.png'),
  ('DJ Tonelo','/images/hosts/dj-tonelo.png'),
  ('DJ Weezy','/images/hosts/dj-weezy.png'),
  ('DJ Whosane','/images/hosts/dj-whosane.png'),
  ('DJ Wolf','/images/hosts/dj-wolf.png'),
  ('DJ YaFeelMe','/images/hosts/dj-yafeelme.png'),
  -- explicit aliases (static asset name <> DB stage name)
  ('DJ Chuck','/images/hosts/dj-chuck.jpg'),
  ('DJ LJay','/images/hosts/dj-lj.png'),
  ('DJ Ricoveli','/images/hosts/dj-ricoveli.png'),
  ('DJ Swayzee','/images/hosts/dj-swazzey.png'),
  ('DJ TommyGee Mix','/images/hosts/dj-tommygeemixx.png')
), norm as (
  select distinct on (lower(regexp_replace(name,'[^a-zA-Z0-9]','','g')))
    lower(regexp_replace(name,'[^a-zA-Z0-9]','','g')) as nkey, url
  from img
)
update public.profiles p
set avatar_url = n.url, updated_at = now()
from public.djs d
join norm n on n.nkey = lower(regexp_replace(d.display_name,'[^a-zA-Z0-9]','','g'))
where d.user_id = p.id
  and (p.avatar_url is null or p.avatar_url = '');
