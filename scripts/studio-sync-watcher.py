#!/usr/bin/env python3
"""
WCCG Studio-Sync Watcher  —  runs ON the production-room PC.

Polls Supabase for newly-uploaded DJ drops and downloads each mp3 to the
local studio folders, so DJB Radio / Radio Spider can air them:

    D:\\WCCG\\b-mixshows\\<dj-slug>\\<CODE>.<ext>            (per-DJ archive)
    D:\\WCCG\\b-mixshows\\<dj-slug>\\on-air\\<CODE>.<ext>     (per-DJ on-air mirror)
    M:\\JBMusic\\<CODE>.<ext>                                (flat folder DJB Radio reads)

    D:\\WCCG\\Mixshows\\<YYYY>\\<Weekday>\\<H-MM AM/PM>\\<MMDDYYYY>-onair\\<CODE>.<ext>
                                                            (dated tree for Radio Spider)

  ^ POINT RADIO SPIDER AT  D:\\WCCG\\Mixshows  (set WCCG_STUDIO_PROGRAMMING_ROOT
  to change). The dated sub-folders are created automatically from each drop's
  slot (day + air time) and its week, e.g.

      D:\\WCCG\\Mixshows\\2026\\Monday\\12-00 PM\\05252026-onair\\DJB_76051.mp3

  (A colon isn't a legal Windows path char, so 12:00 pm is written "12-00 PM".)

Architecture: the platform has no API server — this watcher talks straight
to Supabase. It signs in as an ADMIN user (RLS admin-read-all policies let
that account see + download every drop and mark it published).

No service-role key required: only the admin email + password + the public
publishable key (which ships in the web bundle anyway).

Usage:
    set WCCG_ADMIN_EMAIL=biggleem@gmail.com
    set WCCG_ADMIN_PASSWORD=...
    python studio-sync-watcher.py            # one pass, then exit
    python studio-sync-watcher.py --loop     # poll every 30s forever
    python studio-sync-watcher.py --once -v  # verbose single pass
"""

import os
import sys
import time
import argparse

import requests

SUPABASE_URL = os.environ.get("WCCG_SUPABASE_URL", "https://irjiqbmoohklagdegezz.supabase.co")
PUBLISHABLE_KEY = os.environ.get(
    "WCCG_SUPABASE_ANON_KEY", "sb_publishable_w9EytFGBM7mEvefmGhsZ9w_bXbmNjQ4"
)
ADMIN_EMAIL = os.environ.get("WCCG_ADMIN_EMAIL", "biggleem@gmail.com")
ADMIN_PASSWORD = os.environ.get("WCCG_ADMIN_PASSWORD", "")

ARCHIVE_ROOT = os.environ.get("WCCG_STUDIO_ARCHIVE_ROOT", r"D:\WCCG\b-mixshows")
ONAIR_FLAT = os.environ.get("WCCG_STUDIO_ONAIR_ROOT", r"M:\JBMusic")
# Dated tree Radio Spider crawls:  <root>\<YYYY>\<Weekday>\<H-MM AM/PM>\<MMDDYYYY>-onair\
PROGRAMMING_ROOT = os.environ.get("WCCG_STUDIO_PROGRAMMING_ROOT", r"D:\WCCG\Mixshows")
BUCKET = "dj-drops"

DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
POLL_SECONDS = int(os.environ.get("WCCG_STUDIO_POLL_MS", "30000")) // 1000


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def sign_in() -> str:
    """Return an access token for the admin user."""
    if not ADMIN_PASSWORD:
        log("FATAL: set WCCG_ADMIN_PASSWORD env var.")
        sys.exit(1)
    r = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json"},
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    if r.status_code != 200:
        log(f"FATAL: auth failed ({r.status_code}): {r.text[:200]}")
        sys.exit(1)
    return r.json()["access_token"]


def fetch_pending(token: str, verbose: bool):
    """Drops that have been uploaded but not yet marked published, with DJ slug."""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/dj_drops",
        headers={"apikey": PUBLISHABLE_KEY, "Authorization": f"Bearer {token}"},
        params={
            "select": "id,file_code,storage_path,format,week_of,status,size_bytes,djs(slug,display_name),slot:dj_slots(day_of_week,start_time)",
            "status": "in.(uploaded,validated)",
            "storage_path": "not.is.null",
            "order": "uploaded_at.asc",
            "limit": "200",
        },
        timeout=30,
    )
    if r.status_code != 200:
        log(f"  query failed ({r.status_code}): {r.text[:200]}")
        return []
    rows = r.json()
    if verbose:
        log(f"  {len(rows)} pending drop(s)")
    return rows


def download_object(token: str, storage_path: str) -> bytes | None:
    r = requests.get(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
        headers={"apikey": PUBLISHABLE_KEY, "Authorization": f"Bearer {token}"},
        timeout=120,
    )
    if r.status_code != 200:
        log(f"  download failed ({r.status_code}) for {storage_path}: {r.text[:120]}")
        return None
    return r.content


def mark_published(token: str, drop_id: str):
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/dj_drops",
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        params={"id": f"eq.{drop_id}"},
        json={"status": "published", "published_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")},
        timeout=20,
    )


def write_file(path: str, data: bytes):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)


def air_date(week_of: str, day_of_week: int):
    """Calendar date of a slot's day within the week starting at week_of (a Monday)."""
    from datetime import datetime, timedelta
    monday = datetime.strptime(week_of, "%Y-%m-%d")
    offset = 6 if day_of_week == 0 else day_of_week - 1  # Sun=+6, Mon=+0 … Sat=+5
    return monday + timedelta(days=offset)


def fmt_time_12h(hhmm: str) -> str:
    """'12:00' -> '12-00 PM'  (filesystem-safe: no colon)."""
    parts = (hhmm or "0:00").split(":")
    h = int(parts[0]); m = int(parts[1]) if len(parts) > 1 else 0
    ampm = "PM" if h >= 12 else "AM"
    disp = 12 if h % 12 == 0 else h % 12
    return f"{disp}-{m:02d} {ampm}"


def programming_path(week_of: str, day_of_week: int, start_time: str, filename: str) -> str:
    """<PROGRAMMING_ROOT>\\<YYYY>\\<Weekday>\\<H-MM AM/PM>\\<MMDDYYYY>-onair\\<file>."""
    d = air_date(week_of, day_of_week)
    return os.path.join(
        PROGRAMMING_ROOT,
        d.strftime("%Y"),
        DAY_NAMES[day_of_week],
        fmt_time_12h(start_time),
        d.strftime("%m%d%Y") + "-onair",
        filename,
    )


def process(token: str, verbose: bool) -> int:
    rows = fetch_pending(token, verbose)
    shipped = 0
    for d in rows:
        code = d["file_code"]
        ext = (d.get("format") or "mp3").lstrip(".")
        dj = d.get("djs") or {}
        slug = dj.get("slug") or "_unassigned"
        filename = f"{code}.{ext}"

        archive_path = os.path.join(ARCHIVE_ROOT, slug, filename)
        onair_path = os.path.join(ARCHIVE_ROOT, slug, "on-air", filename)
        flat_path = os.path.join(ONAIR_FLAT, filename)

        # Dated tree for Radio Spider — needs the slot's day + air time.
        slot = d.get("slot") or {}
        prog_path = None
        if slot.get("day_of_week") is not None and slot.get("start_time") and d.get("week_of"):
            prog_path = programming_path(d["week_of"], slot["day_of_week"], slot["start_time"], filename)

        size = d.get("size_bytes") or 0
        # Idempotent: if the flat (DJB Radio) copy already exists at the right
        # size, consider it shipped — mark published + backfill any missing
        # dated copy, then skip the download.
        if os.path.exists(flat_path) and (size == 0 or os.path.getsize(flat_path) == size):
            if prog_path and not os.path.exists(prog_path):
                try:
                    with open(flat_path, "rb") as fh:
                        write_file(prog_path, fh.read())
                except OSError:
                    pass
            mark_published(token, d["id"])
            if verbose:
                log(f"  = {filename} already on disk; marked published")
            continue

        data = download_object(token, d["storage_path"])
        if data is None:
            continue
        write_file(archive_path, data)
        write_file(onair_path, data)
        write_file(flat_path, data)
        if prog_path:
            write_file(prog_path, data)
        mark_published(token, d["id"])
        shipped += 1
        dest = "archive + on-air + M:\\JBMusic"
        if prog_path:
            dest += f" + Mixshows\\{os.path.relpath(prog_path, PROGRAMMING_ROOT)}"
        log(f"  + {slug}/{filename}  ({len(data):,} bytes)  ->  {dest}")
    return shipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--loop", action="store_true", help="poll forever")
    ap.add_argument("--once", action="store_true", help="single pass (default)")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    log(f"studio-sync: archive={ARCHIVE_ROOT}  flat={ONAIR_FLAT}  programming={PROGRAMMING_ROOT}  bucket={BUCKET}")
    token = sign_in()
    log(f"signed in as {ADMIN_EMAIL}")

    if args.loop:
        log(f"polling every {POLL_SECONDS}s — Ctrl+C to stop")
        while True:
            try:
                n = process(token, args.verbose)
                if n:
                    log(f"shipped {n} file(s)")
            except requests.RequestException as e:
                log(f"  network error: {e}")
            except Exception as e:  # noqa: BLE001
                log(f"  error: {e}")
                # token may have expired — re-auth
                token = sign_in()
            time.sleep(POLL_SECONDS)
    else:
        n = process(token, True)
        log(f"done — shipped {n} file(s)")


if __name__ == "__main__":
    main()
