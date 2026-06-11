#!/usr/bin/env python3
"""
WCCG Studio-Sync Watcher  —  runs ON the production-room PC.

Polls Supabase for newly-uploaded DJ drops and downloads each file to the
exact locations the broadcast chain reads (settled 2026-06-11):

    D:\\WCCG\\b-mixshows\\<local-dj-folder>\\a-on-air\\<MMDDYYYY>-onair\\<CODE>.<ext>
        ^ the AIR-DATE folder RadioSpider's mixshow events copy from
          (MMDDYYYY = the exact day the mix airs, from the drop's slot day)

    M:\\JBMusic\\<CODE>.<ext>
        ^ the flat playout library DJB Radio reads directly (same-day safety
          net: even before RadioSpider's nightly 1:01 AM staging run, the
          file is already in playout)

<local-dj-folder> is the station's prefixed folder name (e.g. dj-drop ->
bb-dj-drop). Unknown slugs fall back to the raw slug.

Architecture: the platform has no API server — this watcher talks straight
to Supabase. It signs in as an ADMIN user (RLS admin-read-all policies let
that account see + download every drop and mark it published). Drops upload
from the web as status='uploaded'; the watcher marks them 'published' once
they are safely on local disk — which is also what makes them publicly
playable on the website (public RLS reads published only).

No service-role key required: only the admin email + password + the public
publishable key (which ships in the web bundle anyway).

Usage:
    set WCCG_ADMIN_EMAIL=biggleem@gmail.com
    set WCCG_ADMIN_PASSWORD=...
    python studio-sync-watcher.py            # one pass, then exit
    python studio-sync-watcher.py --loop     # poll every 30s forever
    python studio-sync-watcher.py --once -v  # verbose single pass

Scheduled-task wrapper: scripts/studio-sync-task.ps1 (reads the DPAPI-
encrypted credential at %LOCALAPPDATA%\\WCCG\\studio-sync-cred.xml and logs
to D:\\WCCG\\sync-logs\\).
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
BUCKET = "dj-drops"

# Station folder names on disk (slug -> prefixed local folder).
LOCAL_FOLDER = {
    "dj-ike-gda": "a-dj-ike-gda",
    "dj-vi": "aa-dj-vi",
    "dj-killako": "b-dj-killa-ko",
    "dj-drop": "bb-dj-drop",
    "dj-tony-neal": "c-dj-tony-neal",
    "dj-dane-dinero": "d-dj-dane-dinero",
    "dj-chuck": "e-dj-chuck",
    "dj-yodo": "g-dj-yodo",
    "dj-itanist": "h-dj-itanist",
    "dj-daffie": "i-dj-daffie",
    "dj-yafeelme": "j-dj-yafeelme",
    "dj-daddy-black": "k-dj-daddyblack",
    "dj-tone-lo": "l-dj-tonelo",
    "dj-chuck-t": "m-dj-chuck-t",
    "dj-juice": "n-dj-juice",
    "dj-wolf": "p-dj-wolf",
    "dj-spin-wiz": "q-dj-spin-wiz",
    "dj-official": "r-dj-official",
    "dj-whosane": "s-dj-whosane",
    "dj-rayn": "t-dj-rayn",
    "dj-tommy-gee": "u-tommy-gee-mix",
    "dj-t-money": "v-dj-t-money",
    "dj-kvng": "w-dj-kvng",
    "dj-corleone": "x-dj-corleone",
    "dj-admin": "dj-admin",
}

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


def onair_path(slug: str, week_of: str, day_of_week, filename: str) -> str | None:
    """<ARCHIVE_ROOT>\\<local-folder>\\a-on-air\\<MMDDYYYY airdate>-onair\\<file>."""
    if day_of_week is None or not week_of:
        return None
    folder = LOCAL_FOLDER.get(slug, slug)
    d = air_date(week_of, day_of_week)
    return os.path.join(
        ARCHIVE_ROOT, folder, "a-on-air", d.strftime("%m%d%Y") + "-onair", filename
    )


def file_ok(path: str | None, size: int) -> bool:
    return bool(path) and os.path.exists(path) and (size == 0 or os.path.getsize(path) == size)


def process(token: str, verbose: bool) -> int:
    rows = fetch_pending(token, verbose)
    shipped = 0
    for d in rows:
        code = d["file_code"]
        ext = (d.get("format") or "mp3").lstrip(".")
        dj = d.get("djs") or {}
        slug = dj.get("slug") or "_unassigned"
        filename = f"{code}.{ext}"
        size = d.get("size_bytes") or 0

        slot = d.get("slot") or {}
        dated_path = onair_path(slug, d.get("week_of"), slot.get("day_of_week"), filename)
        flat_path = os.path.join(ONAIR_FLAT, filename)

        # Idempotent: if both copies are already on disk at the right size,
        # just mark published. Backfill whichever copy is missing without
        # re-downloading when the other is intact.
        have_dated = file_ok(dated_path, size)
        have_flat = file_ok(flat_path, size)
        if have_dated and have_flat:
            mark_published(token, d["id"])
            if verbose:
                log(f"  = {filename} already on disk; marked published")
            continue
        if have_dated or have_flat:
            src = dated_path if have_dated else flat_path
            try:
                with open(src, "rb") as fh:
                    data = fh.read()
            except OSError:
                data = download_object(token, d["storage_path"])
        else:
            data = download_object(token, d["storage_path"])
        if data is None:
            continue

        if dated_path:
            write_file(dated_path, data)
        write_file(flat_path, data)
        mark_published(token, d["id"])
        shipped += 1
        dest = f"M:\\JBMusic\\{filename}"
        if dated_path:
            rel = os.path.relpath(dated_path, ARCHIVE_ROOT)
            dest = f"b-mixshows\\{rel} + " + dest
        log(f"  + {slug}/{filename}  ({len(data):,} bytes)  ->  {dest}")
    return shipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--loop", action="store_true", help="poll forever")
    ap.add_argument("--once", action="store_true", help="single pass (default)")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    log(f"studio-sync: archive={ARCHIVE_ROOT}  flat={ONAIR_FLAT}  bucket={BUCKET}")
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
