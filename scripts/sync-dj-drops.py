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

How writes reach air (since 2026-09-27)
---------------------------------------
M:\\JBMusic\\DJB_<code>.<ext> is live the moment it changes: the ON-AIR PC plays
it straight off \\\\onair\\AUDIO. Until 2026-09-27 this script truncated and
rewrote that file in place, with no backup, even while it was airing. Now:

  1. Download, sniff, unzip, decode-check and transcode all happen in work files
     beside the cart named ".~sync-DJB_<code>.<ext>.<tag>" -- they never start
     with DJB_ and never end in an audio extension, so AirSuite's library scan
     (DJB_<digits>.<audio ext>, library/cart-names.js) can't take one for a cart.
  2. sha256 decides. If the cart already holds exactly these bytes it is not
     rewritten ("SAME sha256"), just published. A pending email-ingest row whose
     checksum already matches both copies on disk is published without a download.
  3. On-air guard (on_air_guard): the cart is NOT replaced, and the drop NOT
     published, while it is airing -- the last audio `start` in the ON-AIR journal
     mirror (C:\\AirSuite\\onair-journal\\journal\\<local date>.jsonl) names it and
     began less than its duration + 2 min ago. If the mirror is missing or its
     last event is over JOURNAL_STALE_S (2 min) old -- it is fetched every ~15
     min and can't see a cart that started since -- the slot's weekly air window
     (+/- 15 min) decides instead.
     "DEFER <slug>/<code>: on air now (...)"; the next 5-minute run retries. The
     dated archive copy is still filed.
  4. place_cart: bytes -> temp file in the cart's own folder, fsync, read back and
     verified; the cart being replaced is copied first to
     D:\\WCCG\\sync-logs\\cart-backups\\<YYYYMMDD>\\DJB_<code>.<ext>.<HHMMSS>
     (verified; newest BACKUP_KEEP per cart kept) -- no backup, no replace; then
     one os.replace() onto the cart: atomic on the volume, and a player already
     holding the old file keeps reading the old bytes. The cart keeps the name
     case already on the share. Any failure: temp removed, cart untouched.
  5. A second audio file for the same cart (DJB_x.mp3 beside DJB_x.wav) is never
     deleted or renamed -- playout/DJB may reference it: "WARN two files for
     cart", once per run, counted in the SUMMARY line.
  6. One run at a time (RUN_LOCK). The task goes through run-hidden.vbs, which
     returns at once, so Task Scheduler's IgnoreNew never sees a run still going.

Idempotent: a drop already on disk (right size, or right sha256 when the row
carries one) is just (re)published, not re-downloaded. Logs to
D:\\WCCG\\sync-logs\\dj-drops-sync.log. Prints a final SUMMARY line the hourly
watch task folds into its email.

Run: python scripts/sync-dj-drops.py
Tests: python scripts/test_sync_dj_drops.py
"""

import hashlib, json, os, re, shutil, subprocess, sys, zipfile
from datetime import datetime, time as dtime, timedelta, timezone

try:
    import msvcrt
except ImportError:  # not Windows
    msvcrt = None
    import fcntl

import dj_sync_mail  # emails each DJ when their drop newly syncs (best-effort)
import studio_sync_secret

SUPA = "https://irjiqbmoohklagdegezz.supabase.co"
FN = f"{SUPA}/functions/v1/studio-sync"
# env / ~/.wccg-gmail-watcher/studio-sync.secret first; the legacy constant keeps
# the sync running until that exists (it's committed — rotate it, then drop it).
SECRET = studio_sync_secret.load() or "c2040f1371c9265c538bdce3547346bd5ae53060"
BUCKET_PUBLIC = f"{SUPA}/storage/v1/object/public/dj-drops"
ARCHIVE_ROOT = r"D:\WCCG\b-mixshows"
ONAIR_FLAT = r"M:\JBMusic"
LOG = r"D:\WCCG\sync-logs\dj-drops-sync.log"
RUN_LOCK = r"D:\WCCG\sync-logs\dj-drops-sync.lock"
BACKUP_ROOT = r"D:\WCCG\sync-logs\cart-backups"   # <YYYYMMDD>\DJB_<code>.<ext>.<HHMMSS>
BACKUP_KEEP = 10                                    # newest backups kept per cart

# ON-AIR journal mirror (AirSuite onair-journal, refreshed from ONAIR every ~15
# min). Read-only here: one JSON line per event, file per LOCAL date.
JOURNAL_DIR = r"C:\AirSuite\onair-journal\journal"
# Last event older than this: the mirror can't say what is playing NOW. Not 15
# min: the mirror is fetched every ~15 min, so its last event only bounds what it
# knew at the last fetch -- a cart that started since is invisible to it. And an
# atomic replace does not protect a playing mix: parts over 8 min play through an
# <audio> element that range-reads the file as it goes (engine renderer
# MediaPlayer + supervisor /audio), so later reads would get the new bytes. Only
# a mirror that is effectively live may clear a cart inside its slot window.
JOURNAL_STALE_S = 2 * 60
ONAIR_TAIL_S = 120            # a cart counts as airing until duration + this
DEFAULT_CART_S = 70 * 60      # airing file's duration when it can't be read
DEFAULT_SHOW_MIN = 120        # slot length when the row carries no end_time
WINDOW_PAD_S = 15 * 60        # slot window padding, both ends

# Same ffmpeg the gmail-watcher shells out to for sermon transcodes.
FFMPEG = os.environ.get("FFMPEG_BIN", r"C:\Program Files\Nickvision Parabolic\Release\ffmpeg.exe")
FFPROBE = os.environ.get("FFPROBE_BIN") or os.path.join(os.path.dirname(FFMPEG), "ffprobe.exe")
MP3_BITRATE = "192k"          # matches the sermon pipeline
AIR_READY = {"mp3", "wav"}    # what playout takes without help
AUDIO_KINDS = {"mp3", "wav", "aiff", "flac", "ogg", "m4a"}
MIN_AIR_SECONDS = 30          # anything shorter than this isn't a mix
# pythonw runs this: a console child would flash a window without the flag
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

# What AirSuite's library scan counts as audio (library/cart-names.js AUDIO_EXT);
# with ^DJB_(\d+)\. that is what it takes for a cart.
SCAN_AUDIO_EXT = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aif", ".aiff"}
CART_NAME_RE = re.compile(r"^DJB_(\d+)\.", re.I)
TEMP_PREFIX = ".~sync-"
SHA_RE = re.compile(r"^[0-9a-f]{64}$")

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
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def api(payload):
    r = subprocess.run(["curl", "-s", "--max-time", "60", "-X", "POST", FN,
        "-H", "Content-Type: application/json", "-d", json.dumps(payload)],
        capture_output=True, creationflags=NO_WINDOW)
    try: return json.loads(r.stdout.decode("utf-8", "replace"))
    except Exception: return {"error": r.stdout.decode("utf-8", "replace")[:120]}

def utcnow():
    return datetime.now(timezone.utc)

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
            capture_output=True, timeout=300, creationflags=NO_WINDOW)
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

def probe_seconds(path):
    """Duration of an audio file in seconds, or None when it can't be read."""
    if not os.path.exists(FFPROBE) or not os.path.isfile(path):
        return None
    try:
        r = subprocess.run(
            [FFPROBE, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, timeout=60, creationflags=NO_WINDOW)
        return float(r.stdout.decode(errors="replace").split()[0])
    except Exception:  # noqa: BLE001
        return None

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

    The output is named <src>.conv with the format forced (-f mp3): the old
    <src>.mp3 was an audio file sitting in M:\\JBMusic that AirSuite's scan could
    pick up while ffmpeg was still writing it.
    """
    if not os.path.exists(FFMPEG):
        log(f"  CONVERT skipped: ffmpeg not found at {FFMPEG}")
        return None
    out = src + ".conv"
    try:
        r = subprocess.run(
            [FFMPEG, "-y", "-v", "error", "-i", src, "-vn",
             "-c:a", "libmp3lame", "-b:a", MP3_BITRATE, "-f", "mp3", out],
            capture_output=True, timeout=1800, creationflags=NO_WINDOW)
        if r.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) < 100000:
            log(f"  CONVERT {ext}->mp3 FAILED: {r.stderr.decode(errors='replace')[:200]}")
            return None
        with open(out, "rb") as f:
            return f.read()
    except Exception as e:  # noqa: BLE001
        log(f"  CONVERT {ext}->mp3 error: {e}")
        return None
    finally:
        if os.path.exists(out):
            os.remove(out)

# --- writes that reach air -------------------------------------------------

class CartBusy(OSError):
    """The replace was refused: something holds the cart open."""

def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def _remove_quietly(path):
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        pass

def temp_path(final_path, tag):
    """A work file beside `final_path` that nothing can take for a cart.

    AirSuite's library scan takes any <name>.<audio ext> in M:\\JBMusic and reads
    the cart from ^DJB_(\\d+)\\. The old download temp DJB_x.mp3.part only escaped
    because .part isn't audio; the transcode beside it (DJB_x.mp3.part.mp3) did
    not. '.~sync-' can never match ^DJB_, and the tag keeps the extension
    non-audio. Same folder as the cart, so os.replace stays one atomic rename.
    """
    d, name = os.path.split(final_path)
    return os.path.join(d, f"{TEMP_PREFIX}{name}.{tag}")

# One listing per folder per run: the name case already on disk, and the other
# files a cart has. The lock makes this run the folder's only writer.
_names = {}

def dir_names(d):
    """{lower-case name: name as stored} for folder d (cached for the run)."""
    if d not in _names:
        try:
            _names[d] = {n.lower(): n for n in os.listdir(d)}
        except OSError:
            _names[d] = {}
    return _names[d]

def on_disk_name(path):
    """`path` spelled with the case the file already has on disk, if it exists.

    NTFS keeps whatever case a file was created with; replacing DJB_x.MP3 with
    DJB_x.mp3 re-cases it, and a re-cased cart went dark in AirSuite for 17 days
    (AccuWeather 60001-60004, 2026-09-05..22). Keep the stored spelling.
    """
    d, name = os.path.split(path)
    return os.path.join(d, dir_names(d).get(name.lower(), name))

def remember_name(path):
    d, name = os.path.split(path)
    dir_names(d)[name.lower()] = name

BACKUP_RE = re.compile(r"^(DJB_\d+)\.([A-Za-z0-9]+)\.(\d{6})(?:-(\d+))?$", re.I)

def backup_cart(cart_path, expect_sha=None, now=None):
    """Copy the cart about to be replaced to BACKUP_ROOT\\<YYYYMMDD>\\<name>.<HHMMSS>.

    The copy is read back and must hash to `expect_sha` (what place_cart saw on
    the share) before it counts. Raises when no verified backup exists, so the
    replace never happens without one.
    """
    now = now or datetime.now()
    name = os.path.basename(cart_path)
    day = os.path.join(BACKUP_ROOT, now.strftime("%Y%m%d"))
    os.makedirs(day, exist_ok=True)
    base = f"{name}.{now:%H%M%S}"
    # same second again: -2, -3 ... always past the highest taken, so a newer
    # backup never reuses (and sorts as) a slot the prune already emptied
    taken = [BACKUP_RE.match(n) for n in os.listdir(day) if n.lower().startswith(base.lower())]
    n = max([int(m.group(4) or 1) for m in taken if m] or [0])
    dest = os.path.join(day, base if n == 0 else f"{base}-{n + 1}")
    part = dest + ".partial"
    try:
        shutil.copyfile(cart_path, part)
        if expect_sha and sha256_file(part) != expect_sha:
            raise OSError(f"backup of {name} does not match the cart it was copied from")
        os.replace(part, dest)
    except BaseException:
        _remove_quietly(part)
        raise
    try:
        for p in prune_backups(name):
            log(f"  BACKUP pruned {p}")
    except Exception as e:  # noqa: BLE001 -- a failed prune never blocks the write
        log(f"  WARN backup prune for {name}: {e}")
    return dest

def prune_backups(cart_name, keep=None):
    """Keep the newest `keep` backups of this cart (any extension); return what was removed.

    Only ever deletes BACKUP_ROOT\\<8 digits>\\<DJB_n.ext.HHMMSS[-k]> regular files
    for this cart, and only after resolving each one back inside BACKUP_ROOT.
    """
    keep = max(1, BACKUP_KEEP if keep is None else keep)
    stem = cart_name.split(".")[0].lower()
    root = os.path.realpath(BACKUP_ROOT)
    found = []
    for day in os.listdir(root):
        ddir = os.path.join(root, day)
        if not re.fullmatch(r"\d{8}", day) or os.path.islink(ddir) or not os.path.isdir(ddir):
            continue
        for n in os.listdir(ddir):
            m = BACKUP_RE.match(n)
            p = os.path.join(ddir, n)
            if not m or m.group(1).lower() != stem or os.path.islink(p) or not os.path.isfile(p):
                continue
            found.append(((day, m.group(3), int(m.group(4) or 1)), p))
    found.sort(reverse=True)
    removed = []
    for _, p in found[keep:]:
        rp = os.path.realpath(p)
        if os.path.normcase(os.path.dirname(os.path.dirname(rp))) != os.path.normcase(root):
            continue
        os.remove(rp)
        removed.append(rp)
    for p in removed:  # a day folder the prune emptied
        try:
            os.rmdir(os.path.dirname(p))
        except OSError:
            pass
    return removed

def place_cart(data, final_path, backup=True, guard=None):
    """Put `data` at `final_path` atomically. -> (outcome, detail)

      ("same", None)          the file already holds exactly these bytes; untouched
      ("deferred", why)       guard() said not now; nothing written
      ("created", None)       nothing was there before
      ("replaced", backup)    old bytes copied to `backup` first (None if backup=False)

    Temp file in the same folder -> fsync -> read back and verified -> backup of
    the old file (verified) -> os.replace. Any failure removes the temp, leaves
    final_path as it was, and raises (CartBusy when the replace itself was
    refused, e.g. the file is held open).
    """
    final_path = on_disk_name(final_path)
    new_sha = sha256_bytes(data)
    old_sha = sha256_file(final_path) if os.path.isfile(final_path) else None
    if old_sha == new_sha:
        return "same", None
    if guard is not None:
        defer, why = guard()
        if defer:
            return "deferred", why
    tmp = temp_path(final_path, "tmp")
    bak = None
    try:
        with open(tmp, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        if os.path.getsize(tmp) != len(data) or sha256_file(tmp) != new_sha:
            raise OSError(f"{os.path.basename(tmp)} did not read back as written")
        if old_sha is not None and backup:
            bak = backup_cart(final_path, expect_sha=old_sha)
        try:
            os.replace(tmp, final_path)
        except PermissionError as e:
            raise CartBusy(str(e)) from e
    except BaseException:
        _remove_quietly(tmp)
        raise
    remember_name(final_path)
    return ("replaced" if old_sha is not None else "created"), bak

# --- on-air guard -----------------------------------------------------------

def _cart_no(name):
    """Cart number a DJB file name or code carries (DJB_0302.wav = 302), else None."""
    m = re.match(r"DJB_(\d+)(?:\.|$)", os.path.basename(str(name or "")), re.I)
    return int(m.group(1)) if m else None

def _item_cart(item):
    if not isinstance(item, dict):
        return None
    if item.get("file"):
        return _cart_no(item["file"])
    try:
        return int(item.get("cart") or 0) or None
    except (TypeError, ValueError):
        return None

def _event_time(s):
    try:
        t = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo else None

def journal_events(local_now, journal_dir):
    """[(utc time, event)] from yesterday's and today's (local) mirror files, oldest first."""
    evs = []
    for day in (local_now.date() - timedelta(days=1), local_now.date()):
        p = os.path.join(journal_dir, f"{day:%Y-%m-%d}.jsonl")
        try:
            with open(p, encoding="utf-8-sig") as f:
                for line in f:
                    try:
                        e = json.loads(line)
                    except ValueError:
                        continue
                    t = _event_time(e.get("t")) if isinstance(e, dict) else None
                    if t:
                        evs.append((t, e))
        except OSError:
            continue
    evs.sort(key=lambda x: x[0])
    return evs

def _hhmm(s):
    try:
        return int(str(s)[:2]) * 60 + int(str(s)[3:5])
    except (TypeError, ValueError):
        return None

def air_window(slot, local_now):
    """'Sat 22:00-00:00' when local_now is inside the slot's weekly air window
    (padded WINDOW_PAD_S both ends), else None. day_of_week 0 = Sunday."""
    dow = (slot or {}).get("day_of_week")
    start = _hhmm((slot or {}).get("start_time"))
    if dow is None or start is None:
        return None
    end = _hhmm(slot.get("end_time"))
    length = ((end - start) % 1440 or 1440) if end is not None else DEFAULT_SHOW_MIN
    now = local_now.replace(tzinfo=None)
    pad = timedelta(seconds=WINDOW_PAD_S)
    for back in (-1, 0, 1):   # tomorrow's (lead-in), today's, yesterday's past midnight
        day = now.date() - timedelta(days=back)
        if (day.weekday() + 1) % 7 != int(dow):
            continue
        s = datetime.combine(day, dtime()) + timedelta(minutes=start)
        e = s + timedelta(minutes=length)
        if s - pad <= now <= e + pad:
            return f"{s:%a %H:%M}-{e:%H:%M}"
    return None

def on_air_guard(code, slot, now=None, journal_dir=None, flat_dir=None, probe=None, tz=None):
    """Must cart `code` be left alone right now? -> (defer, why)

    1. The most recent audio `start` in the ON-AIR journal mirror names this cart
       (DJB_<n>, any extension/case) and began less than its duration + ONAIR_TAIL_S
       ago -> defer. Duration: ffprobe of that file in the flat folder, else
       DEFAULT_CART_S. Starts with no file and no cart (hour markers) are ignored,
       so a marker can't hide a mix that is still playing.
    2. Mirror missing, or its last event older than JOURNAL_STALE_S: it can't say.
       Defer only if the slot's weekly air window holds now.
    3. Otherwise proceed.
    """
    now = now or utcnow()
    local = now.astimezone(tz) if tz else now.astimezone()
    probe = probe or probe_seconds
    want = _cart_no(code)
    evs = journal_events(local, journal_dir or JOURNAL_DIR)
    starts = [(t, e) for t, e in evs if e.get("type") == "start"
              and isinstance(e.get("item"), dict)
              and (e["item"].get("file") or e["item"].get("cart"))]
    if starts:
        t0, e = starts[-1]
        item = e["item"]
        if want is not None and _item_cart(item) == want:
            f = item.get("file")
            dur = probe(os.path.join(flat_dir or ONAIR_FLAT, os.path.basename(f))) if f else None
            dur = dur if dur and dur > 0 else DEFAULT_CART_S
            age = (now - t0).total_seconds()
            if age < dur + ONAIR_TAIL_S:
                return True, (f"journal: {f or code} started {int(age // 60)} min ago, "
                              f"runs {int(dur // 60)} min")
    last = evs[-1][0] if evs else None
    if last is not None and (now - last).total_seconds() <= JOURNAL_STALE_S:
        return False, "journal current, cart not airing"
    blind = ("no journal mirror" if last is None
             else f"journal mirror {int((now - last).total_seconds() // 60)} min old")
    win = air_window(slot, local)
    if win:
        return True, f"{blind}; inside the slot's air window {win}"
    return False, f"{blind}; outside the slot's air window"

# --- per-run bookkeeping ----------------------------------------------------

def run_lock(path=None):
    """Hold an OS lock for the whole run; None when another run holds it."""
    path = path or RUN_LOCK
    os.makedirs(os.path.dirname(path), exist_ok=True)
    f = open(path, "a+")
    try:
        if msvcrt:
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        f.close()
        return None
    return f

def release_run_lock(f):
    try:
        if msvcrt:
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
    except OSError:
        pass
    f.close()

def platform_sha(d):
    """The row's sha256 when it describes the exact bytes that land on the cart.

    Only email ingests set it (gmail-watcher hashes what it uploads). A portal
    re-upload over an emailed row changes source to 'web' but leaves the old
    checksum behind, and anything converted/unzipped here isn't those bytes.
    """
    s = str(d.get("checksum_sha256") or "").strip().lower()
    if not SHA_RE.match(s) or d.get("source") != "email":
        return None
    if d.get("converted_at") or d.get("source_format"):
        return None
    if str(d.get("format") or "").lstrip(".").lower() != "mp3":
        return None
    return s

def on_disk(path, size, psha):
    """Is this copy already right? sha256 vs the platform checksum when the row
    carries a usable one, else file_ok's size/bytes check."""
    if psha:
        return bool(path) and os.path.isfile(path) and sha256_file(path) == psha
    return file_ok(path, size)

def already_filed(dated, flat, size, psha):
    """The "already on disk, just (re)publish" fast path.

    file_ok's size check (or the platform sha256) on both copies, and -- without a
    platform checksum -- the two copies must also be the same bytes. They are
    written from one buffer, so they only disagree when a run filed the archive
    but deferred the cart: a same-length new mix must not pass for published.
    """
    if not (on_disk(dated, size, psha) and on_disk(flat, size, psha)):
        return False
    return bool(psha) or sha256_file(dated) == sha256_file(flat)

def other_cart_files(code, fname, flat_dir=None):
    """Other audio files in the flat folder that name the same cart as `fname`."""
    want = _cart_no(code)
    return sorted(n for n in dir_names(flat_dir or ONAIR_FLAT).values()
                  if n.lower() != fname.lower() and _cart_no(n) == want
                  and os.path.splitext(n)[1].lower() in SCAN_AUDIO_EXT)

def warn_two_files(code, fname, run):
    if code in run["two_file"]:
        return
    others = other_cart_files(code, fname)
    if others:
        run["two_file"].add(code)
        log(f"WARN two files for cart {code}: {fname} + {', '.join(others)} "
            "-- left alone (playout/DJB may reference either)")

def new_run():
    return {"synced": [], "meta": [], "published_only": 0, "failed": 0,
            "deferred": 0, "same": 0, "two_file": set()}

# --- one drop ----------------------------------------------------------------

def fetch_audio(d, flat, slug, fname, code, ext):
    """Download one drop and prove it's playable. -> (data, kind, converted_from) or None.

    Every work file is a temp_path() beside the cart, removed on the way out.
    """
    tmp = temp_path(flat, "part")
    work = [tmp]
    try:
        # download from the PUBLIC bucket (no auth)
        dl = subprocess.run(["curl", "-sL", "--max-time", "900", "-o", tmp,
            f"{BUCKET_PUBLIC}/{d['storage_path']}"], capture_output=True, creationflags=NO_WINDOW)
        ok = dl.returncode == 0 and os.path.exists(tmp) and os.path.getsize(tmp) > 100000
        if not ok:
            log(f"FAIL download {slug}/{fname}")
            return None
        # Trust the bytes, not d["format"]. Unwrap a zipped folder if that's
        # what turned up, then refuse anything that won't decode -- a bad file
        # must never overwrite the good cart already sitting in M:\JBMusic.
        kind = sniff(tmp)
        unwrapped = False
        if kind == "zip":
            un, kind = unwrap_zip(tmp)
            if un is None:
                log(f"FAIL {slug}/{fname}: zip with no usable audio inside")
                return None
            os.remove(tmp); tmp = un; work.append(un); unwrapped = True
        if kind not in AUDIO_KINDS:
            log(f"FAIL {slug}/{fname}: bytes are '{kind}', not audio -- cart left untouched")
            return None
        if not audio_ok(tmp):
            log(f"FAIL {slug}/{fname}: failed decode check -- cart left untouched")
            return None
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
                log(f"FAIL {slug}/{code}: {kind} -> mp3 failed -- cart left untouched")
                return None
        # An unwrapped zip whose insides were already mp3 still needs reporting:
        # it tells the edge fn the real byte count (the row's size_bytes describes
        # the zip, or nothing at all) and leaves "zip" in source_format so a DJ
        # who keeps compressing their folder is obvious in the data.
        if unwrapped and converted_from is None:
            converted_from = "zip"
        if data is None:
            with open(tmp, "rb") as f:
                data = f.read()
        return data, kind, converted_from
    finally:
        for p in work:
            _remove_quietly(p)

def sync_drop(d, run):
    code = d["file_code"]; ext = (d.get("format") or "mp3").lstrip(".")
    slug = (d.get("djs") or {}).get("slug") or "_unassigned"
    slot = d.get("slot") or {}; dow = slot.get("day_of_week"); wk = d.get("week_of")
    size = d.get("size_bytes") or 0
    psha = platform_sha(d)
    fname, dated, flat = dest_paths(code, ext, slug, dow, wk)
    if already_filed(dated, flat, size, psha):
        warn_two_files(code, fname, run)
        if psha:
            log(f"  SAME sha256 {slug}/{fname}: both copies match the platform checksum -- published")
        api({"secret": SECRET, "action": "publish", "id": d["id"]}); run["published_only"] += 1
        return

    def guard():
        return on_air_guard(code, slot)

    # Archive copy already filed and the cart airing: nothing to do until it
    # stops, so don't pull an hour of audio every 5 minutes meanwhile.
    if dated is None or on_disk(dated, size, psha):
        defer, why = guard()
        if defer:
            run["deferred"] += 1; log(f"DEFER {slug}/{code}: on air now ({why})")
            return

    got = fetch_audio(d, flat, slug, fname, code, ext)
    if got is None:
        run["failed"] += 1
        return
    data, ext, converted_from = got
    fname, dated, flat = dest_paths(code, ext, slug, dow, wk)
    if psha and not converted_from and sha256_bytes(data) != psha:
        log(f"  WARN {slug}/{fname}: download's sha256 differs from the platform checksum "
            "-- filing what the bucket holds")

    # 1. the dated archive: nothing plays it directly, so no guard and no backup
    if dated:
        try:
            os.makedirs(os.path.dirname(dated), exist_ok=True)
            place_cart(data, dated, backup=False)
        except Exception as e:  # noqa: BLE001
            run["failed"] += 1
            log(f"FAIL {slug}/{fname}: archive copy not written ({e}) -- cart left untouched")
            return
    # 2. the on-air cart
    warn_two_files(code, fname, run)
    try:
        os.makedirs(os.path.dirname(flat), exist_ok=True)
        outcome, detail = place_cart(data, flat, guard=guard)
    except CartBusy as e:
        run["deferred"] += 1
        log(f"DEFER {slug}/{code}: cart in use, replace refused ({e}) -- untouched, retry next run")
        return
    except Exception as e:  # noqa: BLE001
        run["failed"] += 1
        log(f"FAIL {slug}/{fname}: cart not written ({e}) -- cart left untouched")
        return
    if outcome == "deferred":
        run["deferred"] += 1; log(f"DEFER {slug}/{code}: on air now ({detail})")
        return
    if outcome == "same":
        run["same"] += 1
        log(f"  SAME sha256 {slug}/{fname}: the cart already holds these bytes -- not rewritten")
    elif outcome == "replaced":
        log(f"  CART replaced {fname}; previous copy -> {detail}")
    else:
        log(f"  CART created {fname}")
    if converted_from:
        api({"secret": SECRET, "action": "converted", "id": d["id"],
             "from": converted_from, "size_bytes": len(data)})
    api({"secret": SECRET, "action": "publish", "id": d["id"]})
    run["synced"].append(f"{slug}/{fname} ({len(data)//1048576}MB)")
    run["meta"].append({
        "slug": slug,
        "name": (d.get("djs") or {}).get("display_name"),
        "code": code,
        "wk": wk, "dow": dow,
        "start_time": slot.get("start_time"),
    })
    log(f"OK {slug}/{fname} -> air-date folder + M:/JBMusic, published")

def main():
    lock = run_lock()
    if lock is None:
        log("BUSY previous run still going -- this one skipped")
        print("SUMMARY dj-drops: new=0 | busy (previous run still going)")
        return
    try:
        run_sync()
    finally:
        release_run_lock(lock)

def run_sync():
    res = api({"secret": SECRET, "action": "pending"})
    if not res.get("ok"):
        log(f"FATAL pending: {res.get('error')}"); print("SUMMARY dj-drops: error"); sys.exit(1)
    drops = res["drops"]
    run = new_run()
    for d in drops:
        try:
            sync_drop(d, run)
        except Exception as e:  # noqa: BLE001 -- one bad row must not end the run
            run["failed"] += 1
            log(f"FAIL {d.get('file_code')}: {type(e).__name__}: {e}")
    synced, synced_meta = run["synced"], run["meta"]

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

    log(f"DONE pending={len(drops)} new={len(synced)} already={run['published_only']} "
        f"failed={run['failed']} same={run['same']} deferred={run['deferred']} "
        f"two-file={len(run['two_file'])}")
    # machine-readable summary line for the watch task's email
    print("SUMMARY dj-drops: new=" + str(len(synced)) + " | " + ("; ".join(synced) if synced else "none")
          + f" | deferred={run['deferred']} | two-file carts={len(run['two_file'])}")

if __name__ == "__main__":
    main()
