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

If the DJ uploaded a format playout can't take (AIFF, mostly -- it's what Logic
and Pro Tools export by default) and accepted the portal's offer to convert,
the file is transcoded to mp3 with ffmpeg here, before it's filed. Only the mp3
reaches the air folders. See migration 111.

Idempotent: a drop already on disk at the right size is just (re)published,
not re-downloaded. Logs to D:\\WCCG\\sync-logs\\dj-drops-sync.log. Prints a
final SUMMARY line the hourly watch task folds into its email.

Run: python scripts/sync-dj-drops.py
"""

import json, os, shutil, subprocess, sys, zipfile
from datetime import datetime, timedelta

import dj_sync_mail  # emails each DJ when their drop newly syncs (best-effort)

SUPA = "https://irjiqbmoohklagdegezz.supabase.co"
FN = f"{SUPA}/functions/v1/studio-sync"
SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060"
BUCKET_PUBLIC = f"{SUPA}/storage/v1/object/public/dj-drops"
ARCHIVE_ROOT = r"D:\WCCG\b-mixshows"
ONAIR_FLAT = r"M:\JBMusic"
LOG = r"D:\WCCG\sync-logs\dj-drops-sync.log"

# Same ffmpeg the gmail-watcher shells out to for sermon transcodes.
FFMPEG = os.environ.get("FFMPEG_BIN", r"C:\Program Files\Nickvision Parabolic\Release\ffmpeg.exe")
FFPROBE = os.environ.get("FFPROBE_BIN") or os.path.join(os.path.dirname(FFMPEG), "ffprobe.exe")
MP3_BITRATE = "192k"          # matches the sermon pipeline
AIR_READY = {"mp3", "wav"}    # what playout takes without help
AUDIO_KINDS = {"mp3", "wav", "aiff", "flac", "ogg", "m4a"}
MIN_AIR_SECONDS = 30          # anything shorter than this isn't a mix

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

# --- content guards -------------------------------------------------------
# Never trust the declared format. A ZIP named .mp3 passes an extension check,
# passes a size check, and then hangs playout when the cart fires. DJ Chuck's
# Mac "Compress" exports did exactly that to carts 76073/76074 for three weeks
# (2026-07-09 through 07-30) before anyone traced the freeze to the file.

MAGIC = [
    (b"ID3", "mp3"), (b"\xff\xfb", "mp3"), (b"\xff\xfa", "mp3"), (b"\xff\xf3", "mp3"),
    (b"\xff\xf2", "mp3"), (b"\xff\xe3", "mp3"),
    (b"fLaC", "flac"), (b"OggS", "ogg"), (b"PK\x03\x04", "zip"),
]

def sniff(path):
    """What the bytes actually are, ignoring the filename."""
    try:
        with open(path, "rb") as f:
            head = f.read(12)
    except OSError:
        return "unknown"
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "wav"
    if head[:4] == b"FORM" and head[8:12] in (b"AIFF", b"AIFC"):
        return "aiff"
    if head[4:8] == b"ftyp":
        return "m4a"
    for sig, kind in MAGIC:
        if head.startswith(sig):
            return kind
    return "unknown"

def unwrap_zip(path):
    """Pull the real mix back out of a zipped folder. Returns (path, kind).

    Mac's Compress on a music folder yields <name>/Unknown Album/<name>.mp3
    alongside __MACOSX resource forks -- the audio itself is intact, just
    wrapped. Take the largest real entry and let the caller re-verify it.
    """
    out = path + ".unwrapped"
    try:
        with zipfile.ZipFile(path) as z:
            cands = [e for e in z.infolist()
                     if not e.is_dir()
                     and not e.filename.startswith("__MACOSX")
                     and not os.path.basename(e.filename).startswith("._")
                     and e.file_size > 1_000_000]
            if not cands:
                log("  UNWRAP: zip holds no file big enough to be a mix")
                return None, None
            best = max(cands, key=lambda e: e.file_size)
            with z.open(best) as src, open(out, "wb") as dst:
                shutil.copyfileobj(src, dst, 1024 * 1024)
    except Exception as e:  # noqa: BLE001
        log(f"  UNWRAP failed: {e}")
        if os.path.exists(out):
            os.remove(out)
        return None, None
    kind = sniff(out)
    log(f"  UNWRAP zip -> {best.filename} ({best.file_size // 1048576}MB, {kind})")
    return out, kind

def audio_ok(path):
    """Last gate before an on-air cart: does this actually decode as audio?"""
    if not os.path.exists(FFPROBE):
        log(f"  VERIFY skipped: ffprobe not found at {FFPROBE}")
        return True  # magic-byte guard already ran; don't stall the pipeline
    try:
        r = subprocess.run(
            [FFPROBE, "-v", "error", "-select_streams", "a:0",
             "-show_entries", "stream=codec_type", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, timeout=300)
        fields = r.stdout.decode(errors="replace").split()
        if r.returncode != 0 or "audio" not in fields:
            log(f"  VERIFY no decodable audio stream: {r.stderr.decode(errors='replace')[:160]}")
            return False
        dur = 0.0
        for f in fields:
            try:
                dur = max(dur, float(f))
            except ValueError:
                pass
        if dur < MIN_AIR_SECONDS:
            log(f"  VERIFY duration {dur:.1f}s under {MIN_AIR_SECONDS}s floor")
            return False
        return True
    except Exception as e:  # noqa: BLE001
        log(f"  VERIFY error: {e}")
        return False

def dest_paths(code, ext, slug, dow, wk):
    """(filename, dated archive path, flat on-air cart path) for one drop."""
    fname = f"{code}.{ext}"
    dated = None
    if dow is not None and wk:
        dated = os.path.join(ARCHIVE_ROOT, LOCAL_FOLDER.get(slug, slug), "a-on-air",
                             air_date(wk, dow).strftime("%m%d%Y") + "-onair", fname)
    return fname, dated, os.path.join(ONAIR_FLAT, fname)

def file_ok(path, size):
    """Is the on-disk copy already good?

    When the portal never recorded a size (size_bytes=0, which is exactly what
    the zipped uploads carried) the old `not size` shortcut called any existing
    file a match -- so a broken cart was treated as synced forever and never
    self-healed. With no size to compare, check the bytes instead.
    """
    if not path or not os.path.exists(path):
        return False
    if size:
        return os.path.getsize(path) == size
    return sniff(path) in AUDIO_KINDS

def transcode_to_mp3(src, ext):
    """AIFF (or other non-air format) -> mp3 bytes. Returns None if ffmpeg fails.

    DJs export whatever their DAW defaults to -- Logic and Pro Tools hand out
    AIFF -- and the portal now offers to convert rather than bouncing an
    hour-long mix back at them. The DJ's acceptance arrives as convert_to_mp3.
    """
    if not os.path.exists(FFMPEG):
        log(f"  CONVERT skipped: ffmpeg not found at {FFMPEG}")
        return None
    out = src + ".mp3"
    try:
        r = subprocess.run(
            [FFMPEG, "-y", "-v", "error", "-i", src, "-vn",
             "-c:a", "libmp3lame", "-b:a", MP3_BITRATE, out],
            capture_output=True, timeout=1800)
        if r.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) < 100000:
            log(f"  CONVERT {ext}->mp3 FAILED: {r.stderr.decode(errors='replace')[:200]}")
            return None
        data = open(out, "rb").read()
        return data
    except Exception as e:  # noqa: BLE001
        log(f"  CONVERT {ext}->mp3 error: {e}")
        return None
    finally:
        if os.path.exists(out):
            os.remove(out)

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
        fname, dated, flat = dest_paths(code, ext, slug, dow, wk)
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
        # Trust the bytes, not d["format"]. Unwrap a zipped folder if that's
        # what turned up, then refuse anything that won't decode -- a bad file
        # must never overwrite the good cart already sitting in M:\JBMusic.
        kind = sniff(tmp)
        unwrapped = False
        if kind == "zip":
            un, kind = unwrap_zip(tmp)
            if un is None:
                failed += 1; log(f"FAIL {slug}/{fname}: zip with no usable audio inside")
                os.remove(tmp); continue
            os.remove(tmp); tmp = un; unwrapped = True
        if kind not in AUDIO_KINDS:
            failed += 1
            log(f"FAIL {slug}/{fname}: bytes are '{kind}', not audio -- cart left untouched")
            os.remove(tmp); continue
        if not audio_ok(tmp):
            failed += 1
            log(f"FAIL {slug}/{fname}: failed decode check -- cart left untouched")
            os.remove(tmp); continue
        if kind != ext:
            log(f"  SNIFF {slug}/{code}: declared '{ext}', bytes are '{kind}'")

        # Everything reaches air as mp3. DJs export whatever their DAW hands
        # them -- Logic and Pro Tools default to AIFF, and WAV turns up too --
        # so convert here automatically rather than bouncing an hour-long mix
        # back at them or asking them to opt in.
        converted_from = None
        data = None
        if kind != "mp3":
            data = transcode_to_mp3(tmp, kind)
            if data is not None:
                converted_from = f"zip+{kind}" if unwrapped else kind
                log(f"  CONVERT {slug}/{code}: {kind} -> mp3 @{MP3_BITRATE}")
                kind = "mp3"
            elif kind in AIR_READY:
                # WAV plays out fine as-is; file the original rather than
                # dropping the mix over a failed convenience transcode.
                log(f"  CONVERT {slug}/{code} failed, filing original {kind}")
            else:
                failed += 1
                log(f"FAIL {slug}/{code}: {kind} -> mp3 failed -- cart left untouched")
                os.remove(tmp); continue
        # An unwrapped zip whose insides were already mp3 still needs reporting:
        # it tells the edge fn the real byte count (the row's size_bytes describes
        # the zip, or nothing at all) and leaves "zip" in source_format so a DJ
        # who keeps compressing their folder is obvious in the data.
        if unwrapped and converted_from is None:
            converted_from = "zip"
        ext = kind
        fname, dated, flat = dest_paths(code, ext, slug, dow, wk)
        if data is None:
            data = open(tmp, "rb").read()
        os.remove(tmp)
        for p in [dated, flat]:
            if p:
                os.makedirs(os.path.dirname(p), exist_ok=True)
                open(p, "wb").write(data)
        if converted_from:
            api({"secret": SECRET, "action": "converted", "id": d["id"],
                 "from": converted_from, "size_bytes": len(data)})
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
