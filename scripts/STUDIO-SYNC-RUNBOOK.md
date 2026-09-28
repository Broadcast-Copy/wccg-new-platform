# WCCG Studio-Sync — Runbook (updated 2026-06-11)

The watcher closes the loop: **DJ uploads on the website → file lands on the
studio PC where the broadcast chain reads it.**

## What it does

Every 5 minutes (Windows scheduled task **"WCCG Studio Sync"**) it:

1. Signs in to Supabase as the station admin (credential is DPAPI-encrypted
   on this PC; never stored in the repo).
2. Finds `dj_drops` rows with `status in (uploaded, validated)`.
3. Downloads each file to BOTH places the chain reads:
   - `D:\WCCG\b-mixshows\<local-dj-folder>\a-on-air\<MMDDYYYY>-onair\DJB_xxxxx.mp3`
     — the **exact-air-date folder** RadioSpider's nightly 1:01 AM mixshow
     events stage to playout (MMDDYYYY = the day the mix airs, from the
     drop's slot day).
   - `M:\JBMusic\DJB_xxxxx.mp3` — the flat playout library (same-day safety
     net, no waiting for the nightly run).
4. Marks the drop `published` — which is also what makes it publicly
   playable on the website (public RLS reads published only).

Idempotent: re-runs skip files already on disk at the right size and
backfill whichever copy is missing without re-downloading.

> **Since 2026-09-27 the scheduled task runs `sync-dj-drops.py`** (no admin
> password: public bucket + the secret-gated `studio-sync` edge function), not
> the watcher described above. Its log is `D:\WCCG\sync-logs\dj-drops-sync.log`.

## How writes reach air (2026-09-27)

`M:\JBMusic\DJB_<code>.<ext>` is live the moment it changes (ON-AIR plays it
straight off `\\onair\AUDIO`). The sync used to truncate and rewrite it in
place, with no backup, even mid-air. Now, per drop:

1. **Work files never look like carts.** Download / unzip / transcode happen
   beside the cart as `.~sync-DJB_<code>.<ext>.<tag>` — never `DJB_…`, never an
   audio extension, so AirSuite's library scan can't pick one up.
2. **sha256, not size.** Cart already holds these exact bytes → `SAME sha256`,
   not rewritten, just published. The "already on disk" fast path also needs the
   archive copy and the cart to be byte-identical (and trusts an email ingest's
   platform checksum when the row carries one).
3. **On-air guard.** The cart is **not replaced and the drop not published**
   while it may be airing: the ON-AIR journal mirror
   (`C:\AirSuite\onair-journal\journal\<date>.jsonl`) shows it as the last thing
   started, within its duration + 2 min — or the mirror is not live (last event
   more than 2 min old; it is only fetched every ~15 min) and the slot's weekly
   air window (±15 min) holds now. Log: `DEFER <slug>/<code>: on air now (why)`.
   The dated archive copy is still filed; the next 5-minute run retries. A
   replace the OS refuses because the file is held open is also a `DEFER`.
4. **Atomic, backed-up replace.** Temp file in the cart's folder → fsync → read
   back and sha-verified → the old cart copied (and verified) to
   `D:\WCCG\sync-logs\cart-backups\<YYYYMMDD>\DJB_<code>.<ext>.<HHMMSS>` →
   `os.replace` onto the cart. No verified backup, no replace. Newest **10**
   backups kept per cart (the prune only ever deletes inside `cart-backups`).
   The cart keeps the name case already on the share. Any failure leaves the
   old cart exactly as it was (`FAIL … cart left untouched`).
5. **Two files, one cart** (`DJB_x.mp3` beside `DJB_x.wav`): never deleted or
   renamed — `WARN two files for cart …` once per run, counted in SUMMARY.
6. **One run at a time** (`D:\WCCG\sync-logs\dj-drops-sync.lock`): the task
   launches through `run-hidden.vbs`, which returns at once, so Task Scheduler's
   IgnoreNew can't stop a long download overlapping the next runs. A second run
   logs `BUSY` and exits.

SUMMARY line: `SUMMARY dj-drops: new=N | <items> | deferred=N | two-file carts=N`.

**Put a previous cart back** (owner's call; it is an on-air write): disable the
"WCCG Studio Sync" task, check the cart is not airing, copy the backup over
`M:\JBMusic\DJB_<code>.<ext>` (keep a copy of what you replace), re-enable.
Tests: `python scripts\test_sync_dj_drops.py`.

## One-time setup (after a reinstall / new PC / password change)

Run in PowerShell **as the logged-in studio user** (you'll be prompted for
the admin password; it is encrypted to this Windows account):

```powershell
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\WCCG" | Out-Null
Get-Credential -UserName biggleem@gmail.com -Message "WCCG studio-sync" |
  Export-CliXml "$env:LOCALAPPDATA\WCCG\studio-sync-cred.xml"
```

Recreate the task if missing:

```powershell
schtasks /Create /F /TN "WCCG Studio Sync" /SC MINUTE /MO 5 /TR `
  "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"C:\Users\wccg1\dev\wccg-new-platform\scripts\studio-sync-task.ps1\""
```

## The shared secret and how to rotate it (2026-09-28)

studio-sync and dj-setup-link share one secret (the `STUDIO_SYNC_*` family);
wiki-generate and notify-sync have their own. **No secret is in this repository**
(`python scripts\test_no_secret_literals.py` fails if one appears; the old values
were public here, which is why they are rotated).

- **Functions** read it from their environment only (`supabase/functions/_shared/shared-secret.ts`):
  `STUDIO_SYNC_SECRET`, plus `STUDIO_SYNC_LEGACY_SECRET`, accepted only while
  `STUDIO_SYNC_ACCEPT_LEGACY=1` (the cutover switch). Same for `WIKI_GENERATE_*`
  and `NOTIFY_SYNC_*`. Every function answers `{"action":"ping"}` with
  `via: current|legacy` and does nothing else.
- **This PC's callers** (Studio Sync `sync-dj-drops.py` + `dj_sync_mail.py`, the
  gmail watcher, `send-dj-reminder.py`, `send-dj-setup.py`, `send-dj-temppass.py`,
  `fix-dj-login.py`) all read it through `scripts\studio_sync_secret.py`:
  `C:\AirSuite\secrets\studio-sync.dpapi` (DPAPI, user wccg1) -> env
  `WCCG_STUDIO_SYNC_SECRET` -> `studio-sync.secret` in the watcher config dir ->
  (until the first rotation only) the retired value read from git history.
- **Rotate** (the owner, as wccg1, not Sunday 06:00-15:00):
  `powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\wccg1\dev\wccg-new-platform\scripts\rotate-shared-secrets.ps1`
  It generates new secrets, sets them (old one still accepted), deploys the four
  functions, stores the DPAPI file, pings every caller, blanks the retired :8108
  Production Suite copy, then turns the old secret off and proves it gets 403.
  `-DryRun` shows every step and changes nothing. Log: `D:\WCCG\sync-logs\secret-rotation.log`.
- **Rollback** (a forgotten caller still needs the old secret):
  `rotate-shared-secrets.ps1 -Rollback` re-enables the legacy switch with the
  previous value; running the script again without a switch rotates cleanly.
- **Check any time:** `python scripts\studio_sync_secret.py --ping` (source + both
  functions), `python scripts\sync-dj-drops.py --ping`. Neither prints a secret.

## Checking on it

- Logs: `D:\WCCG\sync-logs\studio-sync-YYYYMMDD.log` (one file per day).
- Manual pass: run `scripts\studio-sync-task.ps1` in PowerShell, or
  `py -3 scripts\studio-sync-watcher.py --once -v` with
  `WCCG_ADMIN_EMAIL` / `WCCG_ADMIN_PASSWORD` set.
- Exit codes: 0 ok · 1 error (see log) · 2 credential file missing.

## The full broadcast chain

```
DJ uploads in the web portal (My -> Mixshows, or DJ portal drag-drop)
  OR the DJ emails a pack (TransferNow / Drive) -> gmail-watcher.py ingests
     each part via studio-sync "ingest"/"ingested" (source=email)
  -> Supabase storage (dj-drops bucket) + dj_drops row (status=uploaded)
    -> THIS WATCHER (<=5 min): air-date folder + M:\JBMusic, marks published
      -> website: public on the archive + DJ profile from its show's air time (migration 119)
      -> RadioSpider 1:01 AM: stages the air-date folder to playout
        -> on air
```
