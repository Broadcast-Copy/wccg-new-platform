"""
studio_sync_secret — the ONE place the scripts read the studio-sync edge
function's shared secret (and its URL) from.

Lookup order:
  1. env WCCG_STUDIO_SYNC_SECRET
  2. the file studio-sync.secret in the gmail-watcher config dir
     (C:\\Users\\wccg1\\.wccg-gmail-watcher — outside the repo, never committed)
  3. legacy=True only: the SECRET constant still hardcoded in sync-dj-drops.py,
     read with `ast` (never executed, never copied anywhere else).

The literal still lives in sync-dj-drops.py / dj_sync_mail.py (and the edge
function) for now, so nothing breaks before the file/env exists. Rotating it =
new value in the edge function + the secret file, then drop the constants.
"""

import ast
import os

FN = "https://irjiqbmoohklagdegezz.supabase.co/functions/v1/studio-sync"
ENV = "WCCG_STUDIO_SYNC_SECRET"
FILE = os.path.join(os.environ.get("WCCG_GMAIL_DIR", r"C:\Users\wccg1\.wccg-gmail-watcher"),
                    "studio-sync.secret")
LEGACY_SOURCE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sync-dj-drops.py")


def load(legacy=False):
    """The secret, or None if none of the sources has it."""
    v = (os.environ.get(ENV) or "").strip()
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
