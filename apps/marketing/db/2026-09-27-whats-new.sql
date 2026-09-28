-- =====================================================================
-- broadcastcopy.ai — 2026-09-27 "what's new" content rows
--
-- NOT applied by any build or deploy. The /changelog page and the feature
-- grid read these two tables client-side (anon SELECT, migrations 096/097),
-- so the site shows this content only once someone with platform-admin or
-- service-role rights runs this file after review. Run it with (or just
-- before) the push that deploys the matching site change; the home page's
-- "What's new" strip links to /changelog and expects row 0.18.0-beta there.
--
-- Idempotent: the changelog row upserts on its unique version; feature rows
-- are updated by name and inserted only where the name is missing.
--
-- Version label: 0.18.0-beta continues the platform series (latest live row
-- is 0.17.0-beta). The Manager's own number, 0.5.0, is named in the title —
-- a bare "0.5.0" would sit at the top as Latest beside the March row
-- 0.5.0-beta and read as a duplicate or a downgrade.
--
-- Feature text is copied verbatim from apps/marketing/src/content.ts, the
-- static fallback the grid renders before the table answers; keep the two
-- identical. Dollar quoting, so apostrophes need no escaping.
-- =====================================================================
begin;

-- ---------------------------------------------------------- changelog
insert into public.bc_changelog (version, released_on, channel, title, changes, sort_order, is_published)
values (
  '0.18.0-beta',
  date '2026-09-27',
  'beta',
  $$Broadcast Copy Manager 0.5.0: the daily log, traffic, promotions and imaging$$,
  jsonb_build_array(
    $$Broadcast Copy Manager 0.5.0 is the one download: a self-contained Windows package installed per user, with a plant board of every machine and its services, the worst status rolled up to the tray, and status lines for tomorrow's log and traffic readiness.$$,
    $$Studio Control moves into the Manager as a native window: every card and alert, and machine commands that take two presses — arm, then send. A Build Status window checks every service and app against the current build.$$,
    $$The daily log: tomorrow is built each evening from your clocks, music rules and the traffic file, and published only if it passes the validation gate — structure, hours, hard times, restrictions, silent positions, booked traffic and network timing. Every publish is a numbered, checksummed revision.$$,
    $$Log editor in the Production app: insert, move, replace, copy or reshuffle an hour, import traffic with a dry run, undo and redo — tomorrow onward, with every saved edit re-validated by the gate.$$,
    $$Signed-in profiles for log editing and an append-only change record are built in; enforcement starts when a station creates its first profile.$$,
    $$As-run, spot affidavits, music-use reports, the traffic reconcile file and the missed-spot report now follow the schedule that actually aired.$$,
    $$Traffic desk: orders and rate cards, copy, as-run import, make-goods, invoicing, payments and A/R, political requests and a report catalogue. It runs beside your current traffic system until you switch it on to feed the log.$$,
    $$Promotions: import a year's calendar, check it against that year's dates, and export it to Word in the calendar's own layout, to CSV, or to a dates file.$$,
    $$Imaging by type and occasion, with a holiday calendar, an order-by date for every occasion, and holiday imaging that airs only inside its dates.$$,
    $$An optional AI script writer drafts imaging scripts and flags a date it may have invented or a station ID missing its legal-ID wording. Drafts are advisory: nothing is saved or sent until a person does it.$$,
    $$Air-check recorder: scheduled skim or continuous jobs, per-job retention, a weekly schedule grid with clash detection, and browse-and-play by day. Plus a station command table editor, and library deletes that go to a recycle bin.$$,
    $$Studio Sync lands DJ mixes in their carts checksum-verified, backs up the cart it replaces, and never swaps a cart while it is on air.$$,
    $$In progress, not in this release: a Music section for the Music Director, and a guided walkthrough on every page.$$
  ),
  180,
  true
)
on conflict (version) do update set
  released_on  = excluded.released_on,
  channel      = excluded.channel,
  title        = excluded.title,
  changes      = excluded.changes,
  sort_order   = excluded.sort_order,
  is_published = excluded.is_published;

-- ------------------------------------------------------------ features
-- Changed wording on two existing cards.
update public.bc_features set blurb = $$Drop intake over FTP, mix libraries, record pool, DJ slots and per-DJ portals — and Studio Sync, which lands each new mix in its cart checksum-verified and never swaps one that is on air.$$
 where name = 'DJ operations';

update public.bc_features set blurb = $$Orders, copy, avails, as-run import, make-goods, invoicing and A/R, political requests and reports — a traffic desk that runs beside your current traffic system until you switch it on to feed the log.$$
 where name = 'Ad sales & traffic';

-- New cards, slotted between the existing sort orders (10..100).
-- "On-air playout" has led content.ts since 9e38e7f but was never added to
-- the table, so the live grid has not shown it; it is included here to match.
insert into public.bc_features (name, icon, sort_order, blurb)
select v.name, v.icon, v.sort_order, v.blurb
  from (values
    ('On-air playout', 'AudioLines', 5,
     $$AirSuite On-Air: three decks, the program log, hotkeys and live copy in one window. Sample-accurate segues, an audition bus that can never reach the transmitter, and a muted shadow mode that runs beside your current automation until you trust it.$$),
    ('The daily log', 'ListChecks', 25,
     $$Tomorrow's log is built every evening from your clocks, music rules and the traffic file, then has to pass a validation gate — hours, hard times, restrictions, silent positions, booked spots — before it publishes. The PD edits it in a log editor that re-checks every change.$$),
    ('Studio Control', 'MonitorCog', 55,
     $$Every machine and service in the plant on one native board, with machine commands that take two presses. Plus a scheduled air-check recorder, the station command table, and library deletes that go to a recycle bin.$$),
    ('Promotions & imaging', 'Megaphone', 75,
     $$Promotions calendars checked against the year's dates and exported to Word in their own layout. Imaging by category with a holiday calendar and an order-by date for each occasion — and an optional AI writer for draft scripts.$$)
  ) as v(name, icon, sort_order, blurb)
 where not exists (select 1 from public.bc_features f where f.name = v.name);

commit;
