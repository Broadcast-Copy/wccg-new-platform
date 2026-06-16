# Radio-Spider Sync — runbook

Maps syndicated network deliveries (multi-segment shows dropped into
`D:\WCCG\a-traffic (1-1999)\resources\<provider>\`) onto each show's fixed DJB
cart range in `M:\JBMusic` — the flat playout library DJB Radio Spider plays
from. Same idea as the sermon / DJ-mix cart refresh, but for local syndicator
folders instead of email or the platform.

## Configured providers
- **Bootleg Kev** — folder `…\resources\Premiere Networks`, files
  `Bootleg-Kev_<mmddyy>_H<h>S<s>-<DAY>.mp3`, 19 segments → carts **DJB_70531–DJB_70549**
  (H1S1→70531 … H4S5→70549, ordered by hour then segment).
- **Deja Vu** — PAUSED (cart range TBD; the `Mr Master` folder currently holds the
  Marvin Sapp Show). Add a `PROVIDERS` entry in `radio-spider-sync.py` when ready.

## Safety
- **Baseline-seeded:** the first run records the current newest delivery as
  "already handled" and only syncs deliveries with a *newer* date token. It will
  not push a stale delivery onto live carts on its own.
- **Backup before overwrite:** the current cart files are copied to
  `<provider>\_replaced-<YYYYMMDD>\` before being replaced.
- **Count guard:** if a delivery's segment count != the configured `cart_count`,
  the provider is SKIPPED (prevents a short/garbled delivery from scrambling carts).

## Commands
```
python scripts\radio-spider-sync.py --status     # config + newest delivery + last handled
python scripts\radio-spider-sync.py --dry-run    # show the mapping, change nothing
python scripts\radio-spider-sync.py --catchup    # push the CURRENT newest delivery onto carts NOW
python scripts\radio-spider-sync.py --once       # sync only deliveries newer than state
python scripts\radio-spider-sync.py --loop       # poll forever (every 120s)
```

## Run as a service
`scripts\install-radio-spider-task.ps1` registers **WCCG Radio Spider Sync** as an
at-logon `pythonw --loop` daemon (auto-restart). Logs to `D:\WCCG\sync-logs\radio-spider-sync.log`,
state in `C:\Users\wccg1\.wccg-radio-spider\state.json`.
