#!/usr/bin/env python3
r"""
send-dj-temppass — give every DJ who has NEVER signed in a working way in.

Provisions a strong, NON-EXPIRING temporary password for each DJ and emails it
to them. This sidesteps the two things that were breaking first-login:
  * one-time reset LINKS  -> email scanners (Yahoo/iCloud/Gmail) pre-fetch and
                             consume the single-use token -> "white screen".
  * reset CODES           -> expire ~1hr (otp_expired) before the DJ uses them.
A password doesn't expire, and a scanner reading the email can't use it up.

Passwords are generated SERVER-SIDE by the dj-setup-link edge function under the
service role -- this script never sees any Supabase secret. Outbound goes via
wccg_mailer (support@ SMTP, or the gmail-watcher fallback while support@'s
password file is empty).

Modes:
  python send-dj-temppass.py test          # sample email -> biggleem (NO db change)
  python send-dj-temppass.py one "DJ Weezy" # provision + email a single DJ
  python send-dj-temppass.py blast         # all never-signed-in active DJs
"""
import json
import os
import sys
import time
import urllib.request
from datetime import datetime

import wccg_mailer

FN_URL = "https://irjiqbmoohklagdegezz.supabase.co/functions/v1/dj-setup-link"
SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060"
LOGIN_URL = "https://wccg1045fm.com/login"
ADMIN_EMAIL = "biggleem@gmail.com"
SUBJECT = "\U0001F511 Your WCCG 104.5 FM sign-in is ready"

LOGO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "..", "apps", "web", "public", "images", "logos")
LOGOS = [("wccglogo", os.path.join(LOGO_DIR, "wccg-logo.png")),
         ("carsonlogo", os.path.join(LOGO_DIR, "carson-communications-logo.png"))]

# Active DJs with last_sign_in_at IS NULL (never once got in). The 3 DJs who have
# already signed in (Tony Neal, Ike GDA, VI) and the admin are intentionally NOT
# here -- they have working credentials and must not be clobbered.
ROSTER = [
    ("DJ Chuck", "c_murphy00@yahoo.com", "266f461f-9b36-4a42-a497-9733d3f251fe"),
    ("DJ Chuck T", "djchuckt@gmail.com", "e11ee623-9bcd-4567-8606-b4b79da66e77"),
    ("DJ Corleone", "cjgarris3@hotmail.com", "8a7403d8-8d29-40c1-8e8d-3a9567f6026c"),
    ("DJ Crisco", "Cirsco1@gmail.com", "3d65e3b8-5807-42ac-918c-94cb453ba919"),
    ("DJ Daddy Black", "djdaddyblack005@gmail.com", "bf80d0fd-445d-464a-84da-fee754bb075b"),
    ("DJ Daffie", "djdaffiebookings@gmail.com", "a8d68e5a-807f-4237-94aa-0e0fbe30136c"),
    ("DJ Dane Dinero", "danedinero@icloud.com", "868e1ce3-ae52-43d3-91d5-6eadddf9238a"),
    ("DJ Drop", "djdropnc@gmail.com", "483ae76d-b249-456a-898b-1de22cddbaed"),
    ("DJ Itanist", "itanmeade@gmail.com", "ab1a93a1-d89b-4b88-bea6-b4db03cc8ab3"),
    ("DJ Izzy Nice", "unitsinthecity@gmail.com", "584e0c0a-06dc-4e1b-8aa7-d864d7d45d55"),
    ("DJ Jay B", "jermainebright08@yahoo.com", "2adf9e5b-498e-4ea0-874a-e750e4b43347"),
    ("DJ Juice", "Im_juice@icloud.com", "6c2b4cb2-e3e2-43a2-82ac-5e421058d32c"),
    ("DJ KillaKo", "Djkillako2017@gmail.com", "3c7b14ea-07b6-459a-bd27-1a37f70e34b0"),
    ("DJ KingViv", "Kingviv93@gmail.com", "467467a3-2834-4803-b825-eadd62147d0b"),
    ("DJ KVNG", "youngkvngonthebeat@gmail.com", "b3b8d51a-727b-4b3a-995c-1e600e751974"),
    ("DJ LJay", "Djlj242@gmail.com", "11a07ee0-8e67-4dc6-9052-75f3770f7e1f"),
    ("DJ LouDiamonds", "ruggedlocks@gmail.com", "0955242b-2487-44a8-bedf-7f60a3aa4ae3"),
    ("DJ Official", "danielwilliams05@gmail.com", "a1f76157-b64d-4b79-966c-96cf0780914c"),
    ("DJ Rayn", "deejrayn@gmail.com", "d8a954a9-0389-4cbe-8f96-3689a885c0f1"),
    ("DJ Ricoveli", "djricoveli@gmail.com", "bfe93b6e-6f1f-41bb-ba29-f53a94a73201"),
    ("DJ SpinWiz", "fleetdjspinwiz@gmail.com", "55b77f90-94ec-4702-922f-ff67bdac4f89"),
    ("DJ Swayzee", "Ewynn22@gmail.com", "78af40f7-6fef-4d51-b61d-62f1ee4bf9cb"),
    ("DJ T-Money", "Djtmoney910@gmail.com", "69e7c8f0-26c3-424e-ad6f-cece5c2c1347"),
    ("DJ TommyGee Mix", "tommygeemixx@gmail.com", "e026e318-0ab2-401e-b129-79069aaef0b7"),
    ("DJ Tone Lo", "booktonelo@gmail.com", "5fc0d7ce-998f-41a5-b861-d12909277d27"),
    ("DJ Weezy", "weezy.fleetdjs@gmail.com", "9e046cc3-3dc0-4db2-93cc-6d41953eed55"),
    ("DJ Whosane", "kotcokeboydjwhosane@gmail.com", "e3abd8d1-0151-4ae7-8285-80bb41027a0d"),
    ("DJ Wolf", "Djwolfcp4life@gmail.com", "da87a515-a449-4827-aac9-48b7aa9d5c2f"),
    ("DJ YaFeelMe", "Reggielee3rd@gmail.com", "ef31cfcd-a8d6-4a15-bce4-1a1cb73a39c1"),
    ("DJ Yodo", "Theyodoshow@gmail.com", "eab6847c-6471-4b18-9908-163886f978f1"),
]


def setpass(user_id: str):
    """Ask the edge function to set a fresh temp password; returns (email, password)."""
    req = urllib.request.Request(
        FN_URL,
        data=json.dumps({"secret": SECRET, "action": "setpass", "user_id": user_id}).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        p = json.loads(r.read().decode())
    if not p.get("ok"):
        raise RuntimeError(f"setpass failed: {p}")
    return p["email"], p["password"]


def html_for(dj_name: str, email: str, password: str) -> str:
    year = datetime.now().year
    greeting = f"You&rsquo;re in, {dj_name}." if dj_name else "You&rsquo;re in."
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e9e9ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e9ee;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td align="center" style="background:#ffffff;padding:30px 0 22px;border-bottom:4px solid #e11d1d;">
<img src="cid:wccglogo" alt="WCCG 104.5 FM - The Hip Hop Station" width="210" style="display:block;width:210px;max-width:62%;height:auto;" /></td></tr>
<tr><td style="padding:32px 40px 6px;font-family:Helvetica,Arial,sans-serif;">
<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e11d1d;margin:0 0 10px;font-weight:bold;">DJ Portal &middot; Sign-in</p>
<h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#141414;">{greeting} &#128272;</h1>
<p style="font-size:15px;line-height:1.65;color:#3a3a3a;margin:0 0 18px;">Here&rsquo;s everything you need to sign in to your <b>WCCG 104.5 FM</b> DJ Portal and upload your mixes. Use the password below &mdash; it doesn&rsquo;t expire, so take your time.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td style="background:#f5f5f7;border:1px solid #e3e3e8;border-radius:10px;padding:18px 20px;font-family:Helvetica,Arial,sans-serif;">
<p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#999;">Your email</p>
<p style="margin:0 0 14px;font-size:16px;color:#141414;font-family:'Courier New',monospace;">{email}</p>
<p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#999;">Temporary password</p>
<p style="margin:0;font-size:22px;color:#e11d1d;font-family:'Courier New',monospace;font-weight:bold;letter-spacing:1px;">{password}</p>
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td align="center" bgcolor="#e11d1d" style="border-radius:999px;">
<a href="{LOGIN_URL}" style="display:inline-block;padding:15px 40px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Sign In &amp; Upload My Mix &rarr;</a></td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#555;margin:0 0 6px;">Go to <b>wccg1045fm.com/login</b>, enter the email and password above, and you&rsquo;re in. Then head to <b>My DJ</b> to drop your weekly mix &mdash; any file name works, we match it to your slot.</p>
<p style="font-size:13px;line-height:1.6;color:#777;margin:0;">This password is just to get you started &mdash; want a different one? Reply to this email or write <b>support@wccg1045fm.com</b> and we&rsquo;ll sort it out fast.</p></td></tr>
<tr><td style="padding:14px 40px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>
<tr><td style="padding:16px 40px 26px;font-family:Helvetica,Arial,sans-serif;"><p style="font-size:14px;color:#3a3a3a;margin:0;line-height:1.6;">Keep it locked,<br><b>WCCG 104.5 FM &mdash; The Hip Hop Station</b></p></td></tr>
<tr><td align="center" style="background:#0a0a0f;padding:26px 40px;">
<img src="cid:carsonlogo" alt="Carson Communications" width="155" style="display:block;width:155px;max-width:55%;height:auto;margin:0 auto 12px;" />
<p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8a8a96;margin:0;line-height:1.6;">&copy; {year} Carson Communications / WCCG 104.5 FM. All rights reserved.<br>Fayetteville, North Carolina</p></td></tr>
</table></td></tr></table></body></html>"""


def text_for(dj_name: str, email: str, password: str) -> str:
    return (f"You're in{(', ' + dj_name) if dj_name else ''}! Sign in to your WCCG 104.5 FM DJ Portal:\n\n"
            f"  Login:    {LOGIN_URL}\n  Email:    {email}\n  Password: {password}\n\n"
            "This password doesn't expire. Once you're in, go to 'My DJ' to upload your weekly mix "
            "(any file name works). Want a different password? Reply here or email support@wccg1045fm.com.")


def send_one(name: str, email: str, password: str) -> str:
    return wccg_mailer.send_mail(email, SUBJECT, html_for(name, email, password),
                                 text_for(name, email, password), LOGOS)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"

    if mode == "test":
        send_one("DJ Weezy", ADMIN_EMAIL, "Wccg-SAMPLE99")
        print(f"TEST (sample, no db change) sent to {ADMIN_EMAIL}")
        return

    if mode == "one":
        want = (sys.argv[2] if len(sys.argv) > 2 else "").lower()
        row = next((r for r in ROSTER if r[0].lower() == want), None)
        if not row:
            print(f"No never-signed-in DJ named {want!r}. Options:")
            for r in ROSTER:
                print("  ", r[0])
            sys.exit(1)
        name, email, uid = row
        em, pw = setpass(uid)
        via = send_one(name, em, pw)
        print(f"OK {name} <{em}> provisioned + emailed (via {via})")
        return

    if mode == "blast":
        logpath = r"D:\WCCG\sync-logs\dj-temppass.log"

        def logln(m: str):
            print(m, flush=True)
            try:
                os.makedirs(os.path.dirname(logpath), exist_ok=True)
                with open(logpath, "a", encoding="utf-8") as fh:
                    fh.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {m}\n")
            except Exception:
                pass

        logln(f"Temp-password blast: {len(ROSTER)} never-signed-in DJs")
        ok, fail = 0, 0
        for name, email, uid in ROSTER:
            try:
                em, pw = setpass(uid)
                via = send_one(name, em, pw)
                ok += 1
                logln(f"  OK  {name:<18} {em:<34} via {via}")
            except Exception as e:  # noqa: BLE001
                fail += 1
                logln(f"  ERR {name:<18} {email:<34} {e}")
            time.sleep(1.3)
        logln(f"DONE provisioned+sent={ok} failed={fail} total={len(ROSTER)}")
        return

    print("Unknown mode. Use: test | one <name> | blast")
    sys.exit(1)


if __name__ == "__main__":
    main()
