#!/usr/bin/env python3
r"""
support_tickets — read + resolve DJ support tickets that arrive as email to
support@wccg1045fm.com. Reads via IMAP (mail.wccg1045fm.com:993), replies via
the station SMTP (support@). Same credential as wccg_mailer — the support@
password from C:\Users\wccg1\.wccg-mail\smtp-pass.txt (never stored in code).

This is the substrate for the realtime resolution loop: each loop iteration runs
`list` (the new tickets), Claude reads them, writes a resolution to a file, and
runs `reply` to answer from support@ and mark the ticket handled.

Commands:
  python support_tickets.py list [--max N]
        -> JSON of UNSEEN messages in INBOX: {uid, from, from_addr, subject,
           date, message_id, body}. Does NOT mark them seen (BODY.PEEK).
  python support_tickets.py reply --uid U --to ADDR --subject S \
        [--inreplyto MID] --bodyfile FILE [--html] [--keep-unseen]
        -> send the reply from support@ (threaded), then mark UID \Seen.
  python support_tickets.py count        -> number of unseen tickets
"""
import argparse
import email
import imaplib
import json
import os
import re
import smtplib
import ssl
import sys
from email.header import decode_header, make_header
from email.message import EmailMessage
from email.utils import parseaddr

import wccg_mailer  # password + SMTP host/user/from + TLS context

IMAP_HOST = os.environ.get("WCCG_IMAP_HOST", "mail.wccg1045fm.com")
IMAP_PORT = int(os.environ.get("WCCG_IMAP_PORT", "993"))
MAILBOX = os.environ.get("WCCG_IMAP_MAILBOX", "INBOX")


def _imap() -> imaplib.IMAP4_SSL:
    ctx = wccg_mailer._context()
    M = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT, ssl_context=ctx, timeout=30)
    M.login(wccg_mailer.SMTP_USER, wccg_mailer._password())
    return M


def _dec(s: str) -> str:
    if not s:
        return ""
    try:
        return str(make_header(decode_header(s)))
    except Exception:
        return s


def _plain_body(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            disp = str(part.get("Content-Disposition", ""))
            if part.get_content_type() == "text/plain" and "attachment" not in disp:
                try:
                    return part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", "replace")
                except Exception:
                    pass
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                try:
                    h = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", "replace")
                    return re.sub(r"<[^>]+>", " ", h)
                except Exception:
                    pass
        return ""
    try:
        return msg.get_payload(decode=True).decode(msg.get_content_charset() or "utf-8", "replace")
    except Exception:
        return str(msg.get_payload())


def cmd_list(max_n: int) -> None:
    M = _imap()
    M.select(MAILBOX)
    typ, data = M.search(None, "UNSEEN")
    uids = (data[0].split() if data and data[0] else [])[:max_n]
    out = []
    for uid in uids:
        typ, d = M.fetch(uid, "(BODY.PEEK[])")
        if not d or not d[0]:
            continue
        msg = email.message_from_bytes(d[0][1])
        frm = _dec(msg.get("From"))
        out.append({
            "uid": uid.decode(),
            "from": frm,
            "from_addr": parseaddr(frm)[1],
            "subject": _dec(msg.get("Subject")),
            "date": msg.get("Date"),
            "message_id": msg.get("Message-ID"),
            "body": _plain_body(msg).strip()[:4000],
        })
    M.logout()
    print(json.dumps(out, indent=2, ensure_ascii=False))


def cmd_count() -> None:
    M = _imap()
    M.select(MAILBOX)
    typ, data = M.search(None, "UNSEEN")
    n = len(data[0].split()) if data and data[0] else 0
    M.logout()
    print(n)


def cmd_reply(a) -> None:
    body = open(a.bodyfile, encoding="utf-8").read()
    to_addr = parseaddr(a.to)[1] or a.to
    subject = a.subject if a.subject.lower().startswith("re:") else f"Re: {a.subject}"

    msg = EmailMessage()
    msg["From"] = wccg_mailer.MAIL_FROM
    msg["To"] = a.to
    msg["Subject"] = subject
    if a.inreplyto:
        msg["In-Reply-To"] = a.inreplyto
        msg["References"] = a.inreplyto
    if a.html:
        msg.set_content("This message is best viewed in an HTML email client.")
        msg.add_alternative(body, subtype="html")
    else:
        msg.set_content(body)

    ctx = wccg_mailer._context()
    with smtplib.SMTP_SSL(wccg_mailer.SMTP_HOST, wccg_mailer.SMTP_PORT, context=ctx, timeout=60) as s:
        s.login(wccg_mailer.SMTP_USER, wccg_mailer._password())
        s.sendmail(wccg_mailer.SMTP_USER, [to_addr], msg.as_string())

    if a.uid and not a.keep_unseen:
        M = _imap()
        M.select(MAILBOX)
        M.store(a.uid.encode() if isinstance(a.uid, str) else a.uid, "+FLAGS", "\\Seen")
        M.logout()
    print(f"REPLIED to {to_addr} (uid {a.uid} marked {'unseen' if a.keep_unseen else 'seen'})")


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    pl = sub.add_parser("list"); pl.add_argument("--max", type=int, default=20)
    sub.add_parser("count")
    pr = sub.add_parser("reply")
    pr.add_argument("--uid"); pr.add_argument("--to", required=True)
    pr.add_argument("--subject", required=True); pr.add_argument("--inreplyto", default="")
    pr.add_argument("--bodyfile", required=True)
    pr.add_argument("--html", action="store_true")
    pr.add_argument("--keep-unseen", action="store_true")
    a = p.parse_args()
    if a.cmd == "list":
        cmd_list(a.max)
    elif a.cmd == "count":
        cmd_count()
    elif a.cmd == "reply":
        cmd_reply(a)


if __name__ == "__main__":
    main()
