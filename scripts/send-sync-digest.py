#!/usr/bin/env python3
r"""
send-sync-digest — emails the owner (biggleem@gmail.com) a snapshot digest of the
whole WCCG sync ecosystem: DJ mixes -> air, emailed mixes + sermons (Gmail
watcher), syndicated programs (radio spider), and the automation task health.

Snapshot content is composed at author time from the live checks run this session.
Outbound via wccg_mailer (support@ SMTP, or the gmail-watcher fallback).

  python send-sync-digest.py            # send to biggleem@gmail.com
  python send-sync-digest.py <email>    # send elsewhere
"""
import sys
from datetime import datetime

import wccg_mailer

TO = sys.argv[1] if len(sys.argv) > 1 else "biggleem@gmail.com"
STAMP = "June 26, 2026 - 8:36 AM ET"
SUBJECT = "\U0001F4E1 WCCG Sync Digest - Jun 26, 2026"

LOGO_DIR = __import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)),
                                      "..", "apps", "web", "public", "images", "logos")
LOGOS = [("wccglogo", __import__("os").path.join(LOGO_DIR, "wccg-logo.png")),
         ("carsonlogo", __import__("os").path.join(LOGO_DIR, "carson-communications-logo.png"))]


def section(title, accent, rows_html):
    return f"""<tr><td style="padding:22px 40px 4px;font-family:Helvetica,Arial,sans-serif;">
<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:{accent};margin:0 0 10px;font-weight:bold;">{title}</p>
{rows_html}</td></tr>"""


def row(label, value, color="#3a3a3a"):
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;">'
            f'<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#777;width:170px;vertical-align:top;">{label}</td>'
            f'<td style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:{color};line-height:1.5;">{value}</td></tr></table>')


def html_body():
    year = datetime.now().year
    djmix = (
        row("Auto-sync", "&#9989; <b>Healthy</b> &mdash; runs every 5 min (repaired today; it had been failing since ~Jun 14)")
        + row("Reconciled today", "All active DJ carts checked against the platform")
        + row("Refreshed", "DJ <b>Chuck</b> (76073/74), DJ <b>Daffie</b> (76087/88), DJ <b>KVNG</b> (76061/62) &mdash; backed up first, verified byte-for-byte")
        + row("Already current", "10 DJs &mdash; Chuck T, Drop, Ike GDA, KillaKo, TommyGee, T-Money, Wolf, Yodo, Daddy Black, Admin")
        + row("Needs you", "&#9888;&#65039; DJ <b>Tony Neal</b> &mdash; 5 mixes uploaded but his cart numbers are unmapped", "#b45309")
    )
    gmail = (
        row("Status", "&#9989; <b>Running</b> &mdash; restarted this morning to clear a transient SSL hiccup; polling every 20s")
        + row("Watching", "DJ Drop, DJ Corleone, DJ Daddy Black, DJ Tony Neal + churches (Lewis Chapel, FFWC, Mond&rsquo;s) + Google Drive shares")
        + row("Recent mixes", "DJ Chuck T (Jun 19), DJ Drop (Jun 11) &mdash; email &rarr; bucket &rarr; cart")
    )
    sermons = (
        row("Last batch", "Jun 12 &mdash; 591 archived, 590 OK, 0 failed")
        + row("Shows", "dvp1, gpn1, pmb1, thm1, lcc1 (weeks of Jun 7 &amp; Jun 14)")
        + row("Ongoing", "Incoming church audio handled live by the Gmail watcher above")
    )
    programs = (
        row("Bootleg Kev", "19 segment-carts <b>DJB_70531&ndash;70549</b>; auto-sync armed Jun 15 for future deliveries (newest: 110725)")
        + row("Source", "Premiere Networks drop folder &rarr; M:\\JBMusic via radio-spider-sync")
    )
    tasks = (
        row("WCCG Studio Sync", "&#9989; every 5 min &mdash; last run OK (08:29)")
        + row("WCCG Gmail Watcher", "&#9989; running &mdash; restarted 08:35")
        + row("WCCG DJ Mix Reminder", "&#8986; next blast Mon Jun 29, 9:00 AM")
    )
    todo = (
        row("1. Tony Neal carts", "Send me his cart numbers (or confirm those 5 are catalog, not slot files) and I&rsquo;ll place them")
        + row("2. support@ email", "Drop the support@ password in the mail file to switch sends from Gmail to support@ (optional)")
        + row("3. Password resets", "Set Supabase OTP expiry to 24h for durable in-app &ldquo;Forgot password&rdquo; (optional)")
    )
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e9e9ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e9ee;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td align="center" style="background:#ffffff;padding:30px 0 22px;border-bottom:4px solid #e11d1d;">
<img src="cid:wccglogo" alt="WCCG 104.5 FM" width="210" style="display:block;width:210px;max-width:62%;height:auto;" /></td></tr>
<tr><td style="padding:30px 40px 0;font-family:Helvetica,Arial,sans-serif;">
<h1 style="font-size:24px;line-height:1.2;margin:0 0 6px;color:#141414;">Sync Digest &#128225;</h1>
<p style="font-size:13px;color:#888;margin:0 0 14px;">{STAMP}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;"><tr>
<td style="background:#0f7b3f;border-radius:10px;padding:14px 18px;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#ffffff;font-weight:bold;">
&#9989; All sync pipelines healthy &nbsp;&middot;&nbsp; 1 item needs your input</td></tr></table></td></tr>
{section("DJ Mixes &rarr; Air (platform)", "#e11d1d", djmix)}
{section("Emailed Mixes &amp; Sermons (Gmail watcher)", "#e11d1d", gmail)}
{section("Sermons", "#e11d1d", sermons)}
{section("Syndicated Programs (Radio Spider)", "#e11d1d", programs)}
{section("Automation Health", "#e11d1d", tasks)}
<tr><td style="padding:18px 40px 2px;"><div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 18px;">
<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b45309;margin:0 0 10px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Needs Your Attention</p>
{todo}</div></td></tr>
<tr><td style="padding:18px 40px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>
<tr><td style="padding:14px 40px 26px;font-family:Helvetica,Arial,sans-serif;"><p style="font-size:13px;color:#999;margin:0;line-height:1.6;">Automated snapshot from the production PC. New DJ uploads now reach air within ~5 minutes on their own.</p></td></tr>
<tr><td align="center" style="background:#0a0a0f;padding:24px 40px;">
<img src="cid:carsonlogo" alt="Carson Communications" width="150" style="display:block;width:150px;max-width:55%;height:auto;margin:0 auto 12px;" />
<p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8a8a96;margin:0;line-height:1.6;">&copy; {year} Carson Communications / WCCG 104.5 FM &mdash; Fayetteville, NC</p></td></tr>
</table></td></tr></table></body></html>"""


def text_body():
    return f"""WCCG SYNC DIGEST - {STAMP}
All sync pipelines healthy. 1 item needs your input.

DJ MIXES -> AIR (platform)
- Auto-sync healthy, every 5 min (repaired today; had been failing since ~Jun 14).
- Refreshed today: Chuck (76073/74), Daffie (76087/88), KVNG (76061/62) - backed up + verified.
- Already current: 10 DJs (Chuck T, Drop, Ike GDA, KillaKo, TommyGee, T-Money, Wolf, Yodo, Daddy Black, Admin).
- NEEDS YOU: Tony Neal - 5 mixes uploaded, cart numbers unmapped.

EMAILED MIXES & SERMONS (Gmail watcher)
- Running; restarted this morning (cleared a transient SSL error); polling every 20s.
- Watching DJ Drop, Corleone, Daddy Black, Tony Neal + churches + Drive shares.
- Recent: Chuck T (Jun 19), Drop (Jun 11).

SERMONS
- Last batch Jun 12: 591 archived, 590 OK, 0 failed (dvp1, gpn1, pmb1, thm1, lcc1).

SYNDICATED PROGRAMS (Radio Spider)
- Bootleg Kev: carts DJB_70531-70549 (19 seg), auto-sync armed Jun 15 for future deliveries.

AUTOMATION HEALTH
- WCCG Studio Sync: every 5 min, last OK 08:29.
- WCCG Gmail Watcher: running, restarted 08:35.
- WCCG DJ Mix Reminder: next Mon Jun 29, 9:00 AM.

NEEDS YOUR ATTENTION
1. Tony Neal cart numbers (or confirm catalog) so I can place his 5 mixes.
2. (optional) support@ password -> switch email sends from Gmail to support@.
3. (optional) Supabase OTP expiry 24h -> durable in-app password reset.
"""


def main():
    via = wccg_mailer.send_mail(TO, SUBJECT, html_body(), text_body(), LOGOS)
    print(f"Sync digest sent to {TO} (via {via})")


if __name__ == "__main__":
    main()
