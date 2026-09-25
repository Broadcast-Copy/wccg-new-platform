# Gmail Watcher — instant sermon/mix sync (OAuth) — RUNBOOK

`scripts/gmail-watcher.py` is an always-on local daemon that syncs church
sermons **the moment the email arrives** (within ~20 s), fully headless — no
browser, no Claude app, no password. It exists because **pmb1 (Progressive)
airs at 1:00 PM**, so the old hourly poll could miss air.

It talks to Gmail + Drive over the Google API using **OAuth** (you authorize
once; a refresh token is stored locally). Per sermon it downloads headlessly:

| code | church | how it arrives | how it's fetched |
|------|--------|----------------|------------------|
| pmb1 | Progressive | public Drive link | Drive API `get_media` |
| lcc1 | Lewis Chapel | Gmail **attachment** | Gmail API `attachments.get` |
| thm1 | Encouraging Moment | restricted Drive **share** | Drive API `get_media` + m4a→mp3 transcode |
| gpn1 | Grace Plus Nothing | Dropbox link | `dl=1` download |
| dvp1 | Family Fellowship | Dropbox link | `dl=1` download |

It files each to `…\j-sun-am - (gospel)\<YYYY>\sunday <MMDDYY>\<code>.<ext>` **and**
copies to `M:\JBMusic\DJB_520xx`, verifies (size + audio header + full ffmpeg
decode), then self-sends a summary to **biggleem@gmail.com**.

**DJ packs by email (since 2026-09-25).** DJs in `DJ_PACKS` (Tony Neal's weekly
TransferNow link, Daddy Black's Drive files, Corleone's Drive folder) are fetched
headless, verified (size, mp3 header, full ffmpeg decode), ordered by the part
number in the file name (Tony: the digit after the comma — never name order;
only his `hh` set airs, the `rnb` set is listed and skipped) and must be exactly
parts 1..N. Each part is then **ingested into the platform** through the
studio-sync edge function (`ingest` → signed upload into the dj-drops bucket →
`ingested`, dj_drops row source `email`, week_of = Monday of the air week), and
**Studio Sync** files it to the dated folder + `M:\JBMusic` like any portal
upload — the watcher never writes D:\WCCG\b-mixshows or M:\ for DJs. Only a pack
for the DJ's *next* show, arriving 5+ min before it starts, is ingested; anything
else (late, early, wrong parts, expired link) gets a "manual look" mail. A
transient failure retries every 15 min (one alert). Plan a pack without touching
anything: `python scripts\gmail-watcher.py --transfernow-dry-run <dl link>`; push
one by hand: `--ingest-transfernow <dl link> --dj dj-tony-neal --air-date MMDDYYYY`.
The studio-sync secret is read by `scripts\studio_sync_secret.py` (env
`WCCG_STUDIO_SYNC_SECRET` → `studio-sync.secret` in the config dir → legacy
constant in sync-dj-drops.py). Tests: `python scripts\test_gmail_watcher_transfernow.py`.

Config + secrets live in **`C:\Users\wccg1\.wccg-gmail-watcher\`**
(`client_secret.json`, `token.json`, `state.json`) — outside the repo, never committed.

---

## ONE-TIME SETUP

### 1. Google Cloud project + APIs  (console.cloud.google.com, signed in as biggleem)
1. Top bar → project dropdown → **New Project** → name `WCCG Gmail Watcher` → Create. Select it.
2. **APIs & Services → Library** → search **Gmail API** → **Enable**.
3. Library again → search **Google Drive API** → **Enable**.

### 2. OAuth consent screen
4. **APIs & Services → OAuth consent screen**.
5. User type **External** → Create.
6. App name `WCCG Gmail Watcher`; user support email = biggleem; developer contact = biggleem. Save & Continue.
7. **Scopes** page: you can skip adding scopes here (the app requests them at sign-in). Save & Continue.
8. **Test users**: add `biggleem@gmail.com`. Save & Continue → Back to Dashboard.
9. **Publish the app:** on the OAuth consent screen, click **PUBLISH APP → Confirm** (status becomes "In production").
   - *Why:* in "Testing" status, Google expires the refresh token after **7 days** — the daemon would stop weekly. Publishing makes the token long-lived.
   - These are sensitive/restricted scopes on an unverified app, so during step 12 you'll see an **"unverified app"** warning — that's expected for a personal app; you click through it once (Advanced → "Go to WCCG Gmail Watcher (unsafe)").

### 3. Desktop OAuth client
10. **APIs & Services → Credentials → + Create credentials → OAuth client ID**.
11. Application type **Desktop app** → name `wccg-watcher-desktop` → Create → **Download JSON**.
12. Save that file as **`C:\Users\wccg1\.wccg-gmail-watcher\client_secret.json`**.

### 4. Authorize (one click)
```powershell
mkdir "$env:USERPROFILE\.wccg-gmail-watcher" -Force   # if it doesn't exist
# (put client_secret.json in there first)
python "C:\Users\wccg1\dev\wccg-new-platform\scripts\gmail-watcher.py" --authorize
```
A browser opens → pick **biggleem** → (unverified warning → Advanced → Go to…) →
**Allow** all requested permissions. `token.json` is written. Done.

---

## RUN & TEST
```powershell
# what it can see + where it will file (no downloads):
python scripts\gmail-watcher.py --status

# first real run SEEDS a baseline (marks current mail as already-handled) so it
# won't re-sync this Sunday's already-filed sermons; only NEW arrivals sync after:
python scripts\gmail-watcher.py --once

# force it to process currently-visible mail (e.g., a sermon that's in the inbox
# right now but not yet on disk):
python scripts\gmail-watcher.py --catchup
```

## INSTALL AS A 24/7 STARTUP SERVICE
Run once (no admin needed):
```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-gmail-watcher-task.ps1
```
This registers a Scheduled Task **at logon** (so the M:\ / Z:\ mapped drives
exist in the session) that launches the daemon with `pythonw` (no console
window) and auto-restarts it if it ever exits. Log: `D:\WCCG\sync-logs\gmail-watcher.log`.

To start it immediately without rebooting:
```powershell
Start-ScheduledTask -TaskName "WCCG Gmail Watcher"
```

---

## TROUBLESHOOTING
- **"RE-AUTH NEEDED" in the log** — the refresh token was rejected (you changed
  the Gmail password, revoked access, or the app is still in "Testing" and 7
  days passed). Re-run `--authorize`. Make sure the app is **Published / In
  production** to avoid the 7-day expiry.
- **A sermon didn't sync** — check the log. If the church changed how they send
  (new address, link format), the sender map / link regex in `gmail-watcher.py`
  needs an update. The watcher emails you "download FAILED" if it saw the mail
  but couldn't fetch it, and does **not** mark it processed (it retries each tick).
- **Nothing happens on first run** — that's the baseline seed (by design). Use
  `--catchup` to force-process what's already in the inbox.
- **Stop/disable:** `Stop-ScheduledTask -TaskName "WCCG Gmail Watcher"` /
  `Disable-ScheduledTask -TaskName "WCCG Gmail Watcher"`.

The hourly Claude watch task was the old sermon/DJ-mix path; it has been dead
since ~08-17. Sermons AND the emailed DJ packs are now driven by this daemon.

- **Restarting the daemon** (after a code update): `Stop-ScheduledTask -TaskName
  "WCCG Gmail Watcher"`, confirm no `pythonw ... gmail-watcher.py` process is left
  (`Get-CimInstance Win32_Process -Filter "Name='pythonw.exe'" | ? CommandLine -match
  'gmail-watcher'`), `Start-ScheduledTask -TaskName "WCCG Gmail Watcher"`, then
  confirm exactly ONE such process and a fresh `gmail-watcher up.` line in the log.
  Do it well before Sunday morning — it owns the sermons (pmb1 airs 1 PM Sunday).
  A restart loses nothing: state lives in `state.json`, and the watchdog task
  relaunches it within ~2 min if it's down.
