"""
studio_sync_secret — the ONE place the scripts read the studio-sync edge
function's shared secret (and its URL) from.

Lookup order:
  1. env WCCG_STUDIO_SYNC_SECRET
  2. C:\\AirSuite\\secrets\\studio-sync.dpapi — DPAPI (CurrentUser), the station's
     convention for secrets (same format as typesafe-jev.dpapi: the hex string
     PowerShell's ConvertFrom-SecureString writes). Store it with:
       $s = Read-Host -AsSecureString   # paste the value, never echoed
       ConvertFrom-SecureString $s | Set-Content C:\\AirSuite\\secrets\\studio-sync.dpapi
     Only the Windows user who stored it can read it.
  3. the file studio-sync.secret in the gmail-watcher config dir
     (C:\\Users\\wccg1\\.wccg-gmail-watcher — outside the repo, never committed)
  4. legacy=True only: the SECRET constant still hardcoded in sync-dj-drops.py,
     read with `ast` (never executed, never copied anywhere else).

The literal still lives in sync-dj-drops.py / dj_sync_mail.py (and the edge
function) for now, so nothing breaks before the file/env exists. It has been
public in this repository, so the edge function accepts it ONLY for the old
DJ-drop actions; the sermon actions need the new secret from 1-3 (the function
reads its copy from STUDIO_SYNC_SECRET). Rotating = new value in the function's
STUDIO_SYNC_SECRET + one of 1-3 here, then drop the constants.
"""

import ast
import os

FN = "https://irjiqbmoohklagdegezz.supabase.co/functions/v1/studio-sync"
ENV = "WCCG_STUDIO_SYNC_SECRET"
DPAPI_FILE = os.environ.get("WCCG_STUDIO_SYNC_DPAPI", r"C:\AirSuite\secrets\studio-sync.dpapi")
FILE = os.path.join(os.environ.get("WCCG_GMAIL_DIR", r"C:\Users\wccg1\.wccg-gmail-watcher"),
                    "studio-sync.secret")
LEGACY_SOURCE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sync-dj-drops.py")


def load(legacy=False):
    """The secret, or None if none of the sources has it."""
    v = (os.environ.get(ENV) or "").strip()
    if v:
        return v
    v = dpapi_secret()
    if v:
        return v
    try:
        with open(FILE, encoding="utf-8") as fh:
            v = fh.read().strip()
        if v:
            return v
    except OSError:
        pass
    return legacy_constant() if legacy else None


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


def legacy_constant(path=LEGACY_SOURCE):
    """The string in sync-dj-drops.py's module-level `SECRET = ...` assignment
    (plain literal, or `load() or "<literal>"`), parsed — not imported."""
    try:
        with open(path, encoding="utf-8") as fh:
            tree = ast.parse(fh.read())
    except (OSError, SyntaxError):
        return None
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "SECRET"
                                                for t in node.targets):
            for n in ast.walk(node.value):
                if isinstance(n, ast.Constant) and isinstance(n.value, str) and n.value.strip():
                    return n.value.strip()
    return None
