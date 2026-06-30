#!/usr/bin/env python3
"""
sync-dj-drops — pull DJ portal uploads to the broadcast PC, no admin password.

Replaces the credential-dependent studio-sync-watcher for unattended runs. The
dj-drops bucket is PUBLIC, so file bytes download with no auth; the service-role
`studio-sync` edge function does the two privileged bits: list pre-publish drops
and mark each published once it's safely on local disk.

Files each new drop to BOTH:
    D:\\WCCG\\b-mixshows\\<local-folder>\\a-on-air\\<MMDDYYYY airdate>-onair\\<CODE>.<ext>
    M:\\JBMusic\\<CODE>.<ext>
then marks it published (which also makes it playable on the website).

Idempotent: a drop already on disk at the right size is just (re)published,
not re-downloaded. Logs to D:\\WCCG\\sync-logs\\dj-drops-sync.log. Prints a
final SUMMARY line the hourly watch task folds into its email.

Run: python scripts/sync-dj-drops.py
"""

import json, os, subprocess, sys
from datetime import datetime, timedelta

import dj_sync_mail  # emails each DJ when their drop newly syncs (best-effort)

SUPA = "https://irjiqbmoohklagdegezz.supabase.co"
FN = f"{SUPA}/functions/v1/studio-sync"
SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060"
BUCKET_PUBLIC = f"{SUPA}/storage/v1/object/public/dj-drops"
ARCHIVE_ROOT = r"D:\WCCG\b-mixshows"
ONAIR_FLAT = r"M:\JBMusic"
LOG = r"D:\WCCG\sync-logs\dj-drops-sync.log"

# slug -> prefixed local folder (mirror of studio-sync-watcher.LOCAL_FOLDER)
LOCAL_FOLDER = {
    "dj-ike-gda": "a-dj-ike-gda", "dj-vi": "aa-dj-vi", "dj-killako": "b-dj-killa-ko",
    "dj-drop": "bb-dj-drop", "dj-tony-neal": "c-dj-tony-neal", "dj-dane-dinero": "d-dj-dane-dinero",
    "dj-chuck": "e-dj-chuck", "dj-yodo": "g-dj-yodo", "dj-itanist": "h-dj-itanist",
    "dj-daffie": "i-dj-daffie", "dj-yafeelme": "j-dj-yafeelme", "dj-daddy-black": "k-dj-daddyblack",
    "dj-tone-lo": "l-dj-tonelo", "dj-chuck-t": "m-dj-chuck-t", "dj-juice": "n-dj-juice",
    "dj-wolf": "p-dj-wolf", "dj-spin-wiz": "q-dj-spin-wiz", "dj-official": "r-dj-official",
    "dj-whosane": "s-dj-whosane", "dj-rayn": "t-dj-rayn", "dj-tommy-gee": "u-tommy-gee-mix",
    "dj-t-money": "v-dj-t-money", "dj-kvng": "w-dj-kvng", "dj-corleone": "x-dj-corleone",
    "dj-admin": "dj-admin",
}

def log(m):
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {m}"
    print(line, flush=True)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    open(LOG, "a", encoding="utf-8").write(line + "\n")

def api(payload):
    r = subprocess.run(["curl", "-s", "--max-time", "60", "-X", "POST", FN,
        "-H", "Content-Type: application/json", "-d", json.dumps(payload)], capture_output=True)
    try: return json.loads(r.stdout.decode("utf-8", "replace"))
    except Exception: return {"error": r.stdout.decode("utf-8", "replace")[:120]}

def air_date(week_of, dow):
    monday = datetime.strptime(week_of, "%Y-%m-%d")
    return monday + timedelta(days=(6 if dow == 0 else dow - 1))

def fmt_time(t):
    """'17:00:00' -> '5:00 PM'; returns '' on bad input."""
    try:
        hh, mm = int(str(t)[:2]), int(str(t)[3:5])
        ap = "AM" if hh < 12 else "PM"
        return f"{(hh % 12) or 12}:{mm:02d} {ap}"
    except Exception:
        return ""

def air_line(wk, dow, start_time):
    """A human 'Thursday, July 2 at 5:00 PM' line for the DJ's sync email."""
    if dow is None or not wk:
        return "as soon as it's scheduled"
    dt = air_date(wk, dow)
    line = f"{dt.strftime('%A, %B')} {dt.day}"
    tm = fmt_time(start_time)
    return f"{line} at {tm}" if tm else line

def file_ok(path, size):
    return path and os.path.exists(path) and (not size or os.path.getsize(path) == size)

def main():
    res = api({"secret": SECRET, "action": "pending"})
    if not res.get("ok"):
        log(f"FATAL pending: {res.get('error')}"); print("SUMMARY dj-drops: error"); sys.exit(1)
    drops = res["drops"]
    synced, published_only, failed = [], 0, 0
    synced_meta = []  # per newly-synced drop, for the DJ sync-confirmation email
    for d in drops:
        code = d["file_code"]; ext = (d.get("format") or "mp3").lstrip(".")
        slug = (d.get("djs") or {}).get("slug") or "_unassigned"
        slot = d.get("slot") or {}; dow = slot.get("day_of_week"); wk = d.get("week_of")
        size = d.get("size_bytes") or 0
        fname = f"{code}.{ext}"
        dated = None
        if dow is not None and wk:
            dated = os.path.join(ARCHIVE_ROOT, LOCAL_FOLDER.get(slug, slug), "a-on-air",
                                 air_date(wk, dow).strftime("%m%d%Y") + "-onair", fname)
        flat = os.path.join(ONAIR_FLAT, fname)
        if file_ok(dated, size) and file_ok(flat, size):
            api({"secret": SECRET, "action": "publish", "id": d["id"]}); published_only += 1
            continue
        # download from the PUBLIC bucket (no auth)
        tmp = flat + ".part"
        dl = subprocess.run(["curl", "-sL", "--max-time", "900", "-o", tmp,
            f"{BUCKET_PUBLIC}/{d['storage_path']}"], capture_output=True)
        ok = dl.returncode == 0 and os.path.exists(tmp) and os.path.getsize(tmp) > 100000
        if not ok:
            failed += 1; log(f"FAIL download {slug}/{fname}");
            if os.path.exists(tmp): os.remove(tmp)
            continue
        data = open(tmp, "rb").read(); os.remove(tmp)
        for p in [dated, flat]:
            if p:
                os.makedirs(os.path.dirname(p), exist_ok=True)
                open(p, "wb").write(data)
        api({"secret": SECRET, "action": "publish", "id": d["id"]})
        synced.append(f"{slug}/{fname} ({len(data)//1048576}MB)")
        synced_meta.append({
            "slug": slug,
            "name": (d.get("djs") or {}).get("display_name"),
            "code": code,
            "wk": wk, "dow": dow,
            "start_time": slot.get("start_time"),
        })
        log(f"OK {slug}/{fname} -> air-date folder + M:/JBMusic, published")

    # Email each DJ whose drop(s) newly synced this run (best-effort: a mail
    # failure must NEVER break the sync). One email per DJ, listing their parts.
    if synced_meta:
        try:
            ros = dj_sync_mail.roster()
        except Exception as e:  # noqa: BLE001
            ros = {}; log(f"MAIL roster lookup failed: {e}")
        by_dj = {}
        for m in synced_meta:
            by_dj.setdefault(m["slug"], []).append(m)
        for dj_slug, items in by_dj.items():
            rec = ros.get(dj_slug) or {}
            email = rec.get("email")
            name = rec.get("name") or items[0].get("name")
            if not email:
                log(f"MAIL skip {dj_slug}: no email on file"); continue
            codes = [m["code"] for m in items]
            a = air_line(items[0]["wk"], items[0]["dow"], items[0]["start_time"])
            try:
                via = dj_sync_mail.send_sync_notice(email, name, codes, a)
                log(f"MAIL ok {dj_slug} <{email}> {len(codes)} file(s) via {via}")
            except Exception as e:  # noqa: BLE001
                log(f"MAIL fail {dj_slug} <{email}>: {e}")

    log(f"DONE pending={len(drops)} new={len(synced)} already={published_only} failed={failed}")
    # machine-readable summary line for the watch task's email
    print("SUMMARY dj-drops: new=" + str(len(synced)) + " | " + ("; ".join(synced) if synced else "none"))

if __name__ == "__main__":
    main()
