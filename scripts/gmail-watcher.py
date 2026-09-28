#!/usr/bin/env python3
r"""
gmail-watcher — INSTANT sermon/mix sync for WCCG 104.5 FM.

Replaces the hourly Claude poll for the time-critical Sunday sermons. An
always-on local daemon talks to the Gmail API over OAuth and reacts within
~20 s of an email landing (pmb1 airs at 1:00 PM, so an hourly poll can't keep
up). It runs fully headless — no browser, no Claude app, no password.

What it does each tick:
  1. Gmail API messages.list for the known sermon senders, newer_than:2d.
  2. For every message it hasn't processed yet, download the audio HEADLESS:
       - lcc1 (Lewis Chapel)   : direct Gmail ATTACHMENT  -> attachments.get
       - pmb1 (Progressive)    : public Drive link in body -> Drive API get_media
       - thm1 (Encouraging Mmt): restricted Drive SHARE    -> Drive API get_media (+ m4a->mp3)
       - gpn1 (Grace+Nothing)  : Dropbox link              -> dl=1 download
       - dvp1 (Family Fellow.) : Dropbox link              -> dl=1 download
  3. File it to the airing Sunday's folder + copy to M:\JBMusic\DJB_520xx,
     verify byte size + audio header (and a full ffmpeg decode for safety).
  4. Self-send a Gmail summary to biggleem@gmail.com.
  5. Record the message id so it never double-syncs (idempotent state file).

DJ weekly packs sent by EMAIL (DJ_PACKS: Tony Neal's TransferNow link, Daddy
Black's Drive files, Corleone's Drive folder) land in the platform exactly like
a portal upload (owner 2026-09-25 — the hourly task that used to grab them died
~08-17): the watcher fetches every part headless, verifies it (size, mp3 header,
full ffmpeg decode), orders parts by the part number in the name (never by name
sort — Tony's names carry typos) and requires exactly parts 1..N, then ingests
each via the secret-gated studio-sync edge function (signed upload into the
dj-drops bucket + a dj_drops row, source 'email', week_of = Monday of the air
week). Studio Sync (sync-dj-drops.py) stays the ONLY writer of D:\WCCG\b-mixshows
and M:\JBMusic; this daemon writes neither for DJ packs. A pack that isn't for
the next show (late / early) or doesn't have exactly the right parts is NOT
ingested — you get a "manual look" mail instead. Other DJ_SENDERS still only
get a heads-up.

Auth (one-time): put a Desktop-app client_secret.json in the config dir and run
  python gmail-watcher.py --authorize
You click "Allow" once; a refresh token is saved to token.json. See the runbook.

Run modes:
  --authorize   one-time OAuth consent -> token.json
  --once        single check then exit (good for a cron/Task Scheduler fallback)
  --catchup     process currently-visible matches even on a fresh state file
  --status      print current state + what's visible, then exit
  --transfernow-dry-run <dl link> [--air-date MMDDYYYY]
                print the plan for a TransferNow pack (part -> cart, week_of,
                storage path) — no download, no ingest, no Gmail token needed
  --ingest-transfernow <dl link> --dj <slug> [--air-date MMDDYYYY] [--dry-run]
                one-shot: push one pack through the same ingest path by hand
  --publish-sermon <file> --church <code> --air-date YYYY-MM-DD [--dry-run]
                one-shot: put one sermon file on the church's website profile
                (public from its air time). Never touches the air carts.
  --withdraw-sermon --church <code> --air-date YYYY-MM-DD [--checksum <sha256>]
                remove a website sermon that has NOT aired yet (a wrong file, or
                the synthetic test row)
  --backfill-sermons YYYY-MM-DD [--until YYYY-MM-DD] [--dry-run]
                put every sermon in the Sunday folders since that date on the
                website (aired archive rows are never replaced; refused on
                Sundays 06:00-15:00)
  --site-dry-run
                daemon: website uploads only log what they would do
  (no flag)     run forever, polling every POLL_SECONDS

WEBSITE (owner 2026-09-28: "sermons and mixes should land in the profile of the
entity, once they air, or simultaneously"): after a sermon is synced for AIR it is
QUEUED for the church's profile page (one small local file). A background worker
uploads it through the secret-gated studio-sync "sermon" actions; the site shows it
from its air time (migration 119). The website is never on the air path: the queue
write can't raise, the worker never starts a job while a mail is being handled, and
a failure only logs and retries later. Env WCCG_SITE_PUBLISH=0 turns it off,
WCCG_SITE_DRY_RUN=1 (or --site-dry-run) makes it log only.
"""

import argparse
import base64
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import traceback
from datetime import date, datetime, time as dtime, timedelta
from email.message import EmailMessage
from urllib.parse import urlsplit

import requests  # already a hard dependency of google.auth.transport.requests

import studio_sync_secret  # studio-sync edge fn URL + shared-secret lookup (never a literal here)

from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
CONFIG_DIR = os.environ.get("WCCG_GMAIL_DIR", r"C:\Users\wccg1\.wccg-gmail-watcher")
CLIENT_SECRET = os.path.join(CONFIG_DIR, "client_secret.json")
TOKEN_FILE = os.path.join(CONFIG_DIR, "token.json")
STATE_FILE = os.path.join(CONFIG_DIR, "state.json")

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.readonly",
]

SERMON_ROOT = r"D:\WCCG\f-programming - 50000 - 89999\a-dayparts (70000)\j-sun-am - (gospel)"
ONAIR_FLAT = r"M:\JBMusic"
FFMPEG = r"C:\Program Files\Nickvision Parabolic\Release\ffmpeg.exe"
FFPROBE = os.path.join(os.path.dirname(FFMPEG), "ffprobe.exe")
LOG = r"D:\WCCG\sync-logs\gmail-watcher.log"
NOTIFY_TO = "biggleem@gmail.com"

POLL_SECONDS = int(os.environ.get("WCCG_POLL_SECONDS", "20"))

# Child processes (curl / ffmpeg) must never open a console: the watcher runs under
# pythonw, which has no console of its own, so a spawn without this flag creates a
# fresh visible terminal window on the operator's desktop — once per retry tick.
NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
# The website's transcode must never compete with the air path's own ffmpeg checks.
BELOW_NORMAL = getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0)

# Website copy of each synced sermon (see the module docstring). The queue lives in
# CONFIG_DIR\site-queue (one JSON per church+Sunday); dirs are derived from
# CONFIG_DIR at call time so a test/sandbox CONFIG_DIR is honoured.
SITE_PUBLISH = os.environ.get("WCCG_SITE_PUBLISH", "1") != "0"
SITE_DRY_RUN = os.environ.get("WCCG_SITE_DRY_RUN") == "1"
SITE_BACKOFF_MINUTES = (2, 5, 15, 30, 60)   # then every 60 min
SITE_GIVE_UP_DAYS = 14
SITE_WORKER_SECONDS = 30
SITE_WEB_BITRATE = "192k"                   # WAV/m4a sermons become this mp3 for the web
AIR_BUSY = threading.Event()                # set while the main loop handles a mail

# sender-key (addr or domain, matched as substring of the From header) -> sermon spec
# deadline_hour: on the airing Sunday, once this local hour passes, a still-failing
# message is retired (the slot already played) and the watcher just waits for next
# week's email — owner decision 2026-07-05 after the pmb1 link-less-chip week.
SERMONS = {
    "vesax86@gmail.com":                  dict(code="pmb1", djb="DJB_52011", ext="mp3", kind="drive",       transcode=False, church="Progressive",          air="1:00 PM", deadline_hour=13),  # WAV bytes, but the on-air cart RadioSpider plays is DJB_52011.mp3
    "lewischapel.org":                    dict(code="lcc1", djb="DJB_52014", ext="mp3", kind="attachment",  transcode=False, church="Lewis Chapel",         air="2-3 PM",  deadline_hour=15),
    "mondselite27@yahoo.com":             dict(code="gpn1", djb="DJB_52002", ext="mp3", kind="dropbox",     transcode=False, church="Grace Plus Nothing",   air="AM",      deadline_hour=13),
    "ffwcaudio@gmail.com":                dict(code="dvp1", djb="DJB_52008", ext="mp3", kind="dropbox",     transcode=False, church="Family Fellowship",    air="AM",      deadline_hour=13),
    "drive-shares-dm-noreply@google.com": dict(code="thm1", djb="DJB_52005", ext="mp3", kind="drive_share", transcode=True,  church="Encouraging Moment",   air="~9 AM",   deadline_hour=13, sharer="tony haire"),
}

# DJ-mix senders: detect + notify only. A sender that also has a DJ_PACKS entry
# below is handled by the pack path instead (download + ingest, no heads-up).
DJ_SENDERS = {
    "djdaddyblack005@gmail.com": "DJ Daddy Black (Fri 12-2 PM)",
    "tnealmusic@gmail.com":      "DJ Tony Neal (Sat 10 PM-12 AM)",
    "cjgarris3@hotmail.com":     "DJ Corleone (Sun 5 PM)",
}

# DJs whose weekly mix arrives by EMAIL -> ingested into the platform like a portal
# upload (studio-sync "ingest"/"ingested"); Studio Sync files it to air. Part N of
# the aired set goes to carts[N-1]; slug/carts must match the DJ's ACTIVE dj_slots
# row (the edge fn refuses anything else). air_weekday: Mon=0..Sun=6 (Python).
#   source "transfernow" : TransferNow /dl/ link(s) in the body, read without a browser
#   source "drive_files" : one Drive file link per part in the body
#   source "drive_folder": a Drive folder link whose files are named DJB_<code>.mp3
# Adding a DJ = one entry here.
DJ_PACKS = {
    "tnealmusic@gmail.com": dict(
        dj="DJ Tony Neal", slug="dj-tony-neal", source="transfernow",
        carts=["DJB_76097", "DJB_76098", "DJB_76099", "DJB_76100"],  # 10 PM hour = parts 1-2, 11 PM = 3-4
        air_weekday=5, show_start=(22, 0),                           # Sat 10 PM-12 AM
        set_prefix="hh",   # only the Hip Hop set airs; his R&B set ("rnb...") is listed, never fetched
        part_re=r",\s*(\d{1,2})\s*(?:\(|\.[A-Za-z0-9]{2,4}$)",      # "hh9-26, 1 (26).mp3" -> 1
    ),
    "djdaddyblack005@gmail.com": dict(
        dj="DJ Daddy Black", slug="dj-daddy-black", source="drive_files",
        carts=["DJB_76075", "DJB_76076"], air_weekday=4, show_start=(12, 0),  # Fri 12-2 PM
        part_re=r"^DjDBM\s*(\d)",                                     # "DjDBM1 05-15-26.mp3" -> 1
    ),
    "cjgarris3@hotmail.com": dict(
        dj="DJ Corleone", slug="dj-corleone", source="drive_folder",
        carts=["DJB_75093", "DJB_75094"], air_weekday=6, show_start=(17, 0),  # Sun 5 PM
        code_in_name=True,      # his folder holds DJB_75093.mp3 + DJB_75094.mp3
        subject_must="wccg",    # the same address also sends his ChoiceFM shows
    ),
}
PACK_LEAD_MINUTES = 5           # a pack must be ingested this long before its show starts
PACK_RETRY_MINUTES = 15         # back-off between attempts after a transient pack failure
PACK_SUNDAY_HOLD_UNTIL = 13     # never start a pack download on Sunday before pmb1's 1 PM air
DOWNLOAD_MAX_SECONDS = 20 * 60  # per file; a trickling download must not stall the sermon loop
TN_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
         "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")

ALL_SENDERS = list(dict.fromkeys(list(SERMONS.keys()) + list(DJ_SENDERS.keys()) + list(DJ_PACKS.keys())))
GMAIL_QUERY = "(" + " OR ".join(f"from:{s}" for s in ALL_SENDERS) + ") newer_than:2d"


# --------------------------------------------------------------------------- #
# Small utilities
# --------------------------------------------------------------------------- #
def log(msg):
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line, flush=True)
    try:
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def load_state():
    if os.path.exists(STATE_FILE):
        try:
            return json.load(open(STATE_FILE, encoding="utf-8"))
        except Exception:
            pass
    return {"processed": [], "seeded": False}


def save_state(state):
    state["processed"] = state["processed"][-500:]  # keep it bounded
    # drop notify-guard entries older than a week (their retry window is long gone)
    cutoff = (datetime.now() - timedelta(days=7)).isoformat()
    state["fail_notified"] = {k: v for k, v in state.get("fail_notified", {}).items() if v >= cutoff}
    state["pack_retry"] = {k: v for k, v in state.get("pack_retry", {}).items() if v.get("first", "") >= cutoff}
    packs = state.get("dj_packs", {})
    if len(packs) > 200:  # one entry per handled pack (TransferNow transferId / Drive file set)
        state["dj_packs"] = dict(sorted(packs.items(), key=lambda kv: kv[1].get("at", ""))[-200:])
    os.makedirs(CONFIG_DIR, exist_ok=True)
    json.dump(state, open(STATE_FILE, "w", encoding="utf-8"), indent=2)


def this_sunday(today=None):
    """The Sunday a sermon airs: today if it's Sunday, else the upcoming Sunday."""
    today = today or datetime.now().date()
    return today + timedelta(days=(6 - today.weekday()) % 7)  # Mon=0..Sun=6


def sunday_folder(d):
    return os.path.join(SERMON_ROOT, f"{d:%Y}", f"sunday {d:%m%d%y}")


def audio_header_ok(path, ext):
    try:
        b = open(path, "rb").read(12)
    except Exception:
        return False
    # Accept mp3 (ID3 / MPEG frame sync) OR RIFF/WAV. pmb1 is "WAV-content-as-.mp3"
    # so a .mp3-named cart legitimately holds WAV bytes. (m4a/ftyp is intentionally
    # NOT accepted here — it's caught by the transcode path in stage_sermon.)
    return b[:3] == b"ID3" or b[0:1] == b"\xff" or b[:4] == b"RIFF"


def ffmpeg_intact(path):
    """Full decode; exit 0 with no errors == complete, untruncated audio."""
    try:
        r = subprocess.run([FFMPEG, "-v", "error", "-i", path, "-f", "null", "-"],
                           capture_output=True, timeout=300, creationflags=NO_WINDOW)
        return r.returncode == 0 and not r.stderr.strip()
    except Exception as e:
        log(f"    ffmpeg check failed: {e}")
        return False


# --------------------------------------------------------------------------- #
# OAuth
# --------------------------------------------------------------------------- #
def authorize():
    if not os.path.exists(CLIENT_SECRET):
        log(f"FATAL: missing {CLIENT_SECRET}. Download the Desktop OAuth client first (see runbook).")
        sys.exit(1)
    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET, SCOPES)
    creds = flow.run_local_server(port=0, prompt="consent", access_type="offline",
                                  open_browser=False,
                                  authorization_prompt_message="AUTHURL {url}")
    os.makedirs(CONFIG_DIR, exist_ok=True)
    open(TOKEN_FILE, "w", encoding="utf-8").write(creds.to_json())
    log(f"Authorized. Refresh token saved to {TOKEN_FILE}")
    return creds


def get_creds():
    if not os.path.exists(TOKEN_FILE):
        log(f"FATAL: no {TOKEN_FILE}. Run:  python gmail-watcher.py --authorize")
        sys.exit(1)
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            open(TOKEN_FILE, "w", encoding="utf-8").write(creds.to_json())
        else:
            log("FATAL: token invalid and not refreshable. Re-run --authorize.")
            sys.exit(1)
    return creds


# --------------------------------------------------------------------------- #
# Gmail / Drive helpers
# --------------------------------------------------------------------------- #
def header(msg, name):
    for h in msg.get("payload", {}).get("headers", []):
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def walk_parts(payload):
    yield payload
    for p in payload.get("parts", []) or []:
        yield from walk_parts(p)


def body_text(msg):
    chunks = []
    for p in walk_parts(msg.get("payload", {})):
        if p.get("mimeType", "").startswith("text/"):
            data = p.get("body", {}).get("data")
            if data:
                try:
                    chunks.append(base64.urlsafe_b64decode(data).decode("utf-8", "replace"))
                except Exception:
                    pass
    return "\n".join(chunks)


def find_attachment(msg, exts=(".mp3", ".m4a", ".wav", ".aac")):
    for p in walk_parts(msg.get("payload", {})):
        fn = (p.get("filename") or "").lower()
        aid = p.get("body", {}).get("attachmentId")
        if aid and fn.endswith(exts):
            return p["filename"], aid
    return None, None


DRIVE_ID_RES = [
    re.compile(r"drive\.google\.com/file/d/([-\w]{20,})"),
    re.compile(r"[?&]id=([-\w]{20,})"),
    re.compile(r"drive\.google\.com/open\?id=([-\w]{20,})"),
    re.compile(r"docs\.google\.com/[^/]+/d/([-\w]{20,})"),
]
DROPBOX_RE = re.compile(r"https://www\.dropbox\.com/[^\s\"'<>\)]+")


def extract_drive_id(text):
    for rx in DRIVE_ID_RES:
        m = rx.search(text)
        if m:
            return m.group(1)
    return None


AUDIO_NAME_RE = re.compile(r"([^\r\n\"'<>/\\]+?\.(?:wav|mp3|m4a|aac))", re.I)


def drive_search_by_name(drive, text, frm):
    """Fallback for a LINK-LESS Gmail Drive chip (pmb1 2026-07-05): the sender hit
    Send before the Drive attach finished, so the email has no file id anywhere —
    not in the API body, raw MIME, or print view — and the chip is dead even in the
    Gmail UI. The body still NAMES the file, so search Drive for it by name each
    retry: the moment the sender shares it (or re-uploads it link-public) this
    finds it and the sermon auto-syncs without a resend landing a new email."""
    for name in dict.fromkeys(AUDIO_NAME_RE.findall(text)):
        safe = name.strip().replace("'", r"\'")
        try:
            res = drive.files().list(
                q=f"name = '{safe}'", pageSize=10,
                fields="files(id,name,size,owners(emailAddress))").execute()
        except Exception as e:
            log(f"    Drive name-search failed: {e}")
            continue
        cands = res.get("files", [])
        # prefer a file owned by the sender of the email
        cands.sort(key=lambda f: 0 if any((o.get("emailAddress") or "").lower() in frm
                                          for o in f.get("owners", [])) else 1)
        if cands:
            f = cands[0]
            log(f"    Drive fallback matched by name: {f['name']} ({f['id']}, {f.get('size', '?')} bytes)")
            return f["id"]
    return None


def extract_dropbox(text):
    m = DROPBOX_RE.search(text)
    if not m:
        return None
    url = m.group(0).rstrip(".,)>")
    if "dl=0" in url:
        url = url.replace("dl=0", "dl=1")
    elif "dl=1" not in url:
        url += ("&" if "?" in url else "?") + "dl=1"
    return url


# OneDrive share links (Progressive, since 2026-09-13: "The link I sent is from my
# personal OneDrive account"). 1drv.ms redirects to onedrive.live.com's SharePoint
# view; the old anonymous api.onedrive.com/v1.0/shares endpoint now answers 401, and
# plain curl is refused 403 ("The request is blocked"). A browser User-Agent plus a
# cookie jar and download=1 gets the file itself (206 audio/wav, measured 2026-09-27).
ONEDRIVE_RE = re.compile(r"https://(?:1drv\.ms|onedrive\.live\.com)/[^\s\"'<>\)\]]+")
BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")


def extract_onedrive(text):
    m = ONEDRIVE_RE.search(text)
    if not m:
        return None
    url = m.group(0).rstrip(".,)>")
    if "download=1" not in url:
        url += ("&" if "?" in url else "?") + "download=1"
    return url


def onedrive_bytes(url):
    """Download a OneDrive share link headless; None unless the bytes are audio."""
    tmp = os.path.join(CONFIG_DIR, "_od.part")
    jar = os.path.join(CONFIG_DIR, "_od.cookies")
    try:
        r = subprocess.run(["curl", "-sL", "--max-time", "900", "-A", BROWSER_UA,
                            "-c", jar, "-b", jar, "-o", tmp, url],
                           capture_output=True, creationflags=NO_WINDOW)
        if r.returncode != 0 or not os.path.exists(tmp):
            return None
        with open(tmp, "rb") as fh:
            data = fh.read()
    finally:
        for p in (tmp, jar):
            try:
                os.remove(p)
            except Exception:
                pass
    # An HTML sign-in/blocked page is small and starts with "<"; audio starts with
    # RIFF / ID3 / MPEG sync, or an ISO-BMFF 'ftyp' box (m4a, transcoded later).
    audio = data[:4] == b"RIFF" or data[:3] == b"ID3" or data[:1] == b"\xff" or data[4:8] == b"ftyp"
    if not audio:
        log(f"    OneDrive returned {len(data)} bytes that are not audio")
        return None
    return data


def gmail_attachment_bytes(gmail, mid, aid):
    att = gmail.users().messages().attachments().get(userId="me", messageId=mid, id=aid).execute()
    return base64.urlsafe_b64decode(att["data"])


def drive_bytes(drive, fid):
    req = drive.files().get_media(fileId=fid)
    fh = io.BytesIO()
    dl = MediaIoBaseDownload(fh, req, chunksize=8 * 1024 * 1024)
    done = False
    while not done:
        _, done = dl.next_chunk()
    return fh.getvalue()


def curl_bytes(url):
    tmp = os.path.join(CONFIG_DIR, "_dl.part")
    r = subprocess.run(["curl", "-sL", "--max-time", "900", "-o", tmp, url], capture_output=True,
                       creationflags=NO_WINDOW)
    if r.returncode != 0 or not os.path.exists(tmp):
        return None
    data = open(tmp, "rb").read()
    os.remove(tmp)
    return data


def send_mail(gmail, subject, body):
    try:
        m = EmailMessage()
        m["To"] = NOTIFY_TO
        m["From"] = NOTIFY_TO
        m["Subject"] = subject
        m.set_content(body)
        raw = base64.urlsafe_b64encode(m.as_bytes()).decode()
        gmail.users().messages().send(userId="me", body={"raw": raw}).execute()
        log(f"    notified {NOTIFY_TO}: {subject}")
    except Exception as e:
        log(f"    notify FAILED: {e}")


# --------------------------------------------------------------------------- #
# Core: process one sermon message
# --------------------------------------------------------------------------- #
def fetch_audio(gmail, drive, msg, spec):
    """Return raw audio bytes for a sermon message, headless, or None."""
    kind = spec["kind"]
    if kind == "attachment":
        fn, aid = find_attachment(msg)
        if aid:
            log(f"    attachment: {fn}")
            return gmail_attachment_bytes(gmail, msg["id"], aid)
        # Some weeks the church sends a Drive/Dropbox LINK instead of an attachment
        # (e.g. Lewis Chapel 2026-06-21). Fall back to that so it doesn't loop.
        log("    no audio attachment — checking body for a Drive/Dropbox link")
        text = body_text(msg)
        fid = extract_drive_id(text)
        if fid:
            log(f"    Drive id: {fid}")
            try:
                return drive_bytes(drive, fid)
            except Exception as e:
                log(f"    Drive get_media failed ({e})")
        url = extract_dropbox(text)
        if url:
            log("    Dropbox link found")
            return curl_bytes(url)
        od = extract_onedrive(text)
        if od:
            log("    OneDrive link found")
            data = onedrive_bytes(od)
            if data:
                return data
        fid = drive_search_by_name(drive, text, header(msg, "From").lower())
        if fid:
            try:
                return drive_bytes(drive, fid)
            except Exception as e:
                log(f"    Drive get_media failed ({e})")
        log("    no audio attachment and no Drive/Dropbox link found"); return None

    text = body_text(msg)
    if kind in ("drive", "drive_share"):
        fid = extract_drive_id(text)
        if not fid:
            od = extract_onedrive(text)
            if od:
                log("    no Drive id — OneDrive link found")
                data = onedrive_bytes(od)
                if data:
                    return data
                log("    OneDrive download failed")
            log("    no Drive id in body (link-less chip?) — trying Drive search by filename")
            fid = drive_search_by_name(drive, text, header(msg, "From").lower())
        if not fid:
            log("    no Drive id in body and no filename match in Drive"); return None
        log(f"    Drive id: {fid}")
        try:
            return drive_bytes(drive, fid)
        except Exception as e:
            log(f"    Drive API get_media failed ({e}); trying anonymous")
            return curl_bytes(f"https://drive.google.com/uc?export=download&id={fid}&confirm=t")

    if kind == "dropbox":
        url = extract_dropbox(text)
        if not url:
            od = extract_onedrive(text)
            if od:
                log("    no Dropbox link — OneDrive link found")
                return onedrive_bytes(od)
            log("    no Dropbox link in body"); return None
        log("    Dropbox link found")
        return curl_bytes(url)

    return None


def stage_sermon(data, spec, sun=None):
    """Write the bytes to the Sunday folder + M:\\JBMusic, transcoding thm1. Returns (ok, note)."""
    sun = sun or this_sunday()
    folder = sunday_folder(sun)
    os.makedirs(folder, exist_ok=True)
    code, ext, djb = spec["code"], spec["ext"], spec["djb"]
    dest_sermon = os.path.join(folder, f"{code}.{ext}")
    dest_flat = os.path.join(ONAIR_FLAT, f"{djb}.{ext}")

    # Transcode to a real mp3 when configured (thm1 is always AAC/m4a) OR when an
    # mp3-expected sermon actually arrives as AAC/m4a — detected by the ISO-BMFF
    # 'ftyp' box at offset 4. This self-heals a church that normally emails mp3
    # but sends an m4a one week (e.g. dvp1 / Family Fellowship, 2026-06-21),
    # which otherwise fails the mp3 header check and crash-loops.
    arrived_m4a = len(data) >= 12 and data[4:8] == b"ftyp"
    if spec["transcode"] or (ext == "mp3" and arrived_m4a):
        if arrived_m4a and not spec["transcode"]:
            log(f"    {code} arrived as AAC/m4a (expected mp3) — transcoding to mp3")
        raw = os.path.join(CONFIG_DIR, f"_{code}_in.bin")
        open(raw, "wb").write(data)
        r = subprocess.run([FFMPEG, "-y", "-i", raw, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", dest_sermon],
                           capture_output=True, timeout=600, creationflags=NO_WINDOW)
        try:
            os.remove(raw)
        except Exception:
            pass
        if r.returncode != 0 or not os.path.exists(dest_sermon):
            return False, "ffmpeg transcode failed"
    else:
        open(dest_sermon, "wb").write(data)

    # On validation failure REMOVE the staged file: RadioSpider's mtSun FILE COPY
    # events read this folder, so a leftover non-audio pmb1.mp3 would get staged
    # toward air next weekend.
    if not audio_header_ok(dest_sermon, ext):
        try:
            os.remove(dest_sermon)
        except Exception:
            pass
        return False, f"bad audio header for {os.path.basename(dest_sermon)}"
    if ext != "wav" and not ffmpeg_intact(dest_sermon):
        try:
            os.remove(dest_sermon)
        except Exception:
            pass
        return False, "ffmpeg full-decode reported errors (possibly truncated)"

    # copy the staged sermon to the flat M:\JBMusic slot (same bytes on disk)
    import shutil
    shutil.copy2(dest_sermon, dest_flat)
    sz = os.path.getsize(dest_sermon)
    if os.path.getsize(dest_flat) != sz:
        return False, "M:/JBMusic copy size mismatch"
    note = (f"{code} ({spec['church']}) -> {folder.replace(chr(92),'/')}/{code}.{ext}"
            f" + {ONAIR_FLAT.replace(chr(92),'/')}/{djb}.{ext}  ({sz/1048576:.1f} MB)")
    return True, note


def handle_message(gmail, drive, mid, state):
    rt = state.get("pack_retry", {}).get(mid)
    if rt and datetime.now().isoformat() < rt.get("next", ""):
        return  # DJ pack backing off after a transient failure — don't even refetch the mail
    msg = gmail.users().messages().get(userId="me", id=mid, format="full").execute()
    frm = header(msg, "From").lower()
    subj = header(msg, "Subject")

    # DJ who emails a weekly pack? fetch + verify + ingest it (Studio Sync files it to air)
    pack_spec = next((v for k, v in DJ_PACKS.items() if k in frm), None)
    if pack_spec:
        handle_dj_pack(gmail, drive, msg, mid, pack_spec, state)
        return

    # other DJ mix sender? notify only
    for key, who in DJ_SENDERS.items():
        if key in frm:
            log(f"  DJ mail from {who}: \"{subj}\" -> notify (download via hourly task)")
            send_mail(gmail, f"DJ mix arrived: {who}",
                      f"{who} just emailed: \"{subj}\".\n\nThe hourly task / sync-dj-drops will pull it. "
                      f"If it's a TransferNow/Drive-folder pack, it may need a manual grab.")
            state["processed"].append(mid)
            return

    # sermon sender?
    spec = next((v for k, v in SERMONS.items() if k in frm), None)
    if not spec:
        state["processed"].append(mid)  # matched query but unknown — skip quietly
        return

    # The Drive-share address (drive-shares-dm-noreply@google.com) is used by BOTH the
    # sermon provider AND DJs (e.g. DJ VI shares his weekly mix the same way). Only stage
    # as the sermon when the actual sharer matches; otherwise it's a DJ/other mix —
    # notify and skip so it never clobbers the sermon cart.
    if spec.get("sharer") and spec["sharer"] not in frm:
        raw_from = header(msg, "From")
        log(f"  Drive share \"{subj}\" is from {raw_from}, not the {spec['code']} "
            f"sermon sharer ({spec['sharer']}) — notifying, NOT staging as sermon")
        send_mail(gmail, f"DJ/Drive mix shared (not a sermon): {subj}",
                  f"A Google Drive share arrived from {raw_from}: \"{subj}\".\n\n"
                  f"It is NOT the {spec['church']} ({spec['code']}) sermon, so the sermon cart "
                  f"{spec['djb']}.{spec['ext']} was left untouched. If this is a DJ mix, pull it "
                  f"to that DJ's b-mixshows folder / on-air cart.")
        state["processed"].append(mid)
        return

    log(f"  SERMON {spec['code']} from {frm} airs {spec['air']}: \"{subj}\"")
    try:
        data = fetch_audio(gmail, drive, msg, spec)
    except Exception as e:
        log(f"    fetch error: {e}")
        data = None
    # Notify AT MOST ONCE per message id — the retry loop runs every POLL_SECONDS,
    # and a permanent failure (e.g. the 2026-07-05 pmb1 link-less Drive chip) used
    # to email an identical alert on every tick (~180/hour) until fixed.
    notified = state.setdefault("fail_notified", {})

    # Weekly timeout, shared by EVERY failure mode (no data, tiny data, staging
    # rejected the bytes): once the airing Sunday's deadline hour has passed, the
    # slot already played — retire the message (mark processed) and wait for next
    # week's email. A proper re-send from the church is a NEW message id, so it
    # still syncs even after this one is retired. The deadline is anchored to the
    # Sunday THIS MESSAGE was aiming at (from its arrival time) and fires on any
    # later day too — the old `now.date() == this_sunday()` check could only ever
    # be true on a Sunday, so a failure surviving past midnight retried forever.
    def retire_if_past_deadline():
        dl = spec.get("deadline_hour")
        if dl is None:
            return False
        now = datetime.now()
        try:
            msg_date = datetime.fromtimestamp(int(msg["internalDate"]) / 1000).date()
        except Exception:
            msg_date = now.date()
        air_sunday = this_sunday(msg_date)
        if now.date() < air_sunday or (now.date() == air_sunday and now.hour < dl):
            return False
        log(f"    past the Sunday {air_sunday:%m/%d} {dl}:00 air deadline — retiring this message; waiting for next week's email")
        send_mail(gmail, f"Sermon {spec['code']} NOT synced this week — waiting for next week",
                  f"{spec['church']} ({spec['code']}) emailed \"{subj}\" but no usable file became reachable "
                  f"by the Sunday {dl}:00 air deadline, so the watcher gave up on this message. The cart "
                  f"M:/JBMusic/{spec['djb']}.{spec['ext']} keeps last week's sermon.\n\n"
                  f"Polling continues as normal — next week's email (or a re-send with a working link this "
                  f"week) will sync automatically.")
        state["processed"].append(mid)
        notified.pop(mid, None)
        return True

    if not data or len(data) < 200000:
        if retire_if_past_deadline():
            return
        log(f"    download failed/too small ({len(data) if data else 0} bytes) — retrying every tick, silently (not marking processed)")
        if mid not in notified:
            send_mail(gmail, f"Sermon {spec['code']} arrived but auto-download FAILED",
                      f"{spec['church']} ({spec['code']}, airs {spec['air']}) emailed \"{subj}\" but the headless "
                      f"download failed — no reachable file link/attachment was found (or the download errored).\n\n"
                      f"If the email shows a Google Drive chip that does nothing when clicked, the sender hit Send "
                      f"before the Drive attach finished — nobody can open it, so ask them to re-send it "
                      f"(Drive link set to 'Anyone with the link', or share the file to {NOTIFY_TO}).\n\n"
                      f"The watcher keeps retrying quietly and will auto-sync to M:/JBMusic/{spec['djb']}.{spec['ext']} "
                      f"the moment the file becomes reachable (it also searches Drive for the filename named in the "
                      f"email). This is the only alert you'll get for this message.")
            notified[mid] = datetime.now().isoformat()
        return  # don't mark processed -> retried next tick

    sd = this_sunday()
    ok, note = stage_sermon(data, spec, sd)
    if ok:
        log(f"    SYNCED {note}")
        # Website AFTER air: queue only (one local file, cannot raise); the site
        # worker uploads it on its own thread once no mail is being handled.
        queued = queue_site_publish(spec["code"], sd,
                                    os.path.join(sunday_folder(sd), f"{spec['code']}.{spec['ext']}"))
        send_mail(gmail, f"{spec['code']} ({spec['church']}) synced for Sun {sd.month}/{sd.day} air",
                  f"Auto-synced the moment it arrived.\n{note}\nAirs {spec['air']} this Sunday."
                  + ("\nWebsite: queued for the church's profile page (public from its air time)."
                     if queued else ""))
        state["processed"].append(mid)
        notified.pop(mid, None)
    else:
        log(f"    STAGE FAILED: {note} — not marking processed")
        if retire_if_past_deadline():
            return
        if mid not in notified:
            send_mail(gmail, f"Sermon {spec['code']} download OK but staging failed",
                      f"{spec['church']} ({spec['code']}): {note}. Needs a look. "
                      f"(Retrying quietly — this is the only alert for this message.)")
            notified[mid] = datetime.now().isoformat()


# --------------------------------------------------------------------------- #
# DJ weekly packs -> platform ingest (Studio Sync files them to air)
# --------------------------------------------------------------------------- #
class PackError(Exception):
    """Can't be automated (expired link, wrong parts, bad audio, unknown code) — a human looks."""


class PackRetry(Exception):
    """Transient (network, short download, API 5xx) — retried after PACK_RETRY_MINUTES."""


AUDIO_EXTS = (".mp3", ".wav", ".m4a", ".aiff", ".aif", ".flac")


def base_name(name):
    """Last path component — TransferNow names carry the pack folder ("hh9-26 (26)/...")."""
    return (name or "").replace("\\", "/").split("/")[-1].strip()


def safe_name(name):
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", base_name(name)).rstrip(" .") or "part"


def pack_in_set(name, spec):
    """Is this file part of the AIRED set? Tony's packs can hold a Hip Hop set
    ("hh9-26, 1 (26).mp3") next to an R&B set ("rnb9-19, 3 (26).mp3"); only hh airs."""
    b = base_name(name).lower()
    return b.endswith(AUDIO_EXTS) and b.startswith((spec.get("set_prefix") or "").lower())


def pack_part_number(name, spec):
    """1-based part number, or None. Tony's names carry typos ("hh9=26, 3 (26).mp3",
    "hh9-29, 4 (26).mp3"), so the number after the comma is the ONLY ordering key —
    never sort by name. A DJ whose files are already named by cart (Corleone:
    DJB_75093.mp3) maps the code to its position in carts."""
    b = base_name(name)
    if spec.get("code_in_name"):
        m = re.search(r"DJB_?(\d{5})", b, re.I)
        code = f"DJB_{m.group(1)}" if m else None
        return spec["carts"].index(code) + 1 if code in spec["carts"] else None
    m = re.search(spec["part_re"], b, re.I)
    return int(m.group(1)) if m else None


def plan_pack(entries, spec):
    """Pure: split a pack's files into ({part: entry} for the aired set, others, problem).
    problem is None only when the set is exactly parts 1..len(carts), one .mp3 each
    (or when the pack has no aired-set files at all: parts == {})."""
    want = list(range(1, len(spec["carts"]) + 1))
    parts, others, seen, odd = {}, [], [], []
    for e in entries:
        if not pack_in_set(e["name"], spec):
            others.append(e)
            continue
        n = pack_part_number(e["name"], spec)
        if n is None or not base_name(e["name"]).lower().endswith(".mp3"):
            odd.append(base_name(e["name"]))
            continue
        seen.append(n)
        parts[n] = e
    problem = None
    if (seen or odd) and (odd or sorted(seen) != want):
        problem = (f"aired-set parts found {sorted(seen)}" + (f", unusable {odd}" if odd else "")
                   + f" - need exactly {want} (one .mp3 each)")
    return parts, others, problem


# "week of 9/26/26", "week of 7-25", "week of 7//18/26" (sic) ...
WEEK_OF_RE = re.compile(r"week\s+of\s+(\d{1,2})\s*[/.\-]+\s*(\d{1,2})(?:\s*[/.\-]+\s*(\d{2,4}))?", re.I)
# ... else any free-standing date: "Friday Mixes 05-15-26", "WCCG 6/21/26 MIXSHOW"
# (not the "8-29" inside "rnb8-29, 1 (26)", nor "104.5").
SUBJECT_DATE_RE = re.compile(r"(?<![\w/.\-])(\d{1,2})\s*[/.\-]+\s*(\d{1,2})(?:\s*[/.\-]+\s*(\d{2,4}))?(?!\w)")


def parse_subject_date(subject, ref):
    """The show date a DJ wrote in the subject, or None. No year -> the one nearest ref."""
    subject = subject or ""
    m = WEEK_OF_RE.search(subject) or SUBJECT_DATE_RE.search(subject)
    if not m:
        return None
    mo, dy, yr = int(m.group(1)), int(m.group(2)), m.group(3)
    years = [int(yr) + (2000 if len(yr) <= 2 else 0)] if yr else [ref.year - 1, ref.year, ref.year + 1]
    cands = []
    for y in years:
        try:
            cands.append(date(y, mo, dy))
        except ValueError:
            pass
    return min(cands, key=lambda d: abs((d - ref).days)) if cands else None


def next_show_date(now, spec):
    """Air date of the DJ's next show a pack can still make: it must start more than
    PACK_LEAD_MINUTES from now (Studio Sync needs a pass to file it before air)."""
    wd = spec["air_weekday"]
    d = now.date() + timedelta(days=(wd - now.weekday()) % 7)
    if now >= datetime.combine(d, dtime(*spec["show_start"])) - timedelta(minutes=PACK_LEAD_MINUTES):
        d += timedelta(days=7)
    return d


def pack_air_date(subject, msg_dt, spec):
    """(air date, why). A show-day date in the subject wins (Tony "The week of 9/26/26"
    = Sat 9/26); else the next show after the email arrived. A subject date that is not
    a show day (Tony wrote "week of 9/13/26" — a Sunday — for the Sat 9/12 show) or is
    more than 14 days off the email (typo'd year) is ignored."""
    named = parse_subject_date(subject, msg_dt.date())
    if named and named.weekday() == spec["air_weekday"] and abs((named - msg_dt.date()).days) <= 14:
        return named, f"subject date {named.month}/{named.day}/{named:%y}"
    why = "next show after the email"
    if named:
        why += f" (subject's {named:%a} {named.month}/{named.day}/{named:%y} is not a show day)"
    return next_show_date(msg_dt, spec), why


def ingest_timing(air, now, spec):
    """'ok' when air is the next show a pack can still make. 'late' when that show has
    started (or is < PACK_LEAD_MINUTES off) — Studio Sync would swap carts mid-show.
    'early' when a nearer show hasn't aired yet — ingesting now would overwrite ITS
    carts, because Studio Sync copies every new drop straight to M:\\JBMusic."""
    nxt = next_show_date(now, spec)
    return "ok" if air == nxt else ("late" if air < nxt else "early")


def week_of_for(air):
    """dj_drops.week_of = ISO Monday of the air week — the portal's isoMondayOfNow();
    sync-dj-drops.air_date() maps it back with the slot's day_of_week (Sun = +6)."""
    return (air - timedelta(days=air.weekday())).isoformat()


def storage_path_for(slug, week_of, code, fmt="mp3"):
    """Mirror of the portal's uploadFile() path; the edge fn computes the real one."""
    return f"{slug}/{week_of}/{code}.{fmt}"


def ingest_payload(spec, code, week_of, size, sha256, action="ingest"):
    """Body for studio-sync ingest/ingested, WITHOUT the secret (added at send time)."""
    return {"action": action, "dj_slug": spec["slug"], "file_code": code, "week_of": week_of,
            "size_bytes": int(size), "format": "mp3", "checksum_sha256": sha256.lower(),
            "source": "email"}


def ingest_needed(existing, sha256, storage_path):
    """False when the dj_drops row already holds these exact bytes at this path (a
    re-sent link or a re-run) — the part-level idempotence check."""
    if not existing:
        return True
    return not ((existing.get("checksum_sha256") or "").lower() == sha256.lower()
                and existing.get("storage_path") == storage_path
                and existing.get("status") in ("uploaded", "validated", "published"))


TN_LINK_RE = re.compile(r"https?://[\w.-]*transfernow\.net/(?:[a-z]{2}/)?dl/[^\s\"'<>()\[\]]+", re.I)
DRIVE_FILE_RE = re.compile(r"drive\.google\.com/(?:file/d/|open\?id=)([-\w]{20,})")
DRIVE_FOLDER_RE = re.compile(r"drive\.google\.com/drive/(?:u/\d+/)?folders/([-\w]{20,})")


def extract_transfernow_links(text):
    """Unique TransferNow /dl/ links in a mail body (plain + html), in order."""
    out = []
    for m in TN_LINK_RE.finditer(text or ""):
        u = urlsplit(m.group(0).replace("&amp;", "&").rstrip(".,;:!>"))
        norm = f"https://{u.netloc.lower()}{u.path.rstrip('/')}"
        if norm not in out:
            out.append(norm)
    return out


def tn_slug(url):
    slug = urlsplit(url).path.split("/dl/", 1)[-1].strip("/")
    return re.sub(r"[^\w.-]+", "_", slug.replace("/", "-")) or "pack"


def tn_session():
    s = requests.Session()
    s.headers["User-Agent"] = TN_UA
    return s


def tn_metadata(sess, url):
    """A TransferNow pack's file list from the /dl/ page's __NEXT_DATA__ JSON — no
    browser, nothing downloaded. /dl/<slug> redirects to /en/cld?utm_source=<id>."""
    try:
        r = sess.get(url, timeout=(20, 60))
    except requests.RequestException as e:
        raise PackRetry(f"TransferNow page fetch failed ({type(e).__name__})")
    final = urlsplit(r.url)
    if "/d/expired" in final.path:
        raise PackError("TransferNow link has EXPIRED")
    if "/d/notfound" in final.path:
        raise PackError("TransferNow link not found")
    if r.status_code != 200:
        raise PackRetry(f"TransferNow page HTTP {r.status_code}")
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.S)
    try:
        td = json.loads(m.group(1))["props"]["pageProps"]["transferData"]
        md = td["metadata"]
        tid = md["transferId"]
    except Exception:
        raise PackRetry("TransferNow page had no transferData (page layout changed?)")
    if md.get("needPassword"):
        raise PackError("TransferNow pack is password-protected")
    if td.get("available") is False or td.get("locked") or md.get("status", "ENABLED") != "ENABLED":
        raise PackError(f"TransferNow pack not downloadable (available={td.get('available')}, "
                        f"locked={td.get('locked')}, status={md.get('status')})")
    files = [dict(name=f.get("name") or "", size=int(f.get("size") or 0), id=f.get("id"), kind="tn")
             for f in md.get("files") or []]
    return dict(base=f"{final.scheme}://{final.netloc}", transferId=tid, name=md.get("transferName") or "",
                files=files, until=((md.get("validity") or {}).get("to") or "")[:10],
                sender=((md.get("sender") or {}).get("email") or "").lower())


def _rm(path):
    try:
        os.remove(path)
    except OSError:
        pass


def stream_to(sess, url, dest, label):
    """Stream url -> dest via dest.part. Callers pass signed URLs: never logged, and a
    failure reports only the exception TYPE (requests' messages embed the URL)."""
    part = dest + ".part"
    deadline = time.time() + DOWNLOAD_MAX_SECONDS
    try:
        with sess.get(url, stream=True, timeout=(20, 120)) as resp:
            if resp.status_code != 200:
                raise PackRetry(f"download of {label}: HTTP {resp.status_code}")
            with open(part, "wb") as fh:
                for chunk in resp.iter_content(1 << 20):
                    fh.write(chunk)
                    if time.time() > deadline:
                        raise PackRetry(f"download of {label} took over {DOWNLOAD_MAX_SECONDS // 60} min")
    except requests.RequestException as e:
        _rm(part)
        raise PackRetry(f"download of {label} failed ({type(e).__name__})")
    except BaseException:
        _rm(part)
        raise
    os.replace(part, dest)


def tn_download(sess, meta, entry, dest):
    """One TransferNow file: ask the API for its short-lived signed bucket URL, stream it."""
    name = base_name(entry["name"])
    try:
        r = sess.get(f"{meta['base']}/api/transfer/downloads/link", timeout=(20, 60),
                     params={"transferId": meta["transferId"], "preview": "false", "fileId": entry["id"]})
        status = r.status_code
        signed = r.json().get("url") if status == 200 else None
    except (requests.RequestException, ValueError) as e:
        raise PackRetry(f"download link for {name} failed ({type(e).__name__})")
    if not signed:
        raise PackRetry(f"no download link for {name} (HTTP {status})")
    stream_to(sess, signed, dest, name)


def drive_download(drive, fid, dest):
    part = dest + ".part"
    try:
        with open(part, "wb") as fh:
            dl = MediaIoBaseDownload(fh, drive.files().get_media(fileId=fid), chunksize=8 * 1024 * 1024)
            done = False
            while not done:
                _, done = dl.next_chunk()
    except Exception as e:
        _rm(part)
        raise PackRetry(f"Drive download of {fid} failed ({type(e).__name__})")
    os.replace(part, dest)


def drive_file_entries(drive, fids):
    out = []
    for fid in fids:
        try:
            f = drive.files().get(fileId=fid, fields="id,name,size", supportsAllDrives=True).execute()
        except Exception as e:
            raise PackRetry(f"Drive file {fid} not readable ({type(e).__name__}) - not shared with us, or deleted?")
        out.append(dict(name=f.get("name") or "", size=int(f.get("size") or 0), id=f["id"], kind="drive"))
    return out


def drive_folder_entries(drive, folder_id):
    try:
        res = drive.files().list(q=f"'{folder_id}' in parents and trashed = false", pageSize=100,
                                 fields="files(id,name,size,mimeType)", supportsAllDrives=True,
                                 includeItemsFromAllDrives=True).execute()
    except Exception as e:
        raise PackRetry(f"Drive folder {folder_id} not listable ({type(e).__name__})")
    return [dict(name=f.get("name") or "", size=int(f.get("size") or 0), id=f["id"], kind="drive")
            for f in res.get("files", []) if f.get("mimeType") != "application/vnd.google-apps.folder"]


def find_pack_sources(msg, spec):
    """[(kind, ref)] for this DJ's source type, from the mail body."""
    text = body_text(msg)
    if spec["source"] == "transfernow":
        return [("transfernow", u) for u in extract_transfernow_links(text)]
    if spec["source"] == "drive_folder":
        return [("drive_folder", f) for f in dict.fromkeys(DRIVE_FOLDER_RE.findall(text))]
    if spec["source"] == "drive_files":
        ids = tuple(dict.fromkeys(DRIVE_FILE_RE.findall(text)))
        return [("drive_files", ids)] if ids else []
    return []


def open_pack(kind, ref, drive, sess):
    """dict(label, key, entries, meta) — key identifies the pack in state["dj_packs"]."""
    if kind == "transfernow":
        meta = tn_metadata(sess, ref)
        return dict(label=f"transfernow/{tn_slug(ref)} (pack {meta['transferId']} '{meta['name']}')",
                    key=f"tn:{meta['transferId']}", entries=meta["files"], meta=meta)
    if drive is None:
        raise PackError("Drive packs need the watcher's Google token (daemon mode)")
    if kind == "drive_folder":
        entries, label = drive_folder_entries(drive, ref), f"Drive folder {ref}"
    else:
        entries, label = drive_file_entries(drive, ref), f"{len(ref)} Drive file link(s)"
    return dict(label=label, key="drive:" + ",".join(sorted(e["id"] for e in entries)),
                entries=entries, meta=None)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def mp3_header_ok(path):
    try:
        with open(path, "rb") as fh:
            b = fh.read(3)
    except OSError:
        return False
    return b[:3] == b"ID3" or (len(b) >= 2 and b[0] == 0xFF and (b[1] & 0xE0) == 0xE0)


def audio_seconds(path):
    try:
        r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                            "-of", "default=nw=1:nk=1", path],
                           capture_output=True, text=True, timeout=120, creationflags=NO_WINDOW)
        return float(r.stdout.strip())
    except Exception:
        return None


def fmt_secs(s):
    return f"{int(s // 60)}:{int(s % 60):02d}" if s else "?:??"


def verify_part(path, expect_size):
    """(size, sha256, seconds) of a fetched part, or raise. A short file is a bad
    download (retry); bytes that aren't clean mp3 are the DJ's file (manual look)."""
    size = os.path.getsize(path)
    label = os.path.basename(path)
    if expect_size and size != expect_size:
        raise PackRetry(f"{label}: got {size} bytes, source says {expect_size}")
    if not mp3_header_ok(path):
        raise PackError(f"{label}: not an mp3 (no ID3 tag / frame sync)")
    if not ffmpeg_intact(path):
        raise PackError(f"{label}: ffmpeg full decode reported errors (truncated/corrupt)")
    return size, sha256_file(path), audio_seconds(path)


def studio_sync(secret, payload):
    """POST one studio-sync action. The secret travels only in the JSON body."""
    what = f"studio-sync {payload.get('action')} {payload.get('file_code', '')}".strip()
    try:
        r = requests.post(studio_sync_secret.FN, json={**payload, "secret": secret}, timeout=(20, 90))
    except requests.RequestException as e:
        raise PackRetry(f"{what} failed ({type(e).__name__})")
    try:
        body = r.json()
    except ValueError:
        body = {}
    if r.status_code == 200 and body.get("ok"):
        return body
    err = str(body.get("error") or r.text[:120]).strip()
    # forbidden / unknown DJ / code not in an active slot won't fix themselves
    if r.status_code in (403, 404) or (r.status_code == 409 and payload.get("action") == "ingest"):
        raise PackError(f"{what}: HTTP {r.status_code} {err}")
    raise PackRetry(f"{what}: HTTP {r.status_code} {err}")


def put_signed(url, path, label):
    """PUT the part's bytes to the signed upload URL (never logged). Short cache life,
    so a later re-ingest to the same path isn't served stale from the public CDN."""
    try:
        with open(path, "rb") as fh:
            r = requests.put(url, data=fh, timeout=(20, 600),
                             headers={"Content-Type": "audio/mpeg", "x-upsert": "true",
                                      "cache-control": "max-age=60"})
    except requests.RequestException as e:
        raise PackRetry(f"upload of {label} failed ({type(e).__name__})")
    if r.status_code not in (200, 201):
        raise PackRetry(f"upload of {label}: HTTP {r.status_code} {r.text[:120]}")


def run_pack(kind, ref, air, spec, drive, sess, secret, done_packs, pack=None, dry_run=False):
    """Fetch + verify + ingest ONE pack. Returns (status, lines, key); status is done /
    skipped (no aired set) / manual (won't automate) / seen (handled before) / dry.
    Raises PackRetry on transient failure. Writes nothing outside CONFIG_DIR\\_djpack
    (removed afterwards) — Studio Sync does the on-air filing."""
    pack = pack or open_pack(kind, ref, drive, sess)
    prev = done_packs.get(pack["key"])
    if prev and not dry_run:
        return "seen", prev.get("lines") or [f"{pack['label']}: already handled {prev.get('at', '')[:16]}"], pack["key"]
    parts, others, problem = plan_pack(pack["entries"], spec)
    week_of = week_of_for(air)
    lines = [f"{pack['label']}: {len(pack['entries'])} file(s); air {air:%a %m/%d/%Y}, week_of {week_of}"]
    if others:
        lines.append(f"  not aired, not fetched ({len(others)}): " + "; ".join(base_name(e["name"]) for e in others))
    if problem:
        lines.append("  NO INGEST: " + problem)
        return "manual", lines, pack["key"]
    if not parts:
        lines.append(f"  no aired-set files ('{spec.get('set_prefix') or 'mp3'}') - nothing to ingest")
        return "skipped", lines, pack["key"]
    if dry_run:
        for n in sorted(parts):
            e, code = parts[n], spec["carts"][n - 1]
            lines.append(f"  part {n}  {base_name(e['name'])!r:24} {e['size']:>11,} B  -> {code}"
                         f"   storage {storage_path_for(spec['slug'], week_of, code)}")
        lines.append(f"  Studio Sync then files each to {air:%m%d%Y}-onair\\<code>.mp3 + M:\\JBMusic\\<code>.mp3")
        return "dry", lines, pack["key"]

    stage = os.path.join(CONFIG_DIR, "_djpack", re.sub(r"[^\w.-]+", "_", pack["key"])[:80])
    os.makedirs(stage, exist_ok=True)
    staged = []
    try:
        for n in sorted(parts):
            e = parts[n]
            dest = os.path.join(stage, safe_name(e["name"]))
            log(f"    fetching part {n}: {base_name(e['name'])} ({e['size'] / 1048576:.1f} MB)")
            if e["kind"] == "tn":
                tn_download(sess, pack["meta"], e, dest)
            else:
                drive_download(drive, e["id"], dest)
            size, sha, secs = verify_part(dest, e["size"])
            staged.append(dict(n=n, code=spec["carts"][n - 1], path=dest, size=size, sha=sha,
                               secs=secs, name=base_name(e["name"]), note=""))
        # Every part verified. Get upload slots, upload EVERY object, and only then flip
        # the rows to 'uploaded' — Studio Sync never sees half a pack.
        todo = []
        for p in staged:
            res = studio_sync(secret, ingest_payload(spec, p["code"], week_of, p["size"], p["sha"]))
            p["storage_path"] = res.get("storage_path") or storage_path_for(spec["slug"], week_of, p["code"])
            if not ingest_needed(res.get("existing"), p["sha"], p["storage_path"]):
                p["note"] = "already ingested (same sha256) - left as is"
                continue
            p["upload_url"] = res.get("upload_url")
            if not p["upload_url"]:
                raise PackRetry(f"studio-sync ingest {p['code']}: no upload_url")
            todo.append(p)
        for p in todo:
            log(f"    uploading part {p['n']} -> {p['storage_path']}")
            put_signed(p.pop("upload_url"), p["path"], p["code"])
        for p in todo:
            res = studio_sync(secret, ingest_payload(spec, p["code"], week_of, p["size"], p["sha"], action="ingested"))
            p["note"] = f"ingested (dj_drops {res.get('id')}, status uploaded)"
    finally:
        shutil.rmtree(stage, ignore_errors=True)
    for p in staged:
        lines.append(f"  part {p['n']} '{p['name']}' -> {p['code']}  {p['size'] / 1048576:.1f} MB  "
                     f"{fmt_secs(p['secs'])}  {p['note']}")
    return "done", lines, pack["key"]


_PACK_HOLD_LOGGED = set()


def handle_dj_pack(gmail, drive, msg, mid, spec, state, now=None):
    """Mail from a DJ_PACKS sender: fetch the pack headless, verify every part, ingest it
    into the platform (bucket + dj_drops row) for Studio Sync to file to air."""
    now = now or datetime.now()
    who = spec["dj"]
    subj = header(msg, "Subject")
    if spec.get("subject_must") and spec["subject_must"] not in subj.lower():
        log(f"  {who}: \"{subj}\" is not a {spec['subject_must'].upper()} show - ignored")
        state["processed"].append(mid)
        return
    sources = find_pack_sources(msg, spec)
    if not sources:
        has_audio = find_attachment(msg)[1] is not None
        dated = parse_subject_date(subj, now.date()) and not re.match(r"\s*(?:fwd?|re)\s*:", subj, re.I)
        if has_audio or dated:
            log(f"  {who}: \"{subj}\" looks like a mix but has no {spec['source']} link -> heads-up")
            send_mail(gmail, f"DJ mix arrived: {who} (no {spec['source']} link - manual grab)",
                      f"{who} emailed \"{subj}\" but it has no {spec['source']} link the watcher can "
                      f"fetch{' (it has an audio attachment)' if has_audio else ''}. Upload it to "
                      f"{', '.join(spec['carts'])} by hand (DJ portal on their behalf).")
        else:
            log(f"  {who}: \"{subj}\" has no pack link (newsletter/forward) - ignored")
        state["processed"].append(mid)
        return

    retry = state.setdefault("pack_retry", {})
    notified = state.setdefault("fail_notified", {})
    rt = retry.get(mid) or {}
    if rt.get("next") and now.isoformat() < rt["next"]:
        return  # backing off after a transient failure
    if now.weekday() == 6 and now.hour < PACK_SUNDAY_HOLD_UNTIL:
        if mid not in _PACK_HOLD_LOGGED:
            log(f"  {who}: \"{subj}\" held until {PACK_SUNDAY_HOLD_UNTIL}:00 (Sunday sermon window)")
            _PACK_HOLD_LOGGED.add(mid)
        return
    try:
        msg_dt = datetime.fromtimestamp(int(msg["internalDate"]) / 1000)
    except Exception:
        msg_dt = now
    air, why = pack_air_date(subj, msg_dt, spec)
    head = (f"{who} emailed \"{subj}\".\nAir: {air:%A %m/%d/%Y} ({why}); dj_drops week_of "
            f"{week_of_for(air)}; carts {', '.join(spec['carts'])}.\n\n")

    timing = ingest_timing(air, now, spec)
    if timing != "ok":
        if timing == "late":
            note = "its show has already started (or is minutes away)"
        else:
            note = f"it is for a LATER show - {who}'s {next_show_date(now, spec):%a %m/%d} show hasn't aired yet"
        tried = ("\nEarlier attempts failed: " + " | ".join(rt.get("last", []))) if rt else ""
        log(f"    NOT ingested: pack for {air:%a %m/%d} - {note}")
        hint = ""
        if spec["source"] == "transfernow":
            hint = ("\n\nTo push it by hand when it's time: python scripts\\gmail-watcher.py --ingest-transfernow "
                    + " ".join(r for _, r in sources) + f" --dj {spec['slug']} --air-date {air:%m%d%Y}")
        send_mail(gmail, f"{who} pack NOT synced ({air:%a} {air.month}/{air.day}) - needs a manual look",
                  head + f"Not ingested: {note}. The carts were left alone.{tried}{hint}")
        state["processed"].append(mid)
        retry.pop(mid, None)
        notified.pop(mid, None)
        return

    log(f"  DJ PACK {who}: \"{subj}\" -> air {air:%a %m/%d/%Y} ({why}); {len(sources)} source(s)")
    secret = studio_sync_secret.load(legacy=True)
    sess = tn_session()
    done_packs = state.setdefault("dj_packs", {})
    report, failures, fresh, manual = [], [], False, False
    for kind, ref in sources:
        label = f"transfernow/{tn_slug(ref)}" if kind == "transfernow" else kind
        try:
            if not secret:
                raise PackRetry("no studio-sync secret (env / studio-sync.secret / sync-dj-drops.py)")
            status, lines, key = run_pack(kind, ref, air, spec, drive, sess, secret, done_packs)
        except PackError as e:
            status, lines, key = "manual", [f"{label}: {e}"], None
        except PackRetry as e:
            failures.append(f"{label}: {e}")
            continue
        except Exception as e:
            log("    pack handler error:\n" + traceback.format_exc())
            failures.append(f"{label}: {type(e).__name__}: {e}")
            continue
        if status == "seen":
            if (done_packs.get(key) or {}).get("mid") == mid:
                fresh = True  # handled on an earlier attempt of THIS mail
                manual = manual or done_packs[key].get("status") == "manual"
            report += lines
            continue
        fresh = True
        manual = manual or status == "manual"
        report += lines
        if key:
            done_packs[key] = dict(status=status, air=f"{air:%Y-%m-%d}", mid=mid,
                                   at=now.isoformat(timespec="seconds"), lines=lines)
    for line in report:
        log("    " + line)

    if failures:
        tries = rt.get("tries", 0) + 1
        retry[mid] = dict(next=(now + timedelta(minutes=PACK_RETRY_MINUTES)).isoformat(timespec="seconds"),
                          tries=tries, first=rt.get("first") or now.isoformat(timespec="seconds"),
                          last=failures)
        log(f"    {len(failures)} pack source(s) failed (try {tries}) - nothing flipped for them; "
            f"retrying in {PACK_RETRY_MINUTES} min: " + " | ".join(failures))
        if mid not in notified:
            send_mail(gmail, f"{who} pack arrived but auto-sync FAILED (retrying)",
                      head + "\n".join(failures + [""] + report) +
                      f"\n\nThe watcher retries every {PACK_RETRY_MINUTES} min until the show's cutoff "
                      f"({PACK_LEAD_MINUTES} min before air). This is the only alert for this mail.")
            notified[mid] = now.isoformat()
        return

    state["processed"].append(mid)
    retry.pop(mid, None)
    notified.pop(mid, None)
    if not fresh:
        log("    nothing new - pack(s) already handled")
        return
    if manual:
        subject = f"{who} pack needs a manual look ({air:%a} {air.month}/{air.day})"
    elif any("ingested (dj_drops" in line for line in report):
        subject = f"{who} pack ingested for {air:%a} {air.month}/{air.day} air"
    else:
        subject = f"{who} pack: nothing to air ({air:%a} {air.month}/{air.day})"
    send_mail(gmail, subject, head + "\n".join(report) +
              "\n\nStudio Sync (every ~5 min) downloads each ingested part, decode-checks it, files it to "
              "the dated on-air folder + M:/JBMusic and marks it published.")


def transfernow_cli(url, dj_slug=None, air_arg=None, dry_run=True):
    """--transfernow-dry-run / --ingest-transfernow: the daemon's pack path for ONE link,
    by hand. Prints the plan; with dry_run nothing is downloaded or ingested. No Gmail
    token needed. Returns the process exit code."""
    sess = tn_session()
    try:
        pack = open_pack("transfernow", url, None, sess)
    except (PackError, PackRetry) as e:
        print(f"TransferNow: {e}")
        return 1
    meta = pack["meta"]
    spec = (next((v for v in DJ_PACKS.values() if v["slug"] == dj_slug), None) if dj_slug
            else DJ_PACKS.get(meta["sender"]))
    if not spec:
        print(f"no DJ_PACKS entry for {'--dj ' + dj_slug if dj_slug else 'sender ' + (meta['sender'] or '?')}"
              f" - pass --dj (known: {', '.join(v['slug'] for v in DJ_PACKS.values())})")
        return 1
    now = datetime.now()
    if air_arg:
        air, why = datetime.strptime(air_arg, "%m%d%Y").date(), "--air-date"
    else:
        air, why = next_show_date(now, spec), "next show from now"
    timing = ingest_timing(air, now, spec)
    print(f"TransferNow {'DRY RUN (nothing downloaded or ingested)' if dry_run else 'INGEST'} - transfernow/{tn_slug(url)}")
    print(f"  pack    {meta['transferId']} '{meta['name']}'  sender {meta['sender'] or '?'}  valid until {meta['until'] or '?'}")
    print(f"  DJ      {spec['dj']} ({spec['slug']}), set '{spec.get('set_prefix') or '*'}', carts {', '.join(spec['carts'])}")
    print(f"  air     {air:%a %m/%d/%Y} ({why}); week_of {week_of_for(air)}; timing now: {timing}")
    if air.weekday() != spec["air_weekday"]:
        print(f"  WARNING {air:%a} is not {spec['dj']}'s show day")
    if not dry_run and timing != "ok":
        print(f"  REFUSED: the pack must be for the next show ({next_show_date(now, spec):%a %m/%d}) "
              f"and ingested {PACK_LEAD_MINUTES}+ min before it starts")
        return 1
    secret = None if dry_run else studio_sync_secret.load(legacy=True)
    if not dry_run and not secret:
        print("  no studio-sync secret found (env WCCG_STUDIO_SYNC_SECRET / studio-sync.secret / sync-dj-drops.py)")
        return 1
    try:
        status, lines, _ = run_pack("transfernow", url, air, spec, None, sess, secret, {}, pack=pack, dry_run=dry_run)
    except (PackError, PackRetry) as e:
        print(f"  FAILED: {e}")
        return 1
    for line in lines:
        print(line)
    print(f"  RESULT: {status}")
    return 0 if status in ("dry", "done") else 1


# --------------------------------------------------------------------------- #
# Website: each synced sermon also lands on the church's profile page
# --------------------------------------------------------------------------- #
class SiteRetry(Exception):
    """Transient (network, 5xx, secret not set up yet, file busy) — retried with back-off."""


class SiteSkip(Exception):
    """Will never work as is (unknown church, aired archive row, not audio) — dropped with a log line."""


SERMON_CODES = tuple(dict.fromkeys(s["code"] for s in SERMONS.values()))


def site_dirs():
    q = os.path.join(CONFIG_DIR, "site-queue")
    return q, os.path.join(q, "failed"), os.path.join(q, "dry-run"), os.path.join(CONFIG_DIR, "_site")


def _write_json_atomic(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=2)
    os.replace(tmp, path)


def queue_site_publish(code, air, src, now=None):
    """Called right after a sermon is synced for AIR. Writes one small queue file and
    returns True; returns False (logged) on ANY problem — it never raises, so the air
    path can't be held up by the website. A re-sent sermon for the same Sunday just
    replaces the entry (newest file wins, like the cart)."""
    try:
        if not SITE_PUBLISH:
            return False
        now = now or datetime.now()
        qdir = site_dirs()[0]
        os.makedirs(qdir, exist_ok=True)
        stamp = now.isoformat(timespec="microseconds")
        _write_json_atomic(os.path.join(qdir, f"{code}-{air:%Y-%m-%d}.json"),
                           dict(code=code, air_date=f"{air:%Y-%m-%d}", src=src, queued=stamp,
                                tries=0, next=stamp, last=""))
        log(f"    website: queued {code} {air:%Y-%m-%d} for the church profile (public from its air time)")
        return True
    except Exception as e:
        log(f"    website: could not queue {code} ({type(e).__name__}: {e}) - air sync unaffected")
        return False


def _snapshot(src, code, air_date):
    """Copy the staged sermon to CONFIG_DIR\\_site so the upload reads stable bytes even
    if the church re-sends and the Sunday folder is rewritten mid-upload. Raises
    SiteRetry when the source changed while it was being copied."""
    tmpdir = site_dirs()[3]
    os.makedirs(tmpdir, exist_ok=True)
    try:
        before = os.stat(src)
    except OSError:
        raise SiteSkip(f"{src} is gone")
    snap = os.path.join(tmpdir, f"{code}-{air_date}.src")
    shutil.copyfile(src, snap)
    after = os.stat(src)
    if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns) \
            or os.path.getsize(snap) != after.st_size:
        _rm(snap)
        raise SiteRetry(f"{os.path.basename(src)} changed while it was being copied")
    return snap


def web_mp3(snap, code, air_date):
    """(path, temp): an mp3 the website can serve. mp3 bytes go as they are; WAV (pmb1)
    and m4a are transcoded to SITE_WEB_BITRATE at below-normal priority."""
    if mp3_header_ok(snap):
        return snap, False
    with open(snap, "rb") as fh:
        head = fh.read(12)
    if head[:4] != b"RIFF" and head[4:8] != b"ftyp":
        raise SiteSkip(f"{code} {air_date}: not audio the website can use")
    out = os.path.join(site_dirs()[3], f"{code}-{air_date}.mp3")
    try:
        r = subprocess.run([FFMPEG, "-y", "-v", "error", "-i", snap, "-vn", "-c:a", "libmp3lame",
                            "-b:a", SITE_WEB_BITRATE, out],
                           capture_output=True, timeout=1800, creationflags=NO_WINDOW | BELOW_NORMAL)
    except (OSError, subprocess.SubprocessError) as e:
        _rm(out)
        raise SiteRetry(f"website transcode failed ({type(e).__name__})")
    if r.returncode != 0 or not mp3_header_ok(out):
        _rm(out)
        raise SiteRetry("website transcode failed (ffmpeg exit %s)" % r.returncode)
    return out, True


def site_call(secret, payload):
    """POST one studio-sync sermon action. The secret travels only in the JSON body."""
    what = f"studio-sync {payload.get('action')} {payload.get('church_code', '')} {payload.get('air_date', '')}"
    try:
        r = requests.post(studio_sync_secret.FN, json={**payload, "secret": secret}, timeout=(20, 90))
    except requests.RequestException as e:
        raise SiteRetry(f"{what} failed ({type(e).__name__})")
    try:
        body = r.json()
    except ValueError:
        body = {}
    if r.status_code == 200 and body.get("ok"):
        return body
    err = str(body.get("error") or r.text[:160]).strip()
    # bad request / unknown church / aired archive row won't fix themselves; 403 (secret
    # not yet provisioned), 503 (function not configured), 409 after the PUT and 5xx do.
    if r.status_code in (400, 404) or (r.status_code == 409 and payload.get("action") == "sermon"):
        raise SiteSkip(f"{what}: HTTP {r.status_code} {err}")
    raise SiteRetry(f"{what}: HTTP {r.status_code} {err}")


def publish_sermon_to_site(code, air_date, src, secret, dry_run=False):
    """One sermon file -> the church's profile. Returns a one-line summary; raises
    SiteRetry / SiteSkip. Writes nothing outside CONFIG_DIR\\_site (removed after)."""
    if code not in SERMON_CODES:
        raise SiteSkip(f"unknown church code {code}")
    if dry_run:
        try:
            size = os.path.getsize(src)
            with open(src, "rb") as fh:
                head = fh.read(12)
        except OSError:
            raise SiteSkip(f"{src} is gone")
        how = "mp3 as is" if (head[:3] == b"ID3" or head[:1] == b"\xff") else f"-> mp3 {SITE_WEB_BITRATE}"
        return (f"DRY RUN {code} {air_date}: {src} ({size / 1048576:.1f} MB, {how}) -> studio-sync "
                f"sermon / PUT / sermon_uploaded; public on the church profile from its air time")
    if not secret:
        raise SiteRetry("no studio-sync secret on this PC (env WCCG_STUDIO_SYNC_SECRET, "
                        "C:\\AirSuite\\secrets\\studio-sync.dpapi or studio-sync.secret)")
    snap = _snapshot(src, code, air_date)
    web, temp = snap, False
    try:
        web, temp = web_mp3(snap, code, air_date)
        size, sha = os.path.getsize(web), sha256_file(web)
        base = {"church_code": code, "air_date": air_date, "format": "mp3",
                "size_bytes": size, "checksum_sha256": sha}
        res = site_call(secret, {"action": "sermon", **base})
        if res.get("done"):
            return f"{code} {air_date}: already on the site ({res.get('storage_path')})"
        if not res.get("upload_url"):
            raise SiteRetry("studio-sync sermon: no upload_url")
        try:
            put_signed(res["upload_url"], web, f"{code} {air_date}")
        except PackRetry as e:
            raise SiteRetry(str(e))
        done = site_call(secret, {"action": "sermon_uploaded", **base})
        return (f"{code} {air_date}: on the site at {done.get('storage_path')} ({size / 1048576:.1f} MB), "
                f"public from {done.get('airs_at')}")
    finally:
        _rm(snap)
        if temp:
            _rm(web)


def _site_entries():
    qdir = site_dirs()[0]
    try:
        names = sorted(n for n in os.listdir(qdir) if n.endswith(".json"))
    except OSError:
        return []
    out = []
    for n in names:
        p = os.path.join(qdir, n)
        try:
            with open(p, encoding="utf-8-sig") as fh:
                out.append((p, json.load(fh)))
        except (OSError, ValueError) as e:
            log(f"  website: unreadable queue entry {n} ({type(e).__name__}) - skipped")
    return out


def _site_park(path, entry, folder, note):
    """Move a finished-with entry aside (failed/ or dry-run/), unless it was re-queued meanwhile."""
    if not _site_same(path, entry):
        return
    os.makedirs(folder, exist_ok=True)
    entry = dict(entry, last=note, parked=datetime.now().isoformat(timespec="seconds"))
    _write_json_atomic(os.path.join(folder, os.path.basename(path)), entry)
    _rm(path)


def _site_same(path, entry):
    """Is the queue file still the version this worker picked up? (A re-sent sermon
    re-queues the same key while an older upload may be running.)"""
    try:
        with open(path, encoding="utf-8-sig") as fh:
            return json.load(fh).get("queued") == entry.get("queued")
    except (OSError, ValueError):
        return False


def site_process_due(now=None, secret=None, dry_run=None):
    """Run every due queue entry once; returns how many reached the site. Never raises.
    Stops as soon as the main loop starts handling a mail (the air path goes first)."""
    now = now or datetime.now()
    dry = SITE_DRY_RUN if dry_run is None else dry_run
    _, failed_dir, dry_dir, _ = site_dirs()
    done = 0
    for path, e in _site_entries():
        if AIR_BUSY.is_set():
            break
        if e.get("next", "") > now.isoformat(timespec="microseconds"):
            continue
        key = f"{e.get('code')} {e.get('air_date')}"
        try:
            if dry:
                msg = publish_sermon_to_site(e["code"], e["air_date"], e["src"], None, dry_run=True)
                log(f"  website: {msg}")
                _site_park(path, e, dry_dir, "dry run - nothing uploaded")
                continue
            msg = publish_sermon_to_site(e["code"], e["air_date"], e["src"],
                                         secret or studio_sync_secret.load())  # never the legacy literal
            log(f"  website: {msg}")
            if _site_same(path, e):
                _rm(path)
            done += 1
        except SiteSkip as ex:
            log(f"  website: {key} NOT published, not retrying: {ex}")
            _site_park(path, e, failed_dir, str(ex)[:300])
        except Exception as ex:  # SiteRetry and anything unexpected: back off, never crash
            note = str(ex) if isinstance(ex, SiteRetry) else f"{type(ex).__name__}: {ex}"
            tries = int(e.get("tries", 0)) + 1
            try:
                first = datetime.fromisoformat(e.get("queued") or now.isoformat())
            except ValueError:
                first = now
            if now - first > timedelta(days=SITE_GIVE_UP_DAYS):
                log(f"  website: {key} gave up after {tries} tries over {SITE_GIVE_UP_DAYS} days: {note}")
                _site_park(path, e, failed_dir, note[:300])
                continue
            wait = SITE_BACKOFF_MINUTES[min(tries - 1, len(SITE_BACKOFF_MINUTES) - 1)]
            log(f"  website: {key} try {tries} failed ({note}); next try in {wait} min")
            if _site_same(path, e):
                try:
                    _write_json_atomic(path, dict(e, tries=tries, last=note[:300],
                                                  next=(now + timedelta(minutes=wait)).isoformat(timespec="microseconds")))
                except OSError:
                    pass
    return done


def site_worker_loop():
    log(f"website worker up (every {SITE_WORKER_SECONDS}s{', DRY RUN' if SITE_DRY_RUN else ''}); "
        f"queue {site_dirs()[0]}")
    while True:
        try:
            if not AIR_BUSY.is_set():
                site_process_due()
        except Exception:
            log("  website worker error:\n" + traceback.format_exc())
        time.sleep(SITE_WORKER_SECONDS)


def start_site_worker():
    if not SITE_PUBLISH:
        log("website publishing is OFF (WCCG_SITE_PUBLISH=0)")
        return None
    t = threading.Thread(target=site_worker_loop, name="site-worker", daemon=True)
    t.start()
    return t


def sunday_folder_files(since, until=None, root=None):
    """[(code, air date, path)] for every sermon in the Sunday folders from `since`
    to `until` (inclusive): <root>\\<YYYY>\\sunday <MMDDYY>\\<code>.<mp3|wav|m4a>."""
    root = root or SERMON_ROOT
    out = []
    for y in range(since.year, (until or date.today()).year + 1):
        ydir = os.path.join(root, str(y))
        try:
            names = os.listdir(ydir)
        except OSError:
            continue
        for sub in names:
            m = re.match(r"sunday (\d{2})(\d{2})(\d{2})$", sub.strip(), re.I)
            if not m:
                continue
            try:
                d = date(2000 + int(m.group(3)), int(m.group(1)), int(m.group(2)))
            except ValueError:
                continue
            if d < since or (until and d > until) or d.weekday() != 6:
                continue
            sdir = os.path.join(ydir, sub)
            best = {}  # one file per church: the .mp3 the cart used, else .m4a, else .wav
            for f in os.listdir(sdir):
                name, _, ext = f.lower().rpartition(".")
                rank = {"mp3": 0, "m4a": 1, "wav": 2}.get(ext)
                if name in SERMON_CODES and rank is not None and (name not in best or rank < best[name][0]):
                    best[name] = (rank, os.path.join(sdir, f))
            out += [(code, d, path) for code, (_, path) in best.items()]
    return sorted(out, key=lambda x: (x[1], x[0]))


def sermon_site_cli(args):
    """--publish-sermon / --withdraw-sermon / --backfill-sermons. Returns the exit code.
    None of them touches the Sunday folders' air copies or M:\\JBMusic."""
    dry = bool(args.dry_run)
    secret = None if dry else studio_sync_secret.load()  # never the legacy literal
    if not dry and not secret:
        print("no studio-sync secret on this PC (env WCCG_STUDIO_SYNC_SECRET, "
              "C:\\AirSuite\\secrets\\studio-sync.dpapi or studio-sync.secret)")
        return 1

    if args.withdraw_sermon:
        if args.church not in SERMON_CODES or not args.air_date:
            print(f"--withdraw-sermon needs --church ({', '.join(SERMON_CODES)}) and --air-date YYYY-MM-DD")
            return 1
        payload = {"action": "sermon_withdraw", "church_code": args.church, "air_date": args.air_date}
        if args.checksum:
            payload["checksum_sha256"] = args.checksum.lower()
        try:
            res = site_call(secret, payload)
        except (SiteRetry, SiteSkip) as e:
            print(f"withdraw FAILED: {e}")
            return 1
        print(f"withdrawn: row_deleted={res.get('row_deleted')} removed={res.get('removed')}")
        return 0

    if args.publish_sermon:
        if args.church not in SERMON_CODES or not args.air_date:
            print(f"--publish-sermon needs --church ({', '.join(SERMON_CODES)}) and --air-date YYYY-MM-DD")
            return 1
        try:
            print(publish_sermon_to_site(args.church, args.air_date, args.publish_sermon, secret, dry_run=dry))
        except (SiteRetry, SiteSkip) as e:
            print(f"FAILED: {e}")
            return 1
        return 0

    # --backfill-sermons
    now = datetime.now()
    if not dry and now.weekday() == 6 and 6 <= now.hour < 15:
        print("refused: Sunday 06:00-15:00 is the sermon air window - run the backfill later")
        return 1
    try:
        since = datetime.strptime(args.backfill_sermons, "%Y-%m-%d").date()
        until = datetime.strptime(args.until, "%Y-%m-%d").date() if args.until else None
    except ValueError:
        print("--backfill-sermons / --until take YYYY-MM-DD")
        return 1
    files = sunday_folder_files(since, until)
    print(f"{len(files)} sermon file(s) in the Sunday folders from {since}" + (f" to {until}" if until else ""))
    bad = 0
    for code, d, path in files:
        if d > now.date():
            print(f"  skip {code} {d}: airs later - the daemon publishes it when it is synced")
            continue
        try:
            print("  " + publish_sermon_to_site(code, f"{d:%Y-%m-%d}", path, secret, dry_run=dry))
        except SiteSkip as e:
            print(f"  skip {code} {d}: {e}")
        except SiteRetry as e:
            bad += 1
            print(f"  FAILED {code} {d}: {e}")
    return 1 if bad else 0


# --------------------------------------------------------------------------- #
# Loop
# --------------------------------------------------------------------------- #
def list_matches(gmail):
    res = gmail.users().messages().list(userId="me", q=GMAIL_QUERY, maxResults=30).execute()
    return [m["id"] for m in res.get("messages", [])]


def check_once(gmail, drive, state, catchup=False):
    ids = list_matches(gmail)
    # First ever run: assume currently-visible mail is already handled (seed baseline),
    # unless --catchup was passed.
    if not state.get("seeded") and not catchup:
        state["processed"] = list(set(state["processed"]) | set(ids))
        state["seeded"] = True
        save_state(state)
        log(f"baseline seeded: {len(ids)} existing message(s) marked handled "
            f"(future arrivals will sync). Use --catchup to force-process these.")
        return
    new = [i for i in ids if i not in state["processed"]]
    if new:
        log(f"{len(new)} new message(s)")
    for mid in new:
        AIR_BUSY.set()  # the website worker starts no upload while a mail is handled
        try:
            handle_message(gmail, drive, mid, state)
        except Exception:
            log("  handler error:\n" + traceback.format_exc())
        finally:
            AIR_BUSY.clear()
        save_state(state)
    if catchup:
        state["seeded"] = True
        save_state(state)


def build_services(creds):
    gmail = build("gmail", "v1", credentials=creds, cache_discovery=False)
    drive = build("drive", "v3", credentials=creds, cache_discovery=False)
    return gmail, drive


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--authorize", action="store_true")
    ap.add_argument("--authurl", action="store_true")   # listener-free: print consent URL
    ap.add_argument("--exchange")                        # listener-free: exchange the code -> token.json
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--catchup", action="store_true")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--transfernow-dry-run", metavar="DL_LINK",
                    help="print the ingest plan for a TransferNow pack; downloads nothing")
    ap.add_argument("--ingest-transfernow", metavar="DL_LINK",
                    help="one-shot: fetch + verify + ingest a TransferNow pack via studio-sync")
    ap.add_argument("--dj", metavar="SLUG", help="DJ slug for the TransferNow modes, e.g. dj-tony-neal")
    ap.add_argument("--air-date", metavar="MMDDYYYY", help="air date for the TransferNow modes")
    ap.add_argument("--dry-run", action="store_true",
                    help="with --ingest-transfernow / --publish-sermon / --backfill-sermons: plan only")
    ap.add_argument("--publish-sermon", metavar="FILE",
                    help="one-shot: put this sermon file on the church's website profile")
    ap.add_argument("--withdraw-sermon", action="store_true",
                    help="remove a website sermon that has not aired yet")
    ap.add_argument("--backfill-sermons", metavar="YYYY-MM-DD",
                    help="put every Sunday-folder sermon since this date on the website")
    ap.add_argument("--until", metavar="YYYY-MM-DD", help="with --backfill-sermons: last Sunday")
    ap.add_argument("--church", metavar="CODE", help="sermon code for the website modes, e.g. pmb1")
    ap.add_argument("--checksum", metavar="SHA256", help="with --withdraw-sermon: also clear that upload")
    ap.add_argument("--site-dry-run", action="store_true",
                    help="daemon: website uploads only log what they would do")
    args = ap.parse_args()

    if args.authorize:
        authorize()
        return

    if args.publish_sermon or args.withdraw_sermon or args.backfill_sermons:
        # website only: no Gmail token needed, the air carts are never touched
        sys.exit(sermon_site_cli(args))

    if args.site_dry_run:
        global SITE_DRY_RUN
        SITE_DRY_RUN = True

    if args.transfernow_dry_run or args.ingest_transfernow:
        # no Gmail token needed: the pack is read straight off TransferNow
        sys.exit(transfernow_cli(args.transfernow_dry_run or args.ingest_transfernow, args.dj, args.air_date,
                                 dry_run=bool(args.transfernow_dry_run or args.dry_run)))

    if args.authurl or args.exchange:
        # Listener-free consent: build the consent URL, let the user approve in the
        # browser (redirects to http://localhost/?code=...), then exchange that code.
        # No local server to die on a slow/interrupted consent.
        from google_auth_oauthlib.flow import Flow
        if not os.path.exists(CLIENT_SECRET):
            log(f"FATAL: missing {CLIENT_SECRET}"); sys.exit(1)
        flow = Flow.from_client_secrets_file(CLIENT_SECRET, scopes=SCOPES,
                                             redirect_uri="http://localhost",
                                             autogenerate_code_verifier=False)
        if args.authurl:
            url, _ = flow.authorization_url(access_type="offline", prompt="consent",
                                            include_granted_scopes="false")
            print("AUTHURL " + url)
            return
        flow.fetch_token(code=args.exchange)
        os.makedirs(CONFIG_DIR, exist_ok=True)
        open(TOKEN_FILE, "w", encoding="utf-8").write(flow.credentials.to_json())
        print("TOKEN WRITTEN -> " + TOKEN_FILE)
        return

    creds = get_creds()
    gmail, drive = build_services(creds)
    state = load_state()

    if args.status:
        ids = list_matches(gmail)
        print(json.dumps({
            "query": GMAIL_QUERY,
            "visible_now": len(ids),
            "processed_count": len(state["processed"]),
            "seeded": state.get("seeded", False),
            "airing_sunday": f"{this_sunday():%Y-%m-%d}",
            "sunday_folder": sunday_folder(this_sunday()),
            "dj_packs_handled": len(state.get("dj_packs", {})),
            "dj_packs_retrying": sorted(state.get("pack_retry", {}).keys()),
            "website_publish": "off" if not SITE_PUBLISH else ("dry-run" if SITE_DRY_RUN else "on"),
            "website_queue": [dict(entry=os.path.basename(p), tries=e.get("tries"), next=e.get("next"),
                                   last=e.get("last")) for p, e in _site_entries()],
        }, indent=2))
        return

    if args.once or args.catchup:
        check_once(gmail, drive, state, catchup=args.catchup)
        if SITE_PUBLISH:
            site_process_due()  # no worker thread in one-shot mode
        return

    log(f"gmail-watcher up. polling every {POLL_SECONDS}s. query: {GMAIL_QUERY}")
    start_site_worker()
    # gmail/drive were built from creds that carry the refresh token; the client
    # auto-refreshes the access token during API calls, so we don't rebuild here.
    while True:
        try:
            check_once(gmail, drive, state)
        except RefreshError:
            log("RE-AUTH NEEDED: refresh token rejected. Run --authorize. Retrying in 5 min.")
            time.sleep(300)
            continue
        except Exception:
            log("loop error:\n" + traceback.format_exc())
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
