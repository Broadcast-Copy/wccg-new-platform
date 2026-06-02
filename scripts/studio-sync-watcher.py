#!/usr/bin/env python3
"""
WCCG Studio-Sync Watcher  —  runs ON the production-room PC.

Polls Supabase for newly-uploaded DJ drops and downloads each mp3 to the
local studio folders, so DJB Radio / Radio Spider can air them:

    D:\\WCCG\\b-mixshows\\<dj-slug>\\<CODE>.<ext>            (per-DJ archive)
    D:\\WCCG\\b-mixshows\\<dj-slug>\\on-air\\<CODE>.<ext>     (per-DJ on-air mirror)
    M:\\JBMusic\\<CODE>.<ext>                                (flat folder DJB Radio reads)

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
BUCKET = "dj-drops"
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
            "select": "id,file_code,storage_path,format,week_of,status,size_bytes,djs(slug,display_name)",
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

        size = d.get("size_bytes") or 0
        # Idempotent: if the flat (DJB Radio) copy already exists at the right
        # size, consider it shipped — mark published + skip the download.
        if os.path.exists(flat_path) and (size == 0 or os.path.getsize(flat_path) == size):
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
        mark_published(token, d["id"])
        shipped += 1
        log(f"  + {slug}/{filename}  ({len(data):,} bytes)  ->  archive + on-air + M:\\JBMusic")
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
