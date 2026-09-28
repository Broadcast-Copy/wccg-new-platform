#!/usr/bin/env python3
"""
Repo-wide guard: no secret literal may live in this (PUBLIC) repository.

Fails when any file git would commit (tracked + untracked-not-ignored):
  1. assigns a secret-looking literal - 40+ hex chars, or a short prefix plus
     32+ hex chars (like "wgen_<hex>") - to a secret-looking name (secret,
     token, password, api key, access key, private key), in any language or
     JSON/YAML/.env form, including `SECRET = load() or "<hex>"`; or
  2. contains, anywhere, one of the RETIRED shared secrets (matched by SHA-256
     fingerprint, so this file never holds the values themselves).

Secrets belong in the function environment (supabase secrets) and on the
Production PC in C:\\AirSuite\\secrets\\*.dpapi (scripts/studio_sync_secret.py,
scripts/rotate-shared-secrets.ps1). A deliberate, documented example goes in
ALLOW with its path, its value's SHA-256 and the reason.

    python scripts/test_no_secret_literals.py
"""
import hashlib
import os
import re
import subprocess
import sys
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# sha256(value) of secrets that were once committed here and have been retired
# (studio-sync/dj-setup-link, notify-sync, wiki-generate, mint-sermon-upload).
RETIRED_FINGERPRINTS = {
    "1ab27ed15742abd58abaca4348b80662aced9d91ea58cf182269c5c78402d04a",
    "2019f32909906c295875883ed437b1bed551313f7178d91ccb269c0275219b29",
    "267566b7c88f89b34f922c5c634d17b93954cbbf5c519c0a98a9b542d493dc1a",
    "56cabe8e7940a4d0078989e8aa75ec60871e42fca16e3923e943f4ccc89d7318",
}

# (repo-relative path, sha256 of the literal) -> why it is allowed. Empty today.
ALLOW = {}

NAME = r"[\w.\-]*(?:secret|token|passw(?:or)?d|api[_\-]?key|access[_\-]?key|private[_\-]?key)[\w.\-]*"
ASSIGN_RE = re.compile(
    r"(?i)[\"']?(?P<name>" + NAME + r")[\"']?\s*(?::|=|:=)\s*"   # NAME =, NAME:, "name": ...
    r"(?:[^\"'\n#]{0,80}?)"                                      # e.g. `load() or ` before the literal
    r"[\"'](?P<val>[^\"'\n]{32,200})[\"']")
HEX40 = re.compile(r"[0-9a-fA-F]{40,}")
PREFIXED = re.compile(r"^[A-Za-z]{2,10}_[0-9a-fA-F]{32,}$")
TOKEN_RE = re.compile(r"[A-Za-z]{2,10}_[0-9a-fA-F]{32,}|[0-9a-fA-F]{32,}")
SKIP_SUFFIX = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".mp3", ".wav", ".m4a", ".mp4",
               ".woff", ".woff2", ".ttf", ".zip", ".pdf", ".lock", "pnpm-lock.yaml", "package-lock.json")
MAX_BYTES = 2_000_000


def secret_looking(value):
    return bool(HEX40.search(value) or PREFIXED.match(value))


def scan_text(text):
    """[(line number, kind, name, sha256 of the value)] for one file's text."""
    hits = []
    for n, line in enumerate(text.splitlines(), 1):
        for m in ASSIGN_RE.finditer(line):
            if secret_looking(m.group("val")):
                hits.append((n, "assigned", m.group("name"),
                             hashlib.sha256(m.group("val").encode()).hexdigest()))
        for m in TOKEN_RE.finditer(line):
            fp = hashlib.sha256(m.group(0).encode()).hexdigest()
            if fp in RETIRED_FINGERPRINTS:
                hits.append((n, "retired", "", fp))
    return hits


def repo_files():
    r = subprocess.run(["git", "-C", REPO, "ls-files", "-co", "--exclude-standard", "-z"],
                       capture_output=True, check=True)
    return [p for p in r.stdout.decode("utf-8", "replace").split("\0") if p]


def scan_repo():
    problems = []
    for rel in repo_files():
        if rel.lower().endswith(SKIP_SUFFIX):
            continue
        path = os.path.join(REPO, rel)
        try:
            if os.path.getsize(path) > MAX_BYTES:
                continue
            with open(path, "rb") as fh:
                data = fh.read()
        except OSError:
            continue  # deleted in the working tree
        if b"\0" in data[:8192]:
            continue  # binary
        for line, kind, name, fp in scan_text(data.decode("utf-8", "replace")):
            if (rel.replace("\\", "/"), fp) in ALLOW:
                continue
            problems.append(f"{rel}:{line}: {kind} {name}".rstrip())
    return problems


class Detector(unittest.TestCase):
    """The scanner itself, on synthetic values built at run time (so this file
    holds no literal it would flag)."""
    HEX = "ab" * 20

    def test_flags_the_forms_that_leaked(self):
        for line in (f'SECRET = "{self.HEX}"',
                     f'SECRET = studio_sync_secret.load() or "{self.HEX}"',
                     f'const SECRET = "{self.HEX}";',
                     f'STUDIO_SYNC_SECRET = "{self.HEX}"',
                     f'  "secret": "{self.HEX}",',
                     f'API_KEY: \'{self.HEX}\'',
                     f'const SECRET = "wgen_{"cd" * 16}";'):
            self.assertTrue(scan_text(line), line)

    def test_leaves_checksums_commits_and_env_reads_alone(self):
        for line in (f'sha256: "{"ef" * 32}",',
                     f'BRIDGE_COMMIT = "{self.HEX}"',
                     'SECRET = studio_sync_secret.load(legacy=True)',
                     'const s = Deno.env.get("STUDIO_SYNC_SECRET");',
                     'SECRET = "sandbox-secret-" + "x" * 32',
                     f'checksum_sha256 = "{"12" * 32}"'):
            self.assertEqual(scan_text(line), [], line)

    def test_retired_values_are_caught_by_fingerprint_anywhere(self):
        value = "5e" * 20                                # a stand-in retired value
        fp = hashlib.sha256(value.encode()).hexdigest()
        RETIRED_FINGERPRINTS.add(fp)
        try:
            kinds = [k for _, k, _, _ in scan_text(f"see {value} in the old runbook")]
        finally:
            RETIRED_FINGERPRINTS.discard(fp)
        self.assertEqual(kinds, ["retired"])


class Repository(unittest.TestCase):
    def test_no_secret_literals_in_the_repo(self):
        problems = scan_repo()
        self.assertEqual(problems, [], "secret-looking literals found:\n  " + "\n  ".join(problems))


if __name__ == "__main__":
    unittest.main(verbosity=2)
