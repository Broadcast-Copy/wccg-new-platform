# Bulk-upload the local sermon archive to the Supabase `sermons` bucket and
# index each file in public.sermons, via the TEMPORARY mint-sermon-upload edge
# function (delete it from the dashboard when this finishes).
#
# Local layout: j-sun-am - (gospel)\<YYYY>\sunday <MMDDYY>\<code>.<ext>
# Remote layout: sermons/<code>/<YYYY-MM-DD>.<ext>
# Codes: gpn1, thm1, dvp1, pmb1, lcc1 (mp3/m4a/wav). Idempotent: rows already
# in public.sermons are skipped (preflight list), uploads use upsert.

import json, os, re, subprocess, sys
from datetime import datetime

ROOT = r"D:\WCCG\f-programming - 50000 - 89999\a-dayparts (70000)\j-sun-am - (gospel)"
FN = "https://irjiqbmoohklagdegezz.supabase.co/functions/v1/mint-sermon-upload"
STORE = "https://irjiqbmoohklagdegezz.supabase.co/storage/v1/object/upload/sign/sermons"
SECRET = "0493a297c313da1dc41082e7189971725fe76f31aa3100f2"
LOG = r"D:\WCCG\sync-logs\sermon-upload.log"
CODES = {"gpn1", "thm1", "dvp1", "pmb1", "lcc1"}
CTYPE = {"mp3": "audio/mpeg", "m4a": "audio/mp4", "wav": "audio/wav"}

def log(msg):
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def post(payload):
    r = subprocess.run(
        ["curl", "-s", "--max-time", "60", "-X", "POST", FN,
         "-H", "Content-Type: application/json", "-H", f"x-ingest-secret: {SECRET}",
         "-d", json.dumps(payload)],
        capture_output=True)
    try:
        return json.loads(r.stdout.decode("utf-8", "replace"))
    except Exception:
        return {"error": r.stdout.decode("utf-8", "replace")[:120]}

def main():
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    # discover work
    work = []
    for year in sorted(os.listdir(ROOT)):
        ydir = os.path.join(ROOT, year)
        if not (year.isdigit() and os.path.isdir(ydir)):
            continue
        for sun in sorted(os.listdir(ydir)):
            m = re.match(r"sunday (\d{2})(\d{2})(\d{2})$", sun.strip(), re.I)
            if not m:
                continue
            air = f"20{m.group(3)}-{m.group(1)}-{m.group(2)}"
            sdir = os.path.join(ydir, sun)
            for f in os.listdir(sdir):
                name, dot, ext = f.lower().rpartition(".")
                if name in CODES and ext in CTYPE:
                    work.append((name, air, os.path.join(sdir, f), ext))
    log(f"discovered {len(work)} church sermon files")

    total = ok = failed = 0
    for code, air, path, ext in work:
        total += 1
        size = os.path.getsize(path)
        if size < 1_000_000:
            log(f"SKIP tiny {path} ({size} b)")
            continue
        remote = f"{code}/{air}.{ext}"
        mint = post({"action": "mint", "path": remote})
        if "token" not in mint:
            failed += 1
            log(f"FAIL mint {remote}: {mint.get('error','?')}")
            continue
        up = subprocess.run(
            ["curl", "-s", "-o", "-", "-w", "\\n%{http_code}", "--max-time", "1800",
             "-X", "PUT", f"{STORE}/{remote}?token={mint['token']}",
             "-H", f"Content-Type: {CTYPE[ext]}", "-H", "x-upsert: true",
             "--data-binary", f"@{path}"],
            capture_output=True)
        out = up.stdout.decode("utf-8", "replace").strip().splitlines()
        status = out[-1] if out else "?"
        if status != "200":
            failed += 1
            log(f"FAIL upload {remote}: HTTP {status} {' '.join(out[:-1])[:100]}")
            continue
        rec = post({"action": "record", "church_code": code, "air_date": air,
                    "storage_path": remote, "format": ext, "size_bytes": size})
        if rec.get("ok"):
            ok += 1
            log(f"OK   {remote} ({size//1048576} MB) [{total}/{len(work)}]")
        else:
            failed += 1
            log(f"FAIL record {remote}: {rec.get('error','?')}")

    log(f"DONE total={total} ok={ok} failed={failed}")

if __name__ == "__main__":
    main()
