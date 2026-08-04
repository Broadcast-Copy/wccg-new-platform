#!/usr/bin/env python3
"""Reusable: report the newest mix email(s) from a given DJ address (read-only).
Usage: python dj-mix-check.py <email> [newer_than_days]
Prints one line per candidate: ISO-date | msgid | subject | drive_file_ids."""
import base64, os, re, sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

CONFIG_DIR = r"C:\Users\wccg1\.wccg-gmail-watcher"
TOKEN_FILE = os.path.join(CONFIG_DIR, "token.json")
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.readonly",
]

addr = sys.argv[1] if len(sys.argv) > 1 else "djchuckt@gmail.com"
days = sys.argv[2] if len(sys.argv) > 2 else "30"

creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
if not creds.valid and creds.expired and creds.refresh_token:
    creds.refresh(Request())
    open(TOKEN_FILE, "w", encoding="utf-8").write(creds.to_json())

gmail = build("gmail", "v1", credentials=creds)
drive = build("drive", "v3", credentials=creds)


def header(msg, name):
    for h in msg.get("payload", {}).get("headers", []):
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def walk(payload):
    yield payload
    for p in payload.get("parts", []) or []:
        yield from walk(p)


def body_text(msg):
    chunks = []
    for p in walk(msg.get("payload", {})):
        if p.get("mimeType", "").startswith("text/"):
            d = p.get("body", {}).get("data")
            if d:
                try:
                    chunks.append(base64.urlsafe_b64decode(d).decode("utf-8", "replace"))
                except Exception:
                    pass
    return "\n".join(chunks)


DRIVE_RES = [re.compile(r"drive\.google\.com/file/d/([-\w]{20,})"), re.compile(r"[?&]id=([-\w]{20,})")]


def drive_ids(text):
    ids = []
    for rx in DRIVE_RES:
        ids += rx.findall(text)
    return list(dict.fromkeys(ids))


res = gmail.users().messages().list(userId="me", q=f"from:{addr} newer_than:{days}d", maxResults=10).execute()
msgs = res.get("messages", [])
if not msgs:
    print("NONE")
    sys.exit(0)

for m in msgs:
    full = gmail.users().messages().get(userId="me", id=m["id"], format="full").execute()
    subj = header(full, "Subject")
    date = header(full, "Date")
    ids = drive_ids(body_text(full))
    print(f"{date} | {m['id']} | {subj!r} | drive={ids}")
