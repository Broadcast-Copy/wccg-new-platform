#!/usr/bin/env python3
r"""
send-dj-reminder — "upload your mix" reminder for WCCG on-air mixshow DJs.

Reuses the gmail-watcher OAuth token (gmail.send scope). The WCCG 104.5 FM logo
(header, white bg) and Carson Communications logo (footer, dark bg) are embedded
INLINE as CID attachments so they render everywhere. CTA links to the apex
DJ portal. Each DJ gets an individual, personalized message (own To:).

Modes:
  python send-dj-reminder.py                      # one generic copy to biggleem
  python send-dj-reminder.py <email> [djName]     # one copy to <email>
  python send-dj-reminder.py blast [--include-admin]
        # the WEEKLY job: fetch the current on-air mixshow DJ roster (DJs holding
        # an active slot) from the studio-sync edge function and remind each one.
"""
import base64
import json
import os
import sys
import time
import urllib.request
from datetime import datetime
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

CONFIG_DIR = os.environ.get("WCCG_GMAIL_DIR", r"C:\Users\wccg1\.wccg-gmail-watcher")
TOKEN_FILE = os.path.join(CONFIG_DIR, "token.json")
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.readonly",
]
LOGO_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "apps", "web", "public", "images", "logos",
)
WCCG_LOGO = os.path.join(LOGO_DIR, "wccg-logo.png")
CARSON_LOGO = os.path.join(LOGO_DIR, "carson-communications-logo.png")
ADMIN_EMAIL = "biggleem@gmail.com"
SUBJECT = "\U0001F3A7 Time to upload your mix — WCCG 104.5 FM"

# Secure roster source — the studio-sync edge function (service role) returns the
# active mixshow DJ roster so this PC never needs the Supabase service key.
STUDIO_SYNC_URL = "https://irjiqbmoohklagdegezz.supabase.co/functions/v1/studio-sync"
STUDIO_SYNC_SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060"


def html_for(dj_name: str) -> str:
    year = datetime.now().year
    greeting = f"What's good {dj_name} —" if dj_name else "What's good DJ —"
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e9e9ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e9ee;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td align="center" style="background:#ffffff;padding:30px 0 22px;border-bottom:4px solid #e11d1d;">
<img src="cid:wccglogo" alt="WCCG 104.5 FM - The Hip Hop Station" width="210" style="display:block;width:210px;max-width:62%;height:auto;" /></td></tr>
<tr><td style="padding:32px 40px 6px;font-family:Helvetica,Arial,sans-serif;">
<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e11d1d;margin:0 0 10px;font-weight:bold;">DJ Mix Request</p>
<h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#141414;">Your segment&rsquo;s up &mdash; send us your mix &#127911;</h1>
<p style="font-size:15px;line-height:1.65;color:#3a3a3a;margin:0 0 18px;">{greeting} it&rsquo;s time to drop your mix for your <b>WCCG 104.5 FM</b> segment. Head to your DJ Portal and upload this week&rsquo;s file. Any file name works &mdash; we match it to your slot automatically and get it on the air.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;"><tr><td align="center" bgcolor="#e11d1d" style="border-radius:999px;">
<a href="https://wccg1045fm.com/my/dj" style="display:inline-block;padding:15px 38px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Upload My Mix &rarr;</a></td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#777;margin:0 0 6px;">Accepted formats: <b>.mp3, .wav, .m4a</b>. Drop it any time before your air date.</p>
<p style="font-size:13px;line-height:1.6;color:#777;margin:0;">Trouble uploading? Just reply to this email and we&rsquo;ll sort it out.</p></td></tr>
<tr><td style="padding:14px 40px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>
<tr><td style="padding:16px 40px 26px;font-family:Helvetica,Arial,sans-serif;"><p style="font-size:14px;color:#3a3a3a;margin:0;line-height:1.6;">Keep it locked,<br><b>WCCG 104.5 FM &mdash; The Hip Hop Station</b></p></td></tr>
<tr><td align="center" style="background:#0a0a0f;padding:26px 40px;">
<img src="cid:carsonlogo" alt="Carson Communications" width="155" style="display:block;width:155px;max-width:55%;height:auto;margin:0 auto 12px;" />
<p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8a8a96;margin:0;line-height:1.6;">&copy; {year} Carson Communications / WCCG 104.5 FM. All rights reserved.<br>Fayetteville, North Carolina</p></td></tr>
</table></td></tr></table></body></html>"""


def build_service():
    if not os.path.exists(TOKEN_FILE):
        print(f"ERROR: token not found at {TOKEN_FILE}")
        sys.exit(2)
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_FILE, "w") as fh:
            fh.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)


def send_one(service, to: str, dj_name: str) -> str:
    msg = MIMEMultipart("related")
    msg["To"] = to
    msg["From"] = "WCCG 104.5 FM <biggleem@gmail.com>"
    msg["Subject"] = SUBJECT
    alt = MIMEMultipart("alternative")
    msg.attach(alt)
    alt.attach(MIMEText(
        "Your WCCG 104.5 FM segment is coming up - upload your mix at "
        "https://wccg1045fm.com/my/dj (.mp3, .wav, .m4a).", "plain"))
    alt.attach(MIMEText(html_for(dj_name), "html"))
    for cid, path in [("wccglogo", WCCG_LOGO), ("carsonlogo", CARSON_LOGO)]:
        with open(path, "rb") as f:
            img = MIMEImage(f.read(), _subtype="png")
        img.add_header("Content-ID", f"<{cid}>")
        img.add_header("Content-Disposition", "inline", filename=f"{cid}.png")
        msg.attach(img)
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    sent = service.users().messages().send(userId="me", body={"raw": raw}).execute()
    return sent.get("id")


def fetch_roster() -> list:
    req = urllib.request.Request(
        STUDIO_SYNC_URL,
        data=json.dumps({"secret": STUDIO_SYNC_SECRET, "action": "roster"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read().decode())
    if not payload.get("ok"):
        raise RuntimeError(f"roster fetch failed: {payload}")
    return payload.get("djs", [])


def main():
    args = sys.argv[1:]

    if args and args[0] == "blast":
        include_admin = "--include-admin" in args
        logpath = r"D:\WCCG\sync-logs\dj-reminder.log"

        def logln(m: str):
            print(m, flush=True)
            try:
                os.makedirs(os.path.dirname(logpath), exist_ok=True)
                with open(logpath, "a", encoding="utf-8") as fh:
                    fh.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {m}\n")
            except Exception:
                pass

        service = build_service()
        roster = fetch_roster()
        recipients = [
            d for d in roster
            if include_admin or str(d.get("email", "")).lower() != ADMIN_EMAIL.lower()
        ]
        logln(f"Mixshow reminder blast: {len(recipients)} DJs "
              f"({len(roster)} on roster, admin {'included' if include_admin else 'skipped'})")
        ok, fail = 0, 0
        for d in recipients:
            name, email = d.get("name", ""), d.get("email", "")
            try:
                mid = send_one(service, email, name)
                ok += 1
                logln(f"  OK  {name:<18} {email:<32} id={mid}")
            except Exception as e:  # noqa: BLE001
                fail += 1
                logln(f"  ERR {name:<18} {email:<32} {e}")
            time.sleep(1.2)
        logln(f"DONE sent={ok} failed={fail} total={len(recipients)}")
        return

    # single send (default recipient = admin)
    to = args[0] if args else ADMIN_EMAIL
    dj_name = args[1] if len(args) > 1 else ""
    service = build_service()
    mid = send_one(service, to, dj_name)
    print(f"SENT id={mid} to={to} (logos embedded inline)")


if __name__ == "__main__":
    main()
