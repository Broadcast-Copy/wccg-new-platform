#!/usr/bin/env python3
r"""
send-dj-setup — email each DJ a set-password CODE from support@wccg1045fm.com.

Why a code (not a link): one-time recovery LINKS get pre-consumed by email-provider
link scanners -> "expired link" white screen. A code can't be used up by a scanner.
The dj-setup-link edge function admin-generates the code (no email sent, no rate
limit); we deliver it via the station SMTP (support@wccg1045fm.com). The DJ goes to
/reset-password, enters email + code (verifyOtp type=recovery), and sets a password.

Outbound is via wccg_mailer (mail.wccg1045fm.com:465). Put the support@ password in
C:\Users\wccg1\.wccg-mail\smtp-pass.txt (one line) before running.

Modes:
  python send-dj-setup.py test [djName]      # one to biggleem@gmail.com
  python send-dj-setup.py blast              # all DJs EXCEPT the admin account
  python send-dj-setup.py blast-all          # all DJs incl. admin
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime

import wccg_mailer

LOGO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "..", "apps", "web", "public", "images", "logos")
WCCG_LOGO = os.path.join(LOGO_DIR, "wccg-logo.png")
CARSON_LOGO = os.path.join(LOGO_DIR, "carson-communications-logo.png")
ADMIN_EMAIL = "biggleem@gmail.com"
SUBJECT = "\U0001F510 Your WCCG 104.5 FM DJ Portal set-up code"
SETUP_LINK_URL = "https://irjiqbmoohklagdegezz.supabase.co/functions/v1/dj-setup-link"
SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060"
PORTAL_BASE = "https://wccg1045fm.com/reset-password"

ROSTER = [
    ("DJ Chuck", "c_murphy00@yahoo.com"), ("DJ Chuck T", "djchuckt@gmail.com"),
    ("DJ Corleone", "cjgarris3@hotmail.com"), ("DJ Crisco", "Cirsco1@gmail.com"),
    ("DJ Daddy Black", "djdaddyblack005@gmail.com"), ("DJ Daffie", "djdaffiebookings@gmail.com"),
    ("DJ Dane Dinero", "danedinero@icloud.com"), ("DJ Drop", "djdropnc@gmail.com"),
    ("DJ Ike GDA", "djikegdamusic@gmail.com"), ("DJ Itanist", "itanmeade@gmail.com"),
    ("DJ Izzy Nice", "unitsinthecity@gmail.com"), ("DJ Jay B", "jermainebright08@yahoo.com"),
    ("DJ Juice", "Im_juice@icloud.com"), ("DJ KillaKo", "Djkillako2017@gmail.com"),
    ("DJ KingViv", "Kingviv93@gmail.com"), ("DJ KVNG", "youngkvngonthebeat@gmail.com"),
    ("DJ LJay", "Djlj242@gmail.com"), ("DJ LouDiamonds", "ruggedlocks@gmail.com"),
    ("DJ Official", "danielwilliams05@gmail.com"), ("DJ Rayn", "deejrayn@gmail.com"),
    ("DJ Ricoveli", "djricoveli@gmail.com"), ("DJ SpinWiz", "fleetdjspinwiz@gmail.com"),
    ("DJ Swayzee", "Ewynn22@gmail.com"), ("DJ T-Money", "Djtmoney910@gmail.com"),
    ("DJ TommyGee Mix", "tommygeemixx@gmail.com"), ("DJ Tone Lo", "booktonelo@gmail.com"),
    ("DJ Tony Neal", "tnealmusic@gmail.com"), ("DJ VI", "Djvi914@gmail.com"),
    ("DJ Weezy", "weezy.fleetdjs@gmail.com"), ("DJ Whosane", "kotcokeboydjwhosane@gmail.com"),
    ("DJ Wolf", "Djwolfcp4life@gmail.com"), ("DJ YaFeelMe", "Reggielee3rd@gmail.com"),
    ("DJ Yodo", "Theyodoshow@gmail.com"),
]
LOGOS = [("wccglogo", WCCG_LOGO), ("carsonlogo", CARSON_LOGO)]


def get_code(email: str) -> str:
    req = urllib.request.Request(
        SETUP_LINK_URL,
        data=json.dumps({"secret": SECRET, "email": email}).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read().decode())
    if not payload.get("ok") or not payload.get("code"):
        raise RuntimeError(f"code gen failed for {email}: {payload}")
    return str(payload["code"])


def html_for(dj_name: str, code: str, portal_url: str) -> str:
    year = datetime.now().year
    greeting = f"Hey {dj_name}," if dj_name else "Hey DJ,"
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e9e9ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e9ee;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td align="center" style="background:#ffffff;padding:30px 0 22px;border-bottom:4px solid #e11d1d;">
<img src="cid:wccglogo" alt="WCCG 104.5 FM - The Hip Hop Station" width="210" style="display:block;width:210px;max-width:62%;height:auto;" /></td></tr>
<tr><td style="padding:32px 40px 6px;font-family:Helvetica,Arial,sans-serif;">
<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e11d1d;margin:0 0 10px;font-weight:bold;">DJ Portal &middot; Account Setup</p>
<h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#141414;">Set your password &#128272;</h1>
<p style="font-size:15px;line-height:1.65;color:#3a3a3a;margin:0 0 16px;">{greeting} your <b>WCCG 104.5 FM</b> DJ Portal account is ready. Use the code below to set your password and start uploading your mixes.</p>
<p style="font-size:13px;color:#777;margin:0 0 6px;font-weight:bold;">Your code:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr><td style="background:#f3f3f7;border:1px solid #e2e2e8;border-radius:10px;padding:14px 26px;font-family:Consolas,Menlo,monospace;font-size:34px;font-weight:bold;letter-spacing:8px;color:#141414;">{code}</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr><td align="center" bgcolor="#e11d1d" style="border-radius:999px;">
<a href="{portal_url}" style="display:inline-block;padding:15px 38px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Set My Password &rarr;</a></td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#555;margin:0 0 6px;"><b>How:</b> tap the button (or go to <b>wccg1045fm.com/reset-password</b>), enter your email and the code above, then choose a password.</p>
<p style="font-size:13px;line-height:1.6;color:#777;margin:0;">The code is time-limited &mdash; if it stops working, reply and we&rsquo;ll send a fresh one. After setup, sign in anytime at <b>wccg1045fm.com/my/dj</b>.</p></td></tr>
<tr><td style="padding:14px 40px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>
<tr><td style="padding:16px 40px 26px;font-family:Helvetica,Arial,sans-serif;"><p style="font-size:14px;color:#3a3a3a;margin:0;line-height:1.6;">Keep it locked,<br><b>WCCG 104.5 FM &mdash; The Hip Hop Station</b></p></td></tr>
<tr><td align="center" style="background:#0a0a0f;padding:26px 40px;">
<img src="cid:carsonlogo" alt="Carson Communications" width="155" style="display:block;width:155px;max-width:55%;height:auto;margin:0 auto 12px;" />
<p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8a8a96;margin:0;line-height:1.6;">&copy; {year} Carson Communications / WCCG 104.5 FM. All rights reserved.<br>Fayetteville, North Carolina</p></td></tr>
</table></td></tr></table></body></html>"""


def send_one(to: str, dj_name: str) -> str:
    code = get_code(to)
    portal_url = f"{PORTAL_BASE}?email={urllib.parse.quote(to)}"
    text = (f"Hey {dj_name or 'DJ'} - your WCCG 104.5 FM DJ Portal code is {code}. "
            f"Go to {portal_url} , enter your email + this code, then choose a password. "
            "Sign in afterward at https://wccg1045fm.com/my/dj")
    wccg_mailer.send_mail(to, SUBJECT, html_for(dj_name, code, portal_url), text, LOGOS)
    return code


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"

    if mode == "test":
        dj = sys.argv[2] if len(sys.argv) > 2 else "DJ Weezy"
        send_one(ADMIN_EMAIL, dj)
        print(f"TEST sent to={ADMIN_EMAIL} (from support@wccg1045fm.com)")
        return

    if mode in ("blast", "blast-all"):
        logpath = r"D:\WCCG\sync-logs\dj-setup.log"
        def logln(m):
            print(m, flush=True)
            try:
                os.makedirs(os.path.dirname(logpath), exist_ok=True)
                open(logpath, "a", encoding="utf-8").write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {m}\n")
            except Exception:
                pass
        recipients = list(ROSTER) + ([("DJ Admin", ADMIN_EMAIL)] if mode == "blast-all" else [])
        logln(f"Setup-code blast (from support@): {len(recipients)} DJs")
        ok, fail = 0, 0
        for name, email in recipients:
            try:
                send_one(email, name); ok += 1
                logln(f"  OK  {name:<18} {email}")
            except Exception as e:  # noqa: BLE001
                fail += 1
                logln(f"  ERR {name:<18} {email:<32} {e}")
            time.sleep(1.3)
        logln(f"DONE sent={ok} failed={fail} total={len(recipients)}")
        return

    print("Unknown mode. Use: test | blast | blast-all"); sys.exit(1)


if __name__ == "__main__":
    main()
