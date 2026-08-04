#!/usr/bin/env python3
r"""
send-dj-welcome — welcome email introducing support@wccg1045fm.com as the place
DJs submit help requests / "tickets". Sent FROM support@ (station SMTP via
wccg_mailer). Replies land back in support@ and are resolved from there.

Put the support@ password in C:\Users\wccg1\.wccg-mail\smtp-pass.txt first.

Modes:
  python send-dj-welcome.py test [djName]   # one copy to biggleem@gmail.com
  python send-dj-welcome.py blast           # all active DJs EXCEPT admin
  python send-dj-welcome.py blast-all       # all active DJs incl. admin
"""
import os
import sys
import time
from datetime import datetime

import wccg_mailer

LOGO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "..", "apps", "web", "public", "images", "logos")
LOGOS = [("wccglogo", os.path.join(LOGO_DIR, "wccg-logo.png")),
         ("carsonlogo", os.path.join(LOGO_DIR, "carson-communications-logo.png"))]
ADMIN_EMAIL = "biggleem@gmail.com"
SUBJECT = "\U0001F44B Welcome to WCCG 104.5 FM — help is one email away"

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


def html_for(dj_name: str) -> str:
    year = datetime.now().year
    greeting = f"Welcome, {dj_name}!" if dj_name else "Welcome!"
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e9e9ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e9ee;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td align="center" style="background:#ffffff;padding:30px 0 22px;border-bottom:4px solid #e11d1d;">
<img src="cid:wccglogo" alt="WCCG 104.5 FM - The Hip Hop Station" width="210" style="display:block;width:210px;max-width:62%;height:auto;" /></td></tr>
<tr><td style="padding:32px 40px 6px;font-family:Helvetica,Arial,sans-serif;">
<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e11d1d;margin:0 0 10px;font-weight:bold;">We&rsquo;ve got you</p>
<h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#141414;">{greeting} &#128075;</h1>
<p style="font-size:15px;line-height:1.65;color:#3a3a3a;margin:0 0 16px;">You&rsquo;re all set on the new <b>WCCG 104.5 FM</b> platform. Upload your weekly mixes anytime at <b>wccg1045fm.com/my/dj</b> &mdash; and if you ever get stuck, you&rsquo;ve got a real support desk.</p>
<p style="font-size:15px;line-height:1.65;color:#3a3a3a;margin:0 0 6px;"><b>Need help with anything?</b></p>
<p style="font-size:15px;line-height:1.65;color:#3a3a3a;margin:0 0 18px;">Login trouble, an upload that won&rsquo;t go through, a question about your slots &mdash; just email <b>support@wccg1045fm.com</b> and we&rsquo;ll get you sorted fast. Every message opens a support ticket we track until it&rsquo;s resolved.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:2px 0 18px;"><tr><td align="center" bgcolor="#e11d1d" style="border-radius:999px;">
<a href="mailto:support@wccg1045fm.com?subject=WCCG%20Support%20Request" style="display:inline-block;padding:15px 38px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Email Support &rarr;</a></td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#777;margin:0;">Save <b>support@wccg1045fm.com</b> in your contacts so our replies always reach you. Welcome aboard!</p></td></tr>
<tr><td style="padding:14px 40px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>
<tr><td style="padding:16px 40px 26px;font-family:Helvetica,Arial,sans-serif;"><p style="font-size:14px;color:#3a3a3a;margin:0;line-height:1.6;">Keep it locked,<br><b>WCCG 104.5 FM &mdash; The Hip Hop Station</b></p></td></tr>
<tr><td align="center" style="background:#0a0a0f;padding:26px 40px;">
<img src="cid:carsonlogo" alt="Carson Communications" width="155" style="display:block;width:155px;max-width:55%;height:auto;margin:0 auto 12px;" />
<p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8a8a96;margin:0;line-height:1.6;">&copy; {year} Carson Communications / WCCG 104.5 FM. All rights reserved.<br>Fayetteville, North Carolina</p></td></tr>
</table></td></tr></table></body></html>"""


def text_for(dj_name: str) -> str:
    return (f"Welcome to WCCG 104.5 FM{(', ' + dj_name) if dj_name else ''}! Upload your mixes at "
            "https://wccg1045fm.com/my/dj . Need help with anything - login, uploads, your slots? "
            "Email support@wccg1045fm.com and we'll resolve it fast.")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"
    if mode == "test":
        dj = sys.argv[2] if len(sys.argv) > 2 else "DJ Weezy"
        wccg_mailer.send_mail(ADMIN_EMAIL, SUBJECT, html_for(dj), text_for(dj), LOGOS)
        print(f"TEST sent to={ADMIN_EMAIL} (from support@wccg1045fm.com)")
        return
    if mode in ("blast", "blast-all"):
        recipients = list(ROSTER) + ([("DJ Admin", ADMIN_EMAIL)] if mode == "blast-all" else [])
        print(f"Welcome blast (from support@): {len(recipients)} DJs")
        ok, fail = 0, 0
        for name, email in recipients:
            try:
                wccg_mailer.send_mail(email, SUBJECT, html_for(name), text_for(name), LOGOS)
                ok += 1; print(f"  OK  {name:<18} {email}")
            except Exception as e:  # noqa: BLE001
                fail += 1; print(f"  ERR {name:<18} {email:<32} {e}")
            time.sleep(1.3)
        print(f"DONE sent={ok} failed={fail} total={len(recipients)}")
        return
    print("Unknown mode. Use: test | blast | blast-all"); sys.exit(1)


if __name__ == "__main__":
    main()
