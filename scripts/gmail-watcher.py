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

DJ-mix senders are *detected* and a heads-up is emailed, but the actual mix
download still goes through the hourly task / sync-dj-drops.py for now.

Auth (one-time): put a Desktop-app client_secret.json in the config dir and run
  python gmail-watcher.py --authorize
You click "Allow" once; a refresh token is saved to token.json. See the runbook.

Run modes:
  --authorize   one-time OAuth consent -> token.json
  --once        single check then exit (good for a cron/Task Scheduler fallback)
  --catchup     process currently-visible matches even on a fresh state file
  --status      print current state + what's visible, then exit
  (no flag)     run forever, polling every POLL_SECONDS
"""

import argparse
import base64
import io
import json
import os
import re
import subprocess
import sys
import time
import traceback
from datetime import datetime, timedelta
from email.message import EmailMessage

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
LOG = r"D:\WCCG\sync-logs\gmail-watcher.log"
NOTIFY_TO = "biggleem@gmail.com"

POLL_SECONDS = int(os.environ.get("WCCG_POLL_SECONDS", "20"))

# sender-key (addr or domain, matched as substring of the From header) -> sermon spec
SERMONS = {
    "vesax86@gmail.com":                  dict(code="pmb1", djb="DJB_52011", ext="wav", kind="drive",       transcode=False, church="Progressive",          air="1:00 PM"),
    "lewischapel.org":                    dict(code="lcc1", djb="DJB_52014", ext="mp3", kind="attachment",  transcode=False, church="Lewis Chapel",         air="2-3 PM"),
    "mondselite27@yahoo.com":             dict(code="gpn1", djb="DJB_52002", ext="mp3", kind="dropbox",     transcode=False, church="Grace Plus Nothing",   air="AM"),
    "ffwcaudio@gmail.com":                dict(code="dvp1", djb="DJB_52008", ext="mp3", kind="dropbox",     transcode=False, church="Family Fellowship",    air="AM"),
    "drive-shares-dm-noreply@google.com": dict(code="thm1", djb="DJB_52005", ext="mp3", kind="drive_share", transcode=True,  church="Encouraging Moment",   air="~9 AM", sharer="tony haire"),
}

# DJ-mix senders: detect + notify only (download still via hourly task for v1)
DJ_SENDERS = {
    "djdaddyblack005@gmail.com": "DJ Daddy Black (Fri 12-2 PM)",
    "tnealmusic@gmail.com":      "DJ Tony Neal (Sat 10 PM-12 AM)",
    "cjgarris3@hotmail.com":     "DJ Corleone (Sun 5 PM)",
}

ALL_SENDERS = list(SERMONS.keys()) + list(DJ_SENDERS.keys())
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
        b = open(path, "rb").read(4)
    except Exception:
        return False
    if ext == "wav":
        return b[:4] == b"RIFF"
    return b[:3] == b"ID3" or b[0:1] == b"\xff"  # mp3 ID3 or MPEG frame sync


def ffmpeg_intact(path):
    """Full decode; exit 0 with no errors == complete, untruncated audio."""
    try:
        r = subprocess.run([FFMPEG, "-v", "error", "-i", path, "-f", "null", "-"],
                           capture_output=True, timeout=300)
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
    r = subprocess.run(["curl", "-sL", "--max-time", "900", "-o", tmp, url], capture_output=True)
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
        if not aid:
            log("    no audio attachment found"); return None
        log(f"    attachment: {fn}")
        return gmail_attachment_bytes(gmail, msg["id"], aid)

    text = body_text(msg)
    if kind in ("drive", "drive_share"):
        fid = extract_drive_id(text)
        if not fid:
            log("    no Drive id in body"); return None
        log(f"    Drive id: {fid}")
        try:
            return drive_bytes(drive, fid)
        except Exception as e:
            log(f"    Drive API get_media failed ({e}); trying anonymous")
            return curl_bytes(f"https://drive.google.com/uc?export=download&id={fid}&confirm=t")

    if kind == "dropbox":
        url = extract_dropbox(text)
        if not url:
            log("    no Dropbox link in body"); return None
        log("    Dropbox link found")
        return curl_bytes(url)

    return None


def stage_sermon(data, spec):
    """Write the bytes to the Sunday folder + M:\\JBMusic, transcoding thm1. Returns (ok, note)."""
    sun = this_sunday()
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
                           capture_output=True, timeout=600)
        try:
            os.remove(raw)
        except Exception:
            pass
        if r.returncode != 0 or not os.path.exists(dest_sermon):
            return False, "ffmpeg transcode failed"
    else:
        open(dest_sermon, "wb").write(data)

    if not audio_header_ok(dest_sermon, ext):
        return False, f"bad audio header for {os.path.basename(dest_sermon)}"
    if ext != "wav" and not ffmpeg_intact(dest_sermon):
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
    msg = gmail.users().messages().get(userId="me", id=mid, format="full").execute()
    frm = header(msg, "From").lower()
    subj = header(msg, "Subject")

    # DJ mix sender? notify only
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
    if not data or len(data) < 200000:
        log(f"    download failed/too small ({len(data) if data else 0} bytes) — will retry next tick (not marking processed)")
        send_mail(gmail, f"Sermon {spec['code']} arrived but auto-download FAILED",
                  f"{spec['church']} ({spec['code']}, airs {spec['air']}) emailed \"{subj}\" but the headless "
                  f"download failed. Grab it manually — slot M:/JBMusic/{spec['djb']}.{spec['ext']}.")
        return  # don't mark processed -> retried next tick

    ok, note = stage_sermon(data, spec)
    if ok:
        log(f"    SYNCED {note}")
        sd = this_sunday()
        send_mail(gmail, f"{spec['code']} ({spec['church']}) synced for Sun {sd.month}/{sd.day} air",
                  f"Auto-synced the moment it arrived.\n{note}\nAirs {spec['air']} this Sunday.")
        state["processed"].append(mid)
    else:
        log(f"    STAGE FAILED: {note} — not marking processed")
        send_mail(gmail, f"Sermon {spec['code']} download OK but staging failed",
                  f"{spec['church']} ({spec['code']}): {note}. Needs a look.")


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
        try:
            handle_message(gmail, drive, mid, state)
        except Exception:
            log("  handler error:\n" + traceback.format_exc())
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
    args = ap.parse_args()

    if args.authorize:
        authorize()
        return

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
        }, indent=2))
        return

    if args.once or args.catchup:
        check_once(gmail, drive, state, catchup=args.catchup)
        return

    log(f"gmail-watcher up. polling every {POLL_SECONDS}s. query: {GMAIL_QUERY}")
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
