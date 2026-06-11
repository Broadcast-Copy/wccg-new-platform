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

## Checking on it

- Logs: `D:\WCCG\sync-logs\studio-sync-YYYYMMDD.log` (one file per day).
- Manual pass: run `scripts\studio-sync-task.ps1` in PowerShell, or
  `py -3 scripts\studio-sync-watcher.py --once -v` with
  `WCCG_ADMIN_EMAIL` / `WCCG_ADMIN_PASSWORD` set.
- Exit codes: 0 ok · 1 error (see log) · 2 credential file missing.

## The full broadcast chain

```
DJ uploads in the web portal (My -> Mixshows, or DJ portal drag-drop)
  -> Supabase storage (dj-drops bucket) + dj_drops row (status=uploaded)
    -> THIS WATCHER (<=5 min): air-date folder + M:\JBMusic, marks published
      -> website: mix is now publicly playable (archive + DJ profile)
      -> RadioSpider 1:01 AM: stages the air-date folder to playout
        -> on air
```
