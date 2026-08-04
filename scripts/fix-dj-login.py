#!/usr/bin/env python3
r"""
fix-dj-login — get ONE stuck DJ a working login. Sets a fresh, non-expiring temp
password server-side (dj-setup-link setpass), VERIFIES a real login actually
succeeds (password grant), then emails the DJ the credential using the branded
send-dj-temppass template. Only emails if the login verified.

  python fix-dj-login.py <email> [display_name] [user_id]

Passing the user_id makes provisioning exact (skips email lookup); the returned
canonical email is used for the login test + the outbound message.
"""
import importlib
import json
import sys
import urllib.error
import urllib.request

import wccg_mailer  # noqa: F401  (config + password/fallback used by send_one)

tp = importlib.import_module("send-dj-temppass")  # hyphenated filename -> importlib

SUPA = "https://irjiqbmoohklagdegezz.supabase.co"
FN = f"{SUPA}/functions/v1/dj-setup-link"
SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060"
ANON = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyamlxYm1v"
        "b2hrbGFnZGVnZXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjU0MzEsImV4cCI6MjA4NTY0MTQzMX0."
        "0-ChQ69cVWQjqbJYrLE5FbO6eBAKr7j8yHbnY4Fag3k")


def setpass(email=None, user_id=None):
    body = {"secret": SECRET, "action": "setpass"}
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
    return p["email"], p["password"]


def verify_login(email, password):
    req = urllib.request.Request(
        f"{SUPA}/auth/v1/token?grant_type=password",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json", "apikey": ANON}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = json.loads(r.read().decode())
        return bool(t.get("access_token"))
    except urllib.error.HTTPError as e:
        print("  verify HTTP error:", e.read().decode()[:200])
        return False


def main():
    if len(sys.argv) < 2:
        print("usage: fix-dj-login.py <email> [display_name] [user_id]")
        sys.exit(1)
    email = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "DJ"
    user_id = sys.argv[3] if len(sys.argv) > 3 else None

    em, pw = setpass(email=email, user_id=user_id)
    ok = verify_login(em, pw)
    print(f"login verify: {'OK' if ok else 'FAILED'} for {em}")
    if not ok:
        print("Aborting: not emailing a password that did not verify.")
        sys.exit(2)
    via = tp.send_one(name, em, pw)
    print(f"DONE {name} <{em}>: temp password set + login VERIFIED + emailed (via {via})")


if __name__ == "__main__":
    main()
