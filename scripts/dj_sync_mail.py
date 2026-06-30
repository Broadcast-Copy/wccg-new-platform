#!/usr/bin/env python3
r"""
dj_sync_mail — email a DJ when their uploaded mix has synced to the WCCG
broadcast system (downloaded to the playout carts + scheduled to air).

Used by:
  * scripts/sync-dj-drops.py — fires automatically for each DJ whose drop(s)
    newly sync on a given run (one email per DJ, listing the file part(s)).
  * CLI one-offs, e.g. a DJ who synced before this feature existed:
        python dj_sync_mail.py test                                  # sample -> biggleem (no DB)
        python dj_sync_mail.py one dj-wolf "DJB_76071,DJB_76072" "Thursday, July 2 at 5:00 PM"

Outbound goes through wccg_mailer (support@ SMTP, or the gmail-watcher token
fallback while support@'s password file is empty). DJ email addresses are
fetched AT RUN TIME from the studio-sync `roster` action (service role), so no
DJ PII is stored in this file -> safe to commit.
"""
import json
import os
import subprocess
import sys
from datetime import datetime

import wccg_mailer

SUPA = "https://irjiqbmoohklagdegezz.supabase.co"
FN = f"{SUPA}/functions/v1/studio-sync"
SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060"
PORTAL_URL = "https://wccg1045fm.com/my/dj"
ADMIN_EMAIL = "biggleem@gmail.com"
SUBJECT = "\U0001F3A7 Your mix is in the rotation — WCCG 104.5 FM"

LOGO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "..", "apps", "web", "public", "images", "logos")
LOGOS = [("wccglogo", os.path.join(LOGO_DIR, "wccg-logo.png")),
         ("carsonlogo", os.path.join(LOGO_DIR, "carson-communications-logo.png"))]


def roster() -> dict:
    """slug -> {name, email} for active mixshow DJs (service role; PII fetched at runtime)."""
    r = subprocess.run(
        ["curl", "-s", "--max-time", "60", "-X", "POST", FN,
         "-H", "Content-Type: application/json",
         "-d", json.dumps({"secret": SECRET, "action": "roster"})],
        capture_output=True)
    try:
        data = json.loads(r.stdout.decode("utf-8", "replace"))
    except Exception:  # noqa: BLE001
        return {}
    out = {}
    for d in data.get("djs", []):
        if d.get("slug"):
            out[d["slug"]] = {"name": d.get("name"), "email": d.get("email")}
    return out


def _codes_html(codes) -> str:
    rows = ""
    for c in codes:
        rows += (f'<tr><td style="padding:6px 0;font-family:\'Courier New\',monospace;'
                 f'font-size:15px;color:#141414;">&#9835;&nbsp;&nbsp;{c}</td></tr>')
    return rows


def html_for(name: str, codes, air_line: str) -> str:
    year = datetime.now().year
    greeting = f"You&rsquo;re on the air, {name}!" if name else "You&rsquo;re on the air!"
    part_word = "mix" if len(codes) == 1 else "mixes"
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e9e9ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e9ee;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td align="center" style="background:#ffffff;padding:30px 0 22px;border-bottom:4px solid #e11d1d;">
<img src="cid:wccglogo" alt="WCCG 104.5 FM - The Hip Hop Station" width="210" style="display:block;width:210px;max-width:62%;height:auto;" /></td></tr>
<tr><td style="padding:32px 40px 6px;font-family:Helvetica,Arial,sans-serif;">
<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e11d1d;margin:0 0 10px;font-weight:bold;">Mix Squad &middot; Sync Confirmed</p>
<h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#141414;">{greeting} &#127911;</h1>
<p style="font-size:15px;line-height:1.65;color:#3a3a3a;margin:0 0 18px;">Good news &mdash; your {part_word} just synced to the WCCG 104.5 FM playout system and {"is" if len(codes) == 1 else "are"} locked and loaded for broadcast.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td style="background:#f5f5f7;border:1px solid #e3e3e8;border-radius:10px;padding:16px 20px;font-family:Helvetica,Arial,sans-serif;">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#999;">Synced &amp; staged</p>
<table role="presentation" cellpadding="0" cellspacing="0">{_codes_html(codes)}</table>
<p style="margin:14px 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#999;">On the air</p>
<p style="margin:0;font-size:16px;color:#e11d1d;font-weight:bold;">{air_line}</p>
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td align="center" bgcolor="#e11d1d" style="border-radius:999px;">
<a href="{PORTAL_URL}" style="display:inline-block;padding:15px 40px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Go to My DJ Portal &rarr;</a></td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#555;margin:0 0 6px;">Want to swap it out before it airs? Just upload a new file in <b>My DJ</b> &mdash; the latest version always wins, and we&rsquo;ll re-sync it automatically.</p>
<p style="font-size:13px;line-height:1.6;color:#777;margin:0;">Questions? Reply to this email or write <b>support@wccg1045fm.com</b>.</p></td></tr>
<tr><td style="padding:14px 40px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>
<tr><td style="padding:16px 40px 26px;font-family:Helvetica,Arial,sans-serif;"><p style="font-size:14px;color:#3a3a3a;margin:0;line-height:1.6;">Keep it locked,<br><b>WCCG 104.5 FM &mdash; The Hip Hop Station</b></p></td></tr>
<tr><td align="center" style="background:#0a0a0f;padding:26px 40px;">
<img src="cid:carsonlogo" alt="Carson Communications" width="155" style="display:block;width:155px;max-width:55%;height:auto;margin:0 auto 12px;" />
<p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8a8a96;margin:0;line-height:1.6;">&copy; {year} Carson Communications / WCCG 104.5 FM. All rights reserved.<br>Fayetteville, North Carolina</p></td></tr>
</table></td></tr></table></body></html>"""


def text_for(name: str, codes, air_line: str) -> str:
    part_word = "mix" if len(codes) == 1 else "mixes"
    return (f"You're on the air{(', ' + name) if name else ''}!\n\n"
            f"Your {part_word} just synced to the WCCG 104.5 FM playout system and "
            f"{'is' if len(codes) == 1 else 'are'} ready for broadcast:\n\n"
            + "".join(f"  - {c}\n" for c in codes)
            + f"\nOn the air: {air_line}\n\n"
            f"Manage your mixes anytime at {PORTAL_URL}\n"
            "Want to swap it out? Upload a new file in 'My DJ' and we'll re-sync it.\n"
            "Questions? Reply here or email support@wccg1045fm.com.")


def send_sync_notice(email: str, name: str, codes, air_line: str) -> str:
    """Send the 'your mix synced' email. `codes` is a list of file-code strings."""
    return wccg_mailer.send_mail(
        email, SUBJECT, html_for(name, codes, air_line), text_for(name, codes, air_line), LOGOS)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"

    if mode == "test":
        via = send_sync_notice(ADMIN_EMAIL, "DJ Wolf", ["DJB_76071", "DJB_76072"],
                               "Thursday, July 2 at 5:00 PM")
        print(f"TEST (sample) sent to {ADMIN_EMAIL} via {via}")
        return

    if mode == "one":
        if len(sys.argv) < 5:
            print('Usage: python dj_sync_mail.py one <slug> "CODE1,CODE2" "<air line>"')
            sys.exit(1)
        slug = sys.argv[2].strip()
        codes = [c.strip() for c in sys.argv[3].split(",") if c.strip()]
        air_line = sys.argv[4].strip()
        rec = roster().get(slug)
        if not rec or not rec.get("email"):
            print(f"No email on file for slug {slug!r} (must be an active mixshow DJ).")
            sys.exit(1)
        via = send_sync_notice(rec["email"], rec.get("name"), codes, air_line)
        print(f"OK {rec.get('name')} <{rec['email']}> emailed ({len(codes)} file(s)) via {via}")
        return

    print("Unknown mode. Use: test | one <slug> <codes> <air line>")
    sys.exit(1)


if __name__ == "__main__":
    main()
