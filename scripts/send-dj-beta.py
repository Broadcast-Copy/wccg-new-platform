#!/usr/bin/env python3
r"""
send-dj-beta — beta-access announcement from support@wccg1045fm.com to on-air DJs.

Outbound via wccg_mailer (station SMTP, mail.wccg1045fm.com:465). Put the support@
password in C:\Users\wccg1\.wccg-mail\smtp-pass.txt (one line) first. Each DJ gets
an individual, personalized message (own To:) with inline CID logos.

Modes:
  python send-dj-beta.py test [djName]   # one copy to biggleem@gmail.com
  python send-dj-beta.py blast           # all active DJs EXCEPT the admin account
  python send-dj-beta.py blast-all       # all active DJs incl. admin (biggleem)
"""
import os
import sys
import time
from datetime import datetime

import wccg_mailer

LOGO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "..", "apps", "web", "public", "images", "logos")
WCCG_LOGO = os.path.join(LOGO_DIR, "wccg-logo.png")
CARSON_LOGO = os.path.join(LOGO_DIR, "carson-communications-logo.png")
LOGOS = [("wccglogo", WCCG_LOGO), ("carsonlogo", CARSON_LOGO)]
ADMIN_EMAIL = "biggleem@gmail.com"
SUBJECT = "\U0001F3A7 You're in the beta — WCCG 104.5 FM DJ Portal"

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
    greeting = f"Hey {dj_name}," if dj_name else "Hey DJ,"
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e9e9ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e9ee;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td align="center" style="background:#ffffff;padding:30px 0 22px;border-bottom:4px solid #e11d1d;">
<img src="cid:wccglogo" alt="WCCG 104.5 FM - The Hip Hop Station" width="210" style="display:block;width:210px;max-width:62%;height:auto;" /></td></tr>
<tr><td style="padding:32px 40px 6px;font-family:Helvetica,Arial,sans-serif;">
<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e11d1d;margin:0 0 10px;font-weight:bold;">DJ Portal &middot; Beta Access</p>
<h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#141414;">You&rsquo;re in the beta &#127911;</h1>
<p style="font-size:15px;line-height:1.65;color:#3a3a3a;margin:0 0 16px;">{greeting} the new <b>WCCG 104.5 FM</b> platform is live &mdash; and you&rsquo;ve got early <b>beta access</b> to your DJ Portal. You can now upload your weekly mixes online instead of emailing files.</p>
<p style="font-size:14px;line-height:1.4;color:#3a3a3a;margin:0 0 6px;font-weight:bold;">In your portal you can:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#3a3a3a;line-height:1.5;">
<tr><td style="padding:2px 8px 2px 0;color:#e11d1d;">&#10003;</td><td style="padding:2px 0;">Upload your mix for each slot &mdash; any file name works, we match it automatically</td></tr>
<tr><td style="padding:2px 8px 2px 0;color:#e11d1d;">&#10003;</td><td style="padding:2px 0;">See your slots and this week&rsquo;s file codes</td></tr>
<tr><td style="padding:2px 8px 2px 0;color:#e11d1d;">&#10003;</td><td style="padding:2px 0;">Get notified the moment your mix syncs to air</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:2px 0 20px;"><tr><td align="center" bgcolor="#e11d1d" style="border-radius:999px;">
<a href="https://wccg1045fm.com/my/dj" style="display:inline-block;padding:15px 38px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Open My DJ Portal &rarr;</a></td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#555;margin:0 0 6px;"><b>Signing in:</b> use this email address. First time? Tap <b>&ldquo;Forgot password&rdquo;</b> on the login page to set your password.</p>
<p style="font-size:13px;line-height:1.6;color:#777;margin:0;">We&rsquo;re in beta &mdash; reply to this email with any bugs or feedback. It shapes what ships next.</p></td></tr>
<tr><td style="padding:14px 40px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>
<tr><td style="padding:16px 40px 26px;font-family:Helvetica,Arial,sans-serif;"><p style="font-size:14px;color:#3a3a3a;margin:0;line-height:1.6;">Keep it locked,<br><b>WCCG 104.5 FM &mdash; The Hip Hop Station</b></p></td></tr>
<tr><td align="center" style="background:#0a0a0f;padding:26px 40px;">
<img src="cid:carsonlogo" alt="Carson Communications" width="155" style="display:block;width:155px;max-width:55%;height:auto;margin:0 auto 12px;" />
<p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8a8a96;margin:0;line-height:1.6;">&copy; {year} Carson Communications / WCCG 104.5 FM. All rights reserved.<br>Fayetteville, North Carolina</p></td></tr>
</table></td></tr></table></body></html>"""


def text_for(dj_name: str) -> str:
    return (f"Hey {dj_name or 'DJ'} - you've got beta access to the WCCG 104.5 FM DJ Portal. "
            "Upload your weekly mixes at https://wccg1045fm.com/my/dj . Sign in with this email "
            "(first time? use 'Forgot password'). Reply with feedback - we're in beta.")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"

    if mode == "test":
        dj = sys.argv[2] if len(sys.argv) > 2 else "DJ Weezy"
        wccg_mailer.send_mail(ADMIN_EMAIL, SUBJECT, html_for(dj), text_for(dj), LOGOS)
        print(f"TEST sent to={ADMIN_EMAIL} (from support@wccg1045fm.com)")
        return

    if mode in ("blast", "blast-all"):
        recipients = list(ROSTER) + ([("DJ Admin", ADMIN_EMAIL)] if mode == "blast-all" else [])
        print(f"Beta blast (from support@): {len(recipients)} DJs")
        ok, fail = 0, 0
        for name, email in recipients:
            try:
                wccg_mailer.send_mail(email, SUBJECT, html_for(name), text_for(name), LOGOS)
                ok += 1
                print(f"  OK  {name:<18} {email}")
            except Exception as e:  # noqa: BLE001
                fail += 1
                print(f"  ERR {name:<18} {email:<32} {e}")
            time.sleep(1.3)
        print(f"DONE sent={ok} failed={fail} total={len(recipients)}")
        return

    print("Unknown mode. Use: test | blast | blast-all"); sys.exit(1)


if __name__ == "__main__":
    main()
