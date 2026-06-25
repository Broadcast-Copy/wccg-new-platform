#!/usr/bin/env python3
r"""
wccg_mailer — shared outbound mailer for WCCG DJ emails, via the station's own
SMTP (support@wccg1045fm.com on mail.wccg1045fm.com), NOT Gmail.

The SMTP password is read at runtime from a local file (or env var) that YOU
create — it is never stored in code or seen by anyone. Create it once:

    C:\Users\wccg1\.wccg-mail\smtp-pass.txt      (one line: the support@ password)

  or set the env var WCCG_SMTP_PASS.

Config (env-overridable; sensible defaults for the cPanel box):
    WCCG_SMTP_HOST   default mail.wccg1045fm.com
    WCCG_SMTP_PORT   default 465 (implicit TLS / SMTPS)
    WCCG_SMTP_USER   default support@wccg1045fm.com
    WCCG_MAIL_FROM   default "WCCG 104.5 FM <support@wccg1045fm.com>"
    WCCG_SMTP_INSECURE=1   skip TLS cert verification (only if the box presents a
                           hostname-mismatched/self-signed cert)
"""
import os
import smtplib
import ssl
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = os.environ.get("WCCG_SMTP_HOST", "mail.wccg1045fm.com")
SMTP_PORT = int(os.environ.get("WCCG_SMTP_PORT", "465"))
SMTP_USER = os.environ.get("WCCG_SMTP_USER", "support@wccg1045fm.com")
MAIL_FROM = os.environ.get("WCCG_MAIL_FROM", "WCCG 104.5 FM <support@wccg1045fm.com>")
PASS_FILE = os.environ.get("WCCG_SMTP_PASS_FILE", r"C:\Users\wccg1\.wccg-mail\smtp-pass.txt")


def _password() -> str:
    env = os.environ.get("WCCG_SMTP_PASS")
    if env and env.strip():
        return env.strip()
    try:
        with open(PASS_FILE, encoding="utf-8") as fh:
            pw = fh.read().strip()
        if not pw:
            raise RuntimeError(f"SMTP password file {PASS_FILE} is empty.")
        return pw
    except FileNotFoundError:
        raise RuntimeError(
            f"SMTP password not set. Put the support@wccg1045fm.com password on one "
            f"line in {PASS_FILE} (or set env WCCG_SMTP_PASS)."
        )


def _context() -> ssl.SSLContext:
    if os.environ.get("WCCG_SMTP_INSECURE") == "1":
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
    return ssl.create_default_context()


def send_mail(to: str, subject: str, html: str, text: str, inline_images=None) -> str:
    """Send one HTML+text email with optional inline CID images
    (list of (cid, filepath)). From = support@wccg1045fm.com via station SMTP."""
    msg = MIMEMultipart("related")
    msg["From"] = MAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    alt = MIMEMultipart("alternative")
    msg.attach(alt)
    alt.attach(MIMEText(text, "plain"))
    alt.attach(MIMEText(html, "html"))
    for cid, path in (inline_images or []):
        with open(path, "rb") as f:
            img = MIMEImage(f.read(), _subtype="png")
        img.add_header("Content-ID", f"<{cid}>")
        img.add_header("Content-Disposition", "inline", filename=f"{cid}.png")
        msg.attach(img)

    ctx = _context()
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=60) as s:
            s.login(SMTP_USER, _password())
            s.sendmail(SMTP_USER, [to], msg.as_string())
    else:  # 587 / STARTTLS
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=60) as s:
            s.ehlo()
            s.starttls(context=ctx)
            s.login(SMTP_USER, _password())
            s.sendmail(SMTP_USER, [to], msg.as_string())
    return "smtp-ok"


def selftest(to: str) -> str:
    """Send a tiny test email to confirm SMTP auth + delivery work."""
    return send_mail(
        to,
        "WCCG SMTP test — support@wccg1045fm.com",
        "<p>If you can read this, WCCG outbound email via "
        "<b>support@wccg1045fm.com</b> is working.</p>",
        "WCCG SMTP test: outbound via support@wccg1045fm.com is working.",
    )


if __name__ == "__main__":
    import sys
    dest = sys.argv[1] if len(sys.argv) > 1 else "biggleem@gmail.com"
    print(selftest(dest), "->", dest)
