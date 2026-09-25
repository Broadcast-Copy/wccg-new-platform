-- 113 — dj_drops can come from EMAIL, not just the portal (web) or FTP.
--
-- Some DJs never touch the portal: they email a weekly pack (DJ Tony Neal sends
-- a TransferNow link of four ~23-minute parts). scripts/gmail-watcher.py now
-- fetches those parts headless and ingests each one through the studio-sync
-- edge function ("ingest" -> signed upload -> "ingested"), which writes the
-- object to the dj-drops bucket at the portal's storage_path and upserts the
-- dj_drops row with source = 'email'. Studio Sync (sync-dj-drops.py) then files
-- it to D:\WCCG\b-mixshows + M:\JBMusic exactly like a portal upload, so there
-- is still one writer for the on-air carts.
--
-- The live constraint (from 013) is CHECK (source IN ('web','ftp')), so the
-- ingested upsert fails without this.

alter table public.dj_drops drop constraint if exists dj_drops_source_check;
alter table public.dj_drops
  add constraint dj_drops_source_check check (source in ('web', 'ftp', 'email'));

comment on column public.dj_drops.source is
  'How the file arrived: web (DJ portal), ftp, or email (gmail-watcher ingest via studio-sync).';
