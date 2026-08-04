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

The roster of who still needs this is fetched LIVE from the dj-setup-link edge
function each run -- see roster(). It used to be hardcoded, which meant a rerun
would reset the password of every DJ who had signed in since the list was
written.

The sign-in CTA carries ?next=/my/dj, so the DJ lands on the upload page rather
than the homepage.

Modes:
  python send-dj-temppass.py test          # sample email -> biggleem (NO db change)
  python send-dj-temppass.py list          # who still hasn't signed in (no changes)
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

SUPA_URL = "https://irjiqbmoohklagdegezz.supabase.co"
FN_URL = f"{SUPA_URL}/functions/v1/dj-setup-link"
SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060"
# ?next= is honored by the login form (login-form.tsx), so signing in drops the
# DJ straight onto the upload page instead of the homepage.
LOGIN_URL = "https://wccg1045fm.com/login?next=/my/dj"
ADMIN_EMAIL = "biggleem@gmail.com"
SUBJECT = "\U0001F511 Your WCCG 104.5 FM sign-in is ready"

LOGO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "..", "apps", "web", "public", "images", "logos")
LOGOS = [("wccglogo", os.path.join(LOGO_DIR, "wccg-logo.png")),
         ("carsonlogo", os.path.join(LOGO_DIR, "carson-communications-logo.png"))]

# The roster is fetched at RUNTIME (dj-setup-link action "never_signed_in") --
# never hardcoded. A hardcoded snapshot goes stale the moment a DJ logs in, and
# re-running the blast against a stale list CLOBBERS the working password of
# every DJ who has since gotten in. Ask the server every time. Fetching also
# keeps the 30-odd DJ emails + user_ids (PII) out of this file.
def roster():
    """Active DJs whose auth user has never signed in -> [(name, email, user_id)]."""
    req = urllib.request.Request(
        FN_URL,
        data=json.dumps({"secret": SECRET, "action": "never_signed_in"}).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        p = json.loads(r.read().decode())
    if not p.get("ok"):
        raise RuntimeError(f"roster fetch failed: {p}")
    return [(d["name"], d["email"], d["user_id"]) for d in p["djs"]]


def setpass(user_id: str, verify: bool = True):
    """Set a fresh temp password; returns (email, password, verified).

    verify happens SERVER-SIDE on purpose. Signing in to test the credential
    stamps last_sign_in_at, so doing it from here would make every DJ we touch
    look like they'd logged in. The edge function records its own sign-in as
    user_metadata.temppass_verified_at, which roster() then discounts.
    """
    req = urllib.request.Request(
        FN_URL,
        data=json.dumps({"secret": SECRET, "action": "setpass",
                         "user_id": user_id, "verify": verify}).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        p = json.loads(r.read().decode())
    if not p.get("ok"):
        raise RuntimeError(f"setpass failed: {p}")
    return p["email"], p["password"], bool(p.get("verified", not verify))


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
<p style="font-size:13px;line-height:1.6;color:#555;margin:0 0 6px;">Tap the button, enter the email and password above, and you land <b>straight on your upload page</b> &mdash; your slots for the week are already waiting. Drop your mix on any slot; any file name works, we match it to your slot for you.</p>
<p style="font-size:13px;line-height:1.6;color:#777;margin:0;">This password is just to get you started &mdash; want a different one? Reply to this email or write <b>support@wccg1045fm.com</b> and we&rsquo;ll sort it out fast.</p></td></tr>
<tr><td style="padding:14px 40px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>
<tr><td style="padding:16px 40px 26px;font-family:Helvetica,Arial,sans-serif;"><p style="font-size:14px;color:#3a3a3a;margin:0;line-height:1.6;">Keep it locked,<br><b>WCCG 104.5 FM &mdash; The Hip Hop Station</b></p></td></tr>
<tr><td align="center" style="background:#0a0a0f;padding:26px 40px;">
<img src="cid:carsonlogo" alt="Carson Communications" width="155" style="display:block;width:155px;max-width:55%;height:auto;margin:0 auto 12px;" />
<p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8a8a96;margin:0;line-height:1.6;">&copy; {year} Carson Communications / WCCG 104.5 FM. All rights reserved.<br>Fayetteville, North Carolina</p></td></tr>
</table></td></tr></table></body></html>"""


def text_for(dj_name: str, email: str, password: str) -> str:
    return (f"You're in{(', ' + dj_name) if dj_name else ''}! Sign in to your WCCG 104.5 FM DJ Portal:\n\n"
            f"  Upload:   {LOGIN_URL}\n  Email:    {email}\n  Password: {password}\n\n"
            "That link takes you straight to your upload page once you sign in -- your slots for the "
            "week are already waiting, and any file name works. This password doesn't expire. "
            "Want a different one? Reply here or email support@wccg1045fm.com.")


def send_one(name: str, email: str, password: str) -> str:
    return wccg_mailer.send_mail(email, SUBJECT, html_for(name, email, password),
                                 text_for(name, email, password), LOGOS)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"

    if mode == "test":
        send_one("DJ Weezy", ADMIN_EMAIL, "Wccg-SAMPLE99")
        print(f"TEST (sample, no db change) sent to {ADMIN_EMAIL}")
        return

    if mode == "list":
        rows = roster()
        print(f"{len(rows)} active DJs have never signed in:")
        for name, email, _uid in rows:
            print(f"  {name:<18} {email}")
        return

    if mode == "one":
        want = (sys.argv[2] if len(sys.argv) > 2 else "").lower()
        rows = roster()
        row = next((r for r in rows if r[0].lower() == want), None)
        if not row:
            print(f"No never-signed-in DJ named {want!r}. Options:")
            for r in rows:
                print("  ", r[0])
            sys.exit(1)
        name, email, uid = row
        em, pw, verified = setpass(uid)
        if not verified:
            print(f"ABORT {name} <{em}>: login did not verify, not emailing a dud password")
            sys.exit(2)
        via = send_one(name, em, pw)
        print(f"OK {name} <{em}> provisioned + verified + emailed (via {via})")
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

        rows = roster()
        logln(f"Temp-password blast: {len(rows)} never-signed-in DJs")
        ok, fail = 0, 0
        for name, email, uid in rows:
            try:
                em, pw, verified = setpass(uid)
                if not verified:
                    raise RuntimeError("login did not verify -- not emailing a dud password")
                via = send_one(name, em, pw)
                ok += 1
                logln(f"  OK  {name:<18} {em:<34} verified, via {via}")
            except Exception as e:  # noqa: BLE001
                fail += 1
                logln(f"  ERR {name:<18} {email:<34} {e}")
            time.sleep(1.3)
        logln(f"DONE provisioned+sent={ok} failed={fail} total={len(rows)}")
        return

    print("Unknown mode. Use: test | list | one <name> | blast")
    sys.exit(1)


if __name__ == "__main__":
    main()
