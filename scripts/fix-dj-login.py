#!/usr/bin/env python3
r"""
fix-dj-login — get ONE stuck DJ a working login. Sets a fresh, non-expiring temp
password server-side (dj-setup-link setpass, verify:true -- the edge function
proves the password grant works and records that sign-in as its own), then
emails the DJ the credential using the branded send-dj-temppass template.
Only emails if the login verified.

  python fix-dj-login.py <email> [display_name] [user_id]

Passing the user_id makes provisioning exact (skips email lookup); the returned
canonical email is used for the login test + the outbound message.
"""
import importlib
import json
import sys
import urllib.request

import wccg_mailer  # noqa: F401  (config + password/fallback used by send_one)

tp = importlib.import_module("send-dj-temppass")  # hyphenated filename -> importlib

SUPA = "https://irjiqbmoohklagdegezz.supabase.co"
FN = f"{SUPA}/functions/v1/dj-setup-link"
SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060"


def setpass(email=None, user_id=None):
    """Set a temp password and have the SERVER verify it logs in.

    The verification sign-in used to happen here, which stamped last_sign_in_at
    and made the DJ look like they'd gotten in -- that's how DJ Daddy Black sat
    "signed in" since 2026-07-22 having never once logged in. The edge function
    now performs it and records it as user_metadata.temppass_verified_at.
    """
    body = {"secret": SECRET, "action": "setpass", "verify": True}
    if user_id:
        body["user_id"] = user_id
    elif email:
        body["email"] = email
    req = urllib.request.Request(FN, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        p = json.loads(r.read().decode())
    if not p.get("ok"):
        raise RuntimeError(f"setpass failed: {p}")
    return p["email"], p["password"], bool(p.get("verified"))


def main():
    if len(sys.argv) < 2:
        print("usage: fix-dj-login.py <email> [display_name] [user_id]")
        sys.exit(1)
    email = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "DJ"
    user_id = sys.argv[3] if len(sys.argv) > 3 else None

    em, pw, ok = setpass(email=email, user_id=user_id)
    print(f"login verify: {'OK' if ok else 'FAILED'} for {em}")
    if not ok:
        print("Aborting: not emailing a password that did not verify.")
        sys.exit(2)
    via = tp.send_one(name, em, pw)
    print(f"DONE {name} <{em}>: temp password set + login VERIFIED + emailed (via {via})")


if __name__ == "__main__":
    main()
