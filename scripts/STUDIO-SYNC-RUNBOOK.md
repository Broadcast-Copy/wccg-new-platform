# Studio-Sync Watcher — Runbook

**Runs on:** the production-room PC (the one with `D:\WCCG\b-mixshows` + `M:\JBMusic`)
**What it does:** pulls newly-uploaded DJ drops from Supabase to the local
studio folders so DJB Radio / Radio Spider can air them.

This replaces the old API-polling worker — the platform has no API server,
so the watcher talks straight to Supabase (signed in as an admin account;
RLS admin-read-all policies let it see + download every drop).

## One-time setup

1. Python 3.12+ installed (already done on the production PC).
2. `pip install requests`
3. Set two env vars (the admin login the watcher uses):

   ```cmd
   setx WCCG_ADMIN_EMAIL   "biggleem@gmail.com"
   setx WCCG_ADMIN_PASSWORD "********"
   ```

   Optionally override the defaults:
   ```cmd
   setx WCCG_STUDIO_ARCHIVE_ROOT "D:\WCCG\b-mixshows"
   setx WCCG_STUDIO_ONAIR_ROOT   "M:\JBMusic"
   setx WCCG_STUDIO_POLL_MS       "30000"
   ```

## Run it

```cmd
:: one pass then exit (good for a scheduled task)
python scripts\studio-sync-watcher.py

:: poll forever, every 30s (leave running in the production room)
python scripts\studio-sync-watcher.py --loop

:: verbose single pass for debugging
python scripts\studio-sync-watcher.py --once -v
```

## What lands where

For each drop with status `uploaded`/`validated`:

```
D:\WCCG\b-mixshows\<dj-slug>\<CODE>.<ext>            archive
D:\WCCG\b-mixshows\<dj-slug>\on-air\<CODE>.<ext>     per-DJ on-air mirror
M:\JBMusic\<CODE>.<ext>                              flat folder DJB Radio reads
```

Then the drop is marked `published` in Supabase (so the admin dashboard +
the DJ's portal show it as shipped). Idempotent: if the flat copy already
exists at the right size, it's skipped.

## Run as a scheduled task (recommended for production)

```cmd
schtasks /create /tn "WCCG Studio Sync" /sc minute /mo 1 ^
  /tr "python C:\Users\wccg1\dev\wccg-new-platform\scripts\studio-sync-watcher.py" ^
  /ru "%USERNAME%"
```

That runs a one-pass sync every minute. Or use `--loop` under NSSM / a
startup shortcut to keep one long-running process.

## DJ-slug → studio-folder mapping (IMPORTANT)

The watcher writes to `D:\WCCG\b-mixshows\<dj-slug>\`, where `<dj-slug>` is
the `djs.slug` column (e.g. `dj-ike-gda`). The EXISTING studio folders use a
manual ordering prefix (`a-dj-ike-gda`, `bb-dj-drop`, `u-tommy-gee-mix`,
etc.). If you want files to land in those exact existing folders instead of
clean-slug folders, add a mapping — easiest is to set `djs.notes` or a new
`djs.studio_folder` column and have the watcher read it. For now the watcher
uses the slug; the test DJ landed in `D:\WCCG\b-mixshows\dj-admin\`.
