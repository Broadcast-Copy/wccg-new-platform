r"""
studio_sync_secret - the ONE place the Production PC's scripts read the shared
secret for the studio-sync and dj-setup-link edge functions (and their URLs).
No secret is ever written in this repository (tests/test_no_secret_literals.py
fails the build if one appears).

Lookup order:
  1. C:\AirSuite\secrets\studio-sync.dpapi - DPAPI (CurrentUser), the station's
     convention for secrets (same format as typesafe-jev.dpapi: the hex string
     PowerShell's ConvertFrom-SecureString writes). scripts\rotate-shared-secrets.ps1
     writes it; only the Windows user who stored it (wccg1, the user every task
     runs as) can read it.
  2. env WCCG_STUDIO_SYNC_SECRET
  3. the file studio-sync.secret in the gmail-watcher config dir
     (C:\Users\wccg1\.wccg-gmail-watcher - outside the repo, never committed)
  4. legacy=True only, and only while 1-3 are all empty: the RETIRED shared
     secret, read from a pinned commit of this repository's own git history
     (BRIDGE_COMMIT). It keeps the 5-minute DJ-mix filing working between the
     merge that removed the literals and the owner running the rotation (Jev
     0.91, 2026-09-28). The functions stop accepting that value when the
     rotation turns STUDIO_SYNC_ACCEPT_LEGACY off, and a stored new secret (1)
     always wins, so after the rotation the bridge is never used. Delete it in a
     later cleanup.

Self-check (never prints a secret):
  python scripts\studio_sync_secret.py --source    which source a caller would use
  python scripts\studio_sync_secret.py --ping      ping studio-sync + dj-setup-link
                                                   with it; exit 0 only when both
                                                   answer ok via the CURRENT secret
"""

import ast
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

SUPA = "https://irjiqbmoohklagdegezz.supabase.co"
FN = f"{SUPA}/functions/v1/studio-sync"
SETUP_LINK_FN = f"{SUPA}/functions/v1/dj-setup-link"
ENV = "WCCG_STUDIO_SYNC_SECRET"
DPAPI_FILE = os.environ.get("WCCG_STUDIO_SYNC_DPAPI", r"C:\AirSuite\secrets\studio-sync.dpapi")
FILE = os.path.join(os.environ.get("WCCG_GMAIL_DIR", r"C:\Users\wccg1\.wccg-gmail-watcher"),
                    "studio-sync.secret")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# The last origin/main commit whose scripts still carried the retired literal.
BRIDGE_COMMIT = "2111fe00a5ddb12741f8aeb79363661addc3cd86"
BRIDGE_PATH = "scripts/sync-dj-drops.py"

NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0  # callers run under pythonw
_bridge_cache = {}


def resolve(legacy=False):
    """(secret, source name) - source is dpapi / env / file / history-bridge, or (None, None)."""
    v = dpapi_secret()
    if v:
        return v, "dpapi"
    v = (os.environ.get(ENV) or "").strip()
    if v:
        return v, "env"
    try:
        with open(FILE, encoding="utf-8") as fh:
            v = fh.read().strip()
        if v:
            return v, "file"
    except OSError:
        pass
    if legacy:
        v = legacy_from_history()
        if v:
            return v, "history-bridge"
    return None, None


def load(legacy=False):
    """The secret, or None if none of the sources has it."""
    return resolve(legacy)[0]


def dpapi_secret(path=None):
    """The string in a ConvertFrom-SecureString file, decrypted for the current
    Windows user, or None (no file, other user, not Windows, bad format)."""
    try:
        with open(path or DPAPI_FILE, encoding="utf-8-sig") as fh:
            text = fh.read().strip()
    except OSError:
        return None
    try:
        blob = bytes.fromhex(text)
    except ValueError:
        return None
    raw = _dpapi_unprotect(blob)
    if not raw:
        return None
    try:
        return raw.decode("utf-16-le").strip() or None  # SecureString plaintext is UTF-16LE
    except UnicodeDecodeError:
        return None


def _dpapi_unprotect(blob):
    if os.name != "nt" or not blob:
        return None
    import ctypes
    from ctypes import wintypes

    class DATA_BLOB(ctypes.Structure):
        _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_char))]

    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    crypt32.CryptUnprotectData.argtypes = [ctypes.POINTER(DATA_BLOB), ctypes.c_void_p, ctypes.c_void_p,
                                           ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD,
                                           ctypes.POINTER(DATA_BLOB)]
    crypt32.CryptUnprotectData.restype = wintypes.BOOL
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]
    kernel32.LocalFree.restype = ctypes.c_void_p

    buf = ctypes.create_string_buffer(blob, len(blob))
    src = DATA_BLOB(len(blob), ctypes.cast(buf, ctypes.POINTER(ctypes.c_char)))
    out = DATA_BLOB()
    CRYPTPROTECT_UI_FORBIDDEN = 0x1
    if not crypt32.CryptUnprotectData(ctypes.byref(src), None, None, None, None,
                                      CRYPTPROTECT_UI_FORBIDDEN, ctypes.byref(out)):
        return None
    try:
        return ctypes.string_at(out.pbData, out.cbData)
    finally:
        kernel32.LocalFree(ctypes.cast(out.pbData, ctypes.c_void_p))


def _git():
    return shutil.which("git") or r"C:\Program Files\Git\cmd\git.exe"


def legacy_from_history(commit=None, path=None, repo=None):
    """The retired secret from `git show <commit>:<path>` (a module-level
    `SECRET = ...` assignment, parsed - never executed), or None. Cached."""
    commit, path, repo = commit or BRIDGE_COMMIT, path or BRIDGE_PATH, repo or REPO
    key = (commit, path, repo)
    if key not in _bridge_cache:
        value = None
        try:
            r = subprocess.run([_git(), "-C", repo, "show", f"{commit}:{path}"],
                               capture_output=True, timeout=20, creationflags=NO_WINDOW)
            if r.returncode == 0:
                value = legacy_constant_from_source(r.stdout.decode("utf-8", "replace"))
        except (OSError, subprocess.SubprocessError):
            value = None
        _bridge_cache[key] = value
    return _bridge_cache[key]


def legacy_constant_from_source(text):
    """The string in a module-level `SECRET = ...` assignment (plain literal, or
    `load() or "<literal>"`), parsed with ast - not executed."""
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return None
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "SECRET"
                                                for t in node.targets):
            for n in ast.walk(node.value):
                if isinstance(n, ast.Constant) and isinstance(n.value, str) and n.value.strip():
                    return n.value.strip()
    return None


def legacy_constant(path):
    """legacy_constant_from_source() for a file on disk (tests)."""
    try:
        with open(path, encoding="utf-8") as fh:
            return legacy_constant_from_source(fh.read())
    except OSError:
        return None


def post(url, payload, timeout=60):
    """(HTTP status, JSON body or {}) - the body carries the secret, never a URL or argv."""
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except ValueError:
            return e.code, {}
    except (urllib.error.URLError, OSError, ValueError) as e:
        return 0, {"error": type(e).__name__}


# What the pre-rotation function code answers to "ping" once it has ACCEPTED the
# secret: studio-sync has no such action; dj-setup-link falls through to its
# recovery branch and stops at the missing email. Neither does anything.
OLD_CODE_ERRORS = ("unknown action", "no email")


def describe_ping(name, status, body):
    """One line for a ping answer. 400 'unknown action' = function code from before
    the rotation, which accepted the secret but has no ping yet."""
    if status == 200 and body.get("ok"):
        return f"PING {name} ok {body.get('via', '?')}"
    if status == 400 and str(body.get("error", "")) in OLD_CODE_ERRORS:
        return f"PING {name} accepted-old-code"
    return f"PING {name} fail HTTP {status} {str(body.get('error', ''))[:80]}"


def _main(argv):
    secret, src = resolve(legacy=True)
    if "--source" in argv:
        print(f"SOURCE {src or 'none'}")
        return 0 if secret else 1
    if "--ping" in argv:
        print(f"SOURCE {src or 'none'}")
        if not secret:
            print("PING studio-sync fail no secret on this PC")
            return 1
        lines = [describe_ping("studio-sync", *post(FN, {"secret": secret, "action": "ping"})),
                 describe_ping("dj-setup-link", *post(SETUP_LINK_FN, {"secret": secret, "action": "ping"}))]
        print("\n".join(lines))
        return 0 if all(line.endswith(" ok current") for line in lines) else 1
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
