#!/usr/bin/env python3
"""
Tests for sync-dj-drops' on-air write path: atomic backed-up cart writes, sha256
idempotency, the on-air guard, two-file carts, and main() end to end.

No network (api() and curl are stubbed), no ffmpeg/ffprobe, and nothing written
outside a temp dir: every path constant (ONAIR_FLAT, ARCHIVE_ROOT, BACKUP_ROOT,
LOG, RUN_LOCK, JOURNAL_DIR) is pointed into the sandbox, and any write-mode
open() the module makes outside it fails the test.

    python scripts/test_sync_dj_drops.py
"""
import builtins
import contextlib
import hashlib
import importlib.util
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
import zipfile
from datetime import datetime, timedelta, timezone
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


sync = _load("sync_dj_drops", "sync-dj-drops.py")

# AirSuite library scan (wccg-airsuite library/cart-names.js), copied verbatim:
#   AUDIO_EXT = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aif', '.aiff'])
#   cartFromName = n => String(n).match(/^DJB_(\d+)\./i)
SCAN_EXT = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aif", ".aiff"}
SCAN_RE = re.compile(r"^DJB_(\d+)\.", re.I)


def scan_lists(name):
    """AirSuite's scan lists (and upserts a track row for) any file with an audio extension."""
    return os.path.splitext(name)[1].lower() in SCAN_EXT


def scan_cart(name):
    """...and reads its cart from the name."""
    m = SCAN_RE.match(name)
    return int(m.group(1)) if m else None


def mp3(tag, n=200_000):
    body = (tag.encode() * (n // max(1, len(tag)) + 1))[:n]
    return b"ID3\x03\x00" + body


def sha(b):
    return hashlib.sha256(b).hexdigest()


def read(p):
    with open(p, "rb") as f:
        return f.read()


def write(p, data):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "wb") as f:
        f.write(data)


class Sandbox(unittest.TestCase):
    """Every module path constant inside a fresh temp dir; writes elsewhere fail."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory(prefix="sync-dj-drops-test-")
        self.root = os.path.realpath(self._tmp.name)
        self.flat = os.path.join(self.root, "onair", "JBMusic")
        self.archive = os.path.join(self.root, "b-mixshows")
        self.backups = os.path.join(self.root, "sync-logs", "cart-backups")
        self.journal = os.path.join(self.root, "onair-journal", "journal")
        os.makedirs(self.flat)
        os.makedirs(self.journal)
        consts = dict(
            ONAIR_FLAT=self.flat, ARCHIVE_ROOT=self.archive, BACKUP_ROOT=self.backups,
            LOG=os.path.join(self.root, "sync-logs", "dj-drops-sync.log"),
            RUN_LOCK=os.path.join(self.root, "sync-logs", "dj-drops-sync.lock"),
            JOURNAL_DIR=self.journal,
            FFMPEG=os.path.join(self.root, "no-ffmpeg.exe"),
            FFPROBE=os.path.join(self.root, "no-ffprobe.exe"),
        )
        for k, v in consts.items():
            p = mock.patch.object(sync, k, v)
            p.start()
            self.addCleanup(p.stop)
        # nothing may reach the edge function or a real subprocess unless a test says so
        p = mock.patch.object(sync, "api", side_effect=AssertionError("api() called unstubbed"))
        p.start(); self.addCleanup(p.stop)
        p = mock.patch.object(sync.subprocess, "run", side_effect=AssertionError("subprocess.run unstubbed"))
        p.start(); self.addCleanup(p.stop)
        sync._names.clear()
        self.addCleanup(sync._names.clear)
        # the module's own open(): write modes only inside the sandbox
        real_open = builtins.open

        def guarded_open(file, mode="r", *a, **kw):
            if any(c in mode for c in "wax+"):
                full = os.path.realpath(os.fspath(file))
                if os.path.commonpath([full, self.root]) != self.root:
                    raise AssertionError(f"write outside the sandbox: {full}")
            return real_open(file, mode, *a, **kw)

        sync.open = guarded_open
        self.addCleanup(lambda: delattr(sync, "open"))
        self.addCleanup(self._tmp.cleanup)

    def cart(self, name="DJB_76097.mp3"):
        return os.path.join(self.flat, name)

    def backup_files(self):
        out = []
        if os.path.isdir(self.backups):
            for d, _, files in os.walk(self.backups):
                out += [os.path.join(d, f) for f in files]
        return sorted(out)

    def leftovers(self, d=None):
        d = d or self.flat
        return [n for n in os.listdir(d) if n.startswith(sync.TEMP_PREFIX)]


# ---------------------------------------------------------------------------

class TempNames(Sandbox):
    def test_old_names_were_visible_to_the_scanner(self):
        # the reason for the change: the old transcode temp was a listed audio
        # file that parsed as the cart; the old download temp escaped only on .part
        self.assertTrue(scan_lists("DJB_76097.aiff.part.mp3"))
        self.assertEqual(scan_cart("DJB_76097.aiff.part.mp3"), 76097)
        self.assertFalse(scan_lists("DJB_76097.mp3.part"))
        self.assertEqual(scan_cart("DJB_76097.mp3.part"), 76097)

    def test_temp_names_never_look_like_carts(self):
        for final in ("DJB_76097.mp3", "DJB_76097.wav", "djb_1.MP3", "DJB_0302.aiff"):
            for tag in ("part", "tmp"):
                name = os.path.basename(sync.temp_path(self.cart(final), tag))
                for derived in (name, name + ".unwrapped", name + ".conv"):
                    self.assertFalse(scan_lists(derived), derived)
                    self.assertIsNone(scan_cart(derived), derived)
                    self.assertIsNone(sync._cart_no(derived), derived)
                    self.assertTrue(derived.startswith(".~sync-"))

    def test_temp_is_beside_the_cart(self):
        p = sync.temp_path(self.cart(), "tmp")
        self.assertEqual(os.path.dirname(p), self.flat)   # same volume -> os.replace is atomic

    def test_transcode_output_is_forced_mp3_under_a_non_audio_name(self):
        ffmpeg = os.path.join(self.root, "ffmpeg.exe")
        write(ffmpeg, b"stub")
        src = sync.temp_path(self.cart("DJB_76097.aiff"), "part")
        write(src, b"FORM\x00\x00\x00\x00AIFF" + b"\x00" * 1000)
        seen = {}

        def fake_run(args, **kw):
            seen["args"] = args
            write(args[-1], mp3("conv"))
            return subprocess.CompletedProcess(args, 0, b"", b"")

        with mock.patch.object(sync, "FFMPEG", ffmpeg), \
                mock.patch.object(sync.subprocess, "run", side_effect=fake_run):
            data = sync.transcode_to_mp3(src, "aiff")
        self.assertEqual(data, mp3("conv"))
        out = seen["args"][-1]
        self.assertTrue(out.endswith(".conv"))
        self.assertFalse(scan_lists(os.path.basename(out)) or scan_cart(os.path.basename(out)))
        self.assertEqual(seen["args"][-3:-1], ["-f", "mp3"])
        self.assertFalse(os.path.exists(out))

    def test_unwrap_output_is_not_audio_named(self):
        z = sync.temp_path(self.cart(), "part")
        with zipfile.ZipFile(z, "w") as zf:
            zf.writestr("mix/Unknown Album/mix.mp3", mp3("zip", 1_200_000))
        out, kind = sync.unwrap_zip(z)
        self.assertEqual(kind, "mp3")
        self.assertFalse(scan_lists(os.path.basename(out)) or scan_cart(os.path.basename(out)))
        os.remove(out)


# ---------------------------------------------------------------------------

class PlaceCart(Sandbox):
    def test_created_without_backup(self):
        self.assertEqual(sync.place_cart(mp3("new"), self.cart()), ("created", None))
        self.assertEqual(read(self.cart()), mp3("new"))
        self.assertEqual(self.backup_files(), [])
        self.assertEqual(self.leftovers(), [])

    def test_same_bytes_untouched_and_not_backed_up(self):
        write(self.cart(), mp3("same"))
        before = os.stat(self.cart()).st_mtime_ns
        self.assertEqual(sync.place_cart(mp3("same"), self.cart()), ("same", None))
        self.assertEqual(os.stat(self.cart()).st_mtime_ns, before)
        self.assertEqual(self.backup_files(), [])

    def test_different_bytes_backed_up_then_replaced(self):
        write(self.cart(), mp3("old"))
        outcome, bak = sync.place_cart(mp3("new"), self.cart())
        self.assertEqual(outcome, "replaced")
        self.assertEqual(read(self.cart()), mp3("new"))
        self.assertEqual(self.backup_files(), [bak])
        self.assertEqual(read(bak), mp3("old"))
        day, name = os.path.basename(os.path.dirname(bak)), os.path.basename(bak)
        self.assertRegex(day, r"^\d{8}$")
        self.assertRegex(name, r"^DJB_76097\.mp3\.\d{6}$")
        self.assertEqual(os.path.dirname(os.path.dirname(bak)), self.backups)
        self.assertEqual(self.leftovers(), [])

    def test_write_failing_midway_leaves_old_cart(self):
        write(self.cart(), mp3("old"))
        with mock.patch.object(sync.os, "fsync", side_effect=OSError("network drop")):
            with self.assertRaises(OSError):
                sync.place_cart(mp3("new"), self.cart())
        self.assertEqual(read(self.cart()), mp3("old"))
        self.assertEqual(self.leftovers(), [])
        self.assertEqual(self.backup_files(), [])   # never got as far as the backup

    def test_short_temp_is_caught_before_the_replace(self):
        write(self.cart(), mp3("old"))
        real = sync.sha256_file
        with mock.patch.object(sync, "sha256_file",
                               side_effect=lambda p: "0" * 64 if ".~sync-" in p else real(p)):
            with self.assertRaises(OSError):
                sync.place_cart(mp3("new"), self.cart())
        self.assertEqual(read(self.cart()), mp3("old"))
        self.assertEqual(self.leftovers(), [])

    def test_replace_failing_leaves_old_cart(self):
        write(self.cart(), mp3("old"))
        real = os.replace

        def flaky(src, dst):
            if os.path.normcase(dst) == os.path.normcase(self.cart()):
                raise OSError("share went away")
            return real(src, dst)

        with mock.patch.object(sync.os, "replace", side_effect=flaky):
            with self.assertRaises(OSError):
                sync.place_cart(mp3("new"), self.cart())
        self.assertEqual(read(self.cart()), mp3("old"))
        self.assertEqual(self.leftovers(), [])

    def test_refused_replace_is_cart_busy(self):
        write(self.cart(), mp3("old"))
        real = os.replace

        def held(src, dst):
            if os.path.normcase(dst) == os.path.normcase(self.cart()):
                raise PermissionError(32, "being used by another process")
            return real(src, dst)

        with mock.patch.object(sync.os, "replace", side_effect=held):
            with self.assertRaises(sync.CartBusy):
                sync.place_cart(mp3("new"), self.cart())
        self.assertEqual(read(self.cart()), mp3("old"))
        self.assertEqual(self.leftovers(), [])

    def test_backup_failure_blocks_the_replace(self):
        write(self.cart(), mp3("old"))
        with mock.patch.object(sync.shutil, "copyfile", side_effect=OSError("D: full")):
            with self.assertRaises(OSError):
                sync.place_cart(mp3("new"), self.cart())
        self.assertEqual(read(self.cart()), mp3("old"))
        self.assertEqual(self.leftovers(), [])

    def test_guard_says_not_now_nothing_written(self):
        write(self.cart(), mp3("old"))
        got = sync.place_cart(mp3("new"), self.cart(), guard=lambda: (True, "airing"))
        self.assertEqual(got, ("deferred", "airing"))
        self.assertEqual(read(self.cart()), mp3("old"))
        self.assertEqual(self.backup_files(), [])
        self.assertEqual(self.leftovers(), [])

    def test_guard_not_asked_when_bytes_are_the_same(self):
        write(self.cart(), mp3("same"))
        guard = mock.Mock(return_value=(True, "airing"))
        self.assertEqual(sync.place_cart(mp3("same"), self.cart(), guard=guard), ("same", None))
        guard.assert_not_called()

    def test_keeps_the_case_already_on_the_share(self):
        write(self.cart("DJB_76097.MP3"), mp3("old"))
        sync.place_cart(mp3("new"), self.cart("DJB_76097.mp3"))
        self.assertEqual(sorted(os.listdir(self.flat)), ["DJB_76097.MP3"])
        self.assertEqual(read(self.cart("DJB_76097.MP3")), mp3("new"))

    def test_archive_copy_replaced_without_backup(self):
        dated = os.path.join(self.archive, "c-dj-tony-neal", "a-on-air", "09262026-onair", "DJB_76097.mp3")
        write(dated, mp3("old"))
        self.assertEqual(sync.place_cart(mp3("new"), dated, backup=False), ("replaced", None))
        self.assertEqual(read(dated), mp3("new"))
        self.assertEqual(self.backup_files(), [])


# ---------------------------------------------------------------------------

class Prune(Sandbox):
    def _mk(self, day, name):
        p = os.path.join(self.backups, day, name)
        write(p, name.encode())
        return p

    def test_keeps_newest_n_and_touches_nothing_else(self):
        mine = []
        for i in range(6):
            mine.append(self._mk("20260901", f"DJB_76097.mp3.1{i}0000"))
        for i in range(6):
            mine.append(self._mk("20260927", f"DJB_76097.wav.0{i}0000"))
        others = [self._mk("20260901", f"DJB_76098.mp3.0{i}0000") for i in range(3)]
        others.append(self._mk("20260901", "DJB_760970.mp3.000000"))        # another cart
        others.append(self._mk("20260901", "DJB_76097.mp3.200000.partial"))  # unfinished copy
        others.append(self._mk("misc", "DJB_76097.mp3.000001"))             # not a day folder
        notes = os.path.join(self.backups, "notes.txt")
        write(notes, b"x")
        outside = os.path.join(self.root, "elsewhere", "20260901", "DJB_76097.mp3.000002")
        write(outside, b"x")
        removed = sync.prune_backups("DJB_76097.mp3", keep=10)
        oldest_two = sorted(mine)[:2]            # 20260901 10:00:00 and 11:00:00
        self.assertEqual(sorted(removed), sorted(os.path.realpath(p) for p in oldest_two))
        for p in sorted(mine)[2:] + others + [notes, outside]:
            self.assertTrue(os.path.exists(p), p)
        for p in oldest_two:
            self.assertFalse(os.path.exists(p), p)

    def test_never_removes_the_last_one(self):
        p = self._mk("20260927", "DJB_76097.mp3.101010")
        self.assertEqual(sync.prune_backups("DJB_76097.mp3", keep=0), [])
        self.assertTrue(os.path.exists(p))

    def test_empty_day_folder_removed_after_prune(self):
        self._mk("20260101", "DJB_76097.mp3.000000")
        self._mk("20260927", "DJB_76097.mp3.101010")
        sync.prune_backups("DJB_76097.mp3", keep=1)
        self.assertEqual(sorted(os.listdir(self.backups)), ["20260927"])

    def test_retention_through_place_cart(self):
        with mock.patch.object(sync, "BACKUP_KEEP", 3):
            for v in range(6):
                sync.place_cart(mp3(f"v{v}"), self.cart())
        files = self.backup_files()
        self.assertEqual(len(files), 3)
        self.assertEqual(sorted(read(p) for p in files), sorted(mp3(f"v{v}") for v in (2, 3, 4)))
        self.assertEqual(read(self.cart()), mp3("v5"))


# ---------------------------------------------------------------------------

TZ = timezone(timedelta(hours=-4))          # EDT


def local(y, mo, d, h, mi, s=0):
    return datetime(y, mo, d, h, mi, s, tzinfo=TZ)


SAT_2210 = local(2026, 9, 26, 22, 10)        # Tony Neal's show: Sat 22:00-00:00
SLOT_SAT_22 = {"day_of_week": 6, "start_time": "22:00", "end_time": "00:00"}
SLOT_WED_12 = {"day_of_week": 3, "start_time": "12:00", "end_time": "14:00"}


class Guard(Sandbox):
    def write_journal(self, day, *events):
        p = os.path.join(self.journal, f"{day}.jsonl")
        with open(p, "a", encoding="utf-8") as f:
            for e in events:
                f.write(json.dumps(e) + "\n")

    @staticmethod
    def start(at, file, cart=0):
        return {"t": at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"), "type": "start",
                "item": {"cart": cart, "title": "Mix Squad Radio", "file": file}, "shadow": False}

    @staticmethod
    def nowplaying(at, cart=12046):
        return {"t": at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
                "type": "nowplaying", "reason": "change", "text": "x", "cart": cart}

    def guard(self, now, slot=SLOT_WED_12, probe=lambda p: 28 * 60, code="DJB_76097"):
        return sync.on_air_guard(code, slot, now=now.astimezone(timezone.utc), tz=TZ, probe=probe)

    def test_airing_now_defers_whatever_the_schedule_says(self):
        self.write_journal("2026-09-26", self.start(local(2026, 9, 26, 22, 0, 13), "DJB_76097.mp3"))
        defer, why = self.guard(SAT_2210, slot=SLOT_WED_12)
        self.assertTrue(defer, why)
        self.assertIn("DJB_76097.mp3 started 9 min ago", why)

    def test_duration_probe_reads_the_airing_file_in_the_flat_folder(self):
        self.write_journal("2026-09-26", self.start(local(2026, 9, 26, 22, 0), "DJB_76097.mp3"))
        seen = []
        self.guard(SAT_2210, probe=lambda p: seen.append(p) or 1800)
        self.assertEqual(seen, [os.path.join(self.flat, "DJB_76097.mp3")])

    def test_aired_and_finished_proceeds(self):
        self.write_journal("2026-09-26",
                     self.start(local(2026, 9, 26, 21, 30), "DJB_76097.mp3"),   # 28 min -> done 21:58
                     self.nowplaying(local(2026, 9, 26, 22, 9)))                # mirror is live
        defer, why = self.guard(SAT_2210, slot=SLOT_SAT_22)
        self.assertFalse(defer, why)
        self.assertEqual(why, "journal current, cart not airing")

    def test_aired_and_finished_outside_the_window_proceeds_on_a_lagging_mirror(self):
        self.write_journal("2026-09-26",
                     self.start(local(2026, 9, 26, 21, 30), "DJB_76097.mp3"),
                     self.nowplaying(local(2026, 9, 26, 21, 58)))
        self.assertFalse(self.guard(SAT_2210, slot=SLOT_WED_12)[0])

    def test_inside_the_two_minute_tail_still_defers(self):
        self.write_journal("2026-09-26",
                     self.start(local(2026, 9, 26, 21, 41), "DJB_76097.mp3"),   # 28 min -> 22:09 (+2)
                     self.nowplaying(local(2026, 9, 26, 22, 9)))
        self.assertTrue(self.guard(SAT_2210)[0])

    def test_unreadable_duration_uses_the_conservative_default(self):
        self.write_journal("2026-09-26",
                     self.start(local(2026, 9, 26, 21, 30), "DJB_76097.mp3"),
                     self.nowplaying(local(2026, 9, 26, 22, 9)))
        defer, why = self.guard(SAT_2210, probe=lambda p: None)   # 40 min in, default 70
        self.assertTrue(defer, why)
        self.assertIn("runs 70 min", why)

    def test_another_cart_airing_with_a_live_mirror_proceeds(self):
        self.write_journal("2026-09-26",
                     self.start(local(2026, 9, 26, 22, 0), "DJB_76097.mp3"),
                     self.start(local(2026, 9, 26, 22, 9), "DJB_76098.mp3"))
        defer, why = self.guard(SAT_2210, slot=SLOT_SAT_22)   # inside the window, but the mirror knows
        self.assertFalse(defer, why)

    def test_lagging_mirror_cannot_clear_a_cart_inside_its_window(self):
        # The mirror is fetched every ~15 min. Last event 10 min old: DJB_76097 may
        # have started since and the mirror would not know -- the window decides.
        self.write_journal("2026-09-26", self.start(local(2026, 9, 26, 22, 0), "DJB_76098.mp3"))
        defer, why = self.guard(SAT_2210, slot=SLOT_SAT_22)
        self.assertTrue(defer, why)
        self.assertIn("journal mirror 10 min old; inside the slot's air window", why)
        self.assertEqual(sync.JOURNAL_STALE_S, 120)

    def test_hour_marker_after_the_cart_does_not_hide_it(self):
        self.write_journal("2026-09-26",
                     self.start(local(2026, 9, 26, 22, 0), "DJB_76097.mp3"),
                     self.start(local(2026, 9, 26, 22, 5), None, cart=0))
        self.assertTrue(self.guard(SAT_2210)[0])

    def test_match_ignores_case_extension_and_zero_padding(self):
        self.write_journal("2026-09-26", self.start(local(2026, 9, 26, 22, 0), "djb_076097.WAV"))
        self.assertTrue(self.guard(SAT_2210)[0])
        self.assertFalse(self.guard(SAT_2210, code="DJB_76098")[0])

    def test_stale_mirror_inside_the_window_defers(self):
        self.write_journal("2026-09-26", self.start(local(2026, 9, 26, 21, 40), "DJB_12046.wav"))  # 30 min old
        defer, why = self.guard(SAT_2210, slot=SLOT_SAT_22)
        self.assertTrue(defer, why)
        self.assertIn("inside the slot's air window Sat 22:00-00:00", why)

    def test_stale_mirror_outside_the_window_proceeds(self):
        self.write_journal("2026-09-26", self.start(local(2026, 9, 26, 21, 40), "DJB_12046.wav"))
        defer, why = self.guard(SAT_2210, slot=SLOT_WED_12)
        self.assertFalse(defer, why)
        self.assertIn("outside", why)

    def test_missing_mirror_inside_the_window_defers(self):
        self.assertTrue(self.guard(SAT_2210, slot=SLOT_SAT_22)[0])

    def test_missing_mirror_outside_the_window_proceeds(self):
        self.assertFalse(self.guard(SAT_2210, slot=SLOT_WED_12)[0])

    def test_missing_mirror_and_no_slot_proceeds(self):
        self.assertFalse(self.guard(SAT_2210, slot={})[0])

    def test_window_runs_past_midnight_plus_padding(self):
        self.assertTrue(self.guard(local(2026, 9, 27, 0, 10), slot=SLOT_SAT_22)[0])
        self.assertFalse(self.guard(local(2026, 9, 27, 0, 20), slot=SLOT_SAT_22)[0])
        self.assertTrue(self.guard(local(2026, 9, 26, 21, 50), slot=SLOT_SAT_22)[0])   # lead-in
        self.assertFalse(self.guard(local(2026, 9, 26, 21, 40), slot=SLOT_SAT_22)[0])

    def test_window_without_end_time_uses_the_default_length(self):
        slot = {"day_of_week": 6, "start_time": "22:00:00"}
        self.assertTrue(self.guard(local(2026, 9, 27, 0, 10), slot=slot)[0])    # 22:00 + 120 + 15

    def test_yesterdays_file_still_counts_after_midnight(self):
        self.write_journal("2026-09-26", self.start(local(2026, 9, 26, 23, 55), "DJB_76097.mp3"))
        self.assertTrue(self.guard(local(2026, 9, 27, 0, 3))[0])


# ---------------------------------------------------------------------------

class PlatformSha(unittest.TestCase):
    ROW = {"checksum_sha256": "a" * 64, "source": "email", "format": "mp3",
           "converted_at": None, "source_format": None}

    def test_email_mp3_row_is_trusted(self):
        self.assertEqual(sync.platform_sha(dict(self.ROW)), "a" * 64)

    def test_untrusted_rows(self):
        for patch in ({"source": "web"}, {"format": "wav"}, {"converted_at": "2026-09-26T00:00:00Z"},
                      {"source_format": "zip"}, {"checksum_sha256": "abc"}, {"checksum_sha256": None}):
            self.assertIsNone(sync.platform_sha(dict(self.ROW, **patch)), patch)


# ---------------------------------------------------------------------------

class Main(Sandbox):
    WEEK = "2026-09-21"

    def setUp(self):
        super().setUp()
        self.now = datetime.now(timezone.utc).replace(microsecond=0)
        self.local = self.now.astimezone()
        # a slot three days from today: never inside its air window
        self.far_dow = ((self.local.weekday() + 1) % 7 + 3) % 7
        self.bucket, self.calls, self.curls, self.mails = {}, [], [], []
        self.pending = []
        for target, fake in ((sync, "api"), (sync.subprocess, "run")):
            p = mock.patch.object(target, fake, side_effect=getattr(self, "_" + fake))
            p.start(); self.addCleanup(p.stop)
        roster = {"dj-tony-neal": {"email": "dj@example.test", "name": "DJ Test"}}
        for name, fn in (("roster", lambda: roster),
                         ("send_sync_notice", lambda *a: self.mails.append(a) or "test")):
            p = mock.patch.object(sync.dj_sync_mail, name, side_effect=fn)
            p.start(); self.addCleanup(p.stop)
        p = mock.patch.object(sync, "utcnow", return_value=self.now)
        p.start(); self.addCleanup(p.stop)

    def _api(self, payload):
        self.calls.append(payload)
        if payload["action"] == "pending":
            return {"ok": True, "drops": self.pending}
        return {"ok": True}

    def _run(self, args, **kw):
        self.assertEqual(args[0], "curl", args)
        out, url = args[args.index("-o") + 1], args[-1]
        self.assertEqual(os.path.commonpath([os.path.realpath(out), self.root]), self.root)
        self.curls.append(url)
        write(out, self.bucket[url])
        return subprocess.CompletedProcess(args, 0, b"", b"")

    def drop(self, data, code="DJB_76097", slug="dj-tony-neal", week=None, **kw):
        week = week or self.WEEK
        d = {"id": f"id-{code}-{week}", "file_code": code, "format": "mp3", "week_of": week,
             "storage_path": f"{slug}/{week}/{code}.mp3", "size_bytes": len(data),
             "djs": {"slug": slug, "display_name": "DJ Test"},
             "slot": {"day_of_week": self.far_dow, "start_time": "22:00", "end_time": "00:00"}}
        d.update(kw)
        self.bucket[f"{sync.BUCKET_PUBLIC}/{d['storage_path']}"] = data
        self.pending.append(d)
        return d

    def dated(self, d):
        return sync.dest_paths(d["file_code"], "mp3", d["djs"]["slug"],
                               d["slot"]["day_of_week"], d["week_of"])[1]

    def main(self):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            sync.main()
        out = buf.getvalue()
        return out, [l for l in out.splitlines() if l.startswith("SUMMARY")][-1]

    def published(self):
        return [c["id"] for c in self.calls if c["action"] == "publish"]

    def airing(self, file, minutes_ago=5):
        at = self.now - timedelta(minutes=minutes_ago)
        p = os.path.join(self.journal, f"{self.local:%Y-%m-%d}.jsonl")
        with open(p, "a", encoding="utf-8") as f:
            f.write(json.dumps({"t": at.isoformat().replace("+00:00", "Z"), "type": "start",
                                "item": {"cart": 0, "file": file}}) + "\n")

    # --- cases -------------------------------------------------------------

    def test_new_cart_created_archived_and_published(self):
        d = self.drop(mp3("wk39"))
        out, summary = self.main()
        self.assertEqual(read(self.cart()), mp3("wk39"))
        self.assertEqual(read(self.dated(d)), mp3("wk39"))
        self.assertEqual(self.published(), [d["id"]])
        self.assertTrue(summary.startswith("SUMMARY dj-drops: new=1 | dj-tony-neal/DJB_76097.mp3"), summary)
        self.assertIn("| deferred=0 | two-file carts=0", summary)
        self.assertIn("OK dj-tony-neal/DJB_76097.mp3 -> air-date folder + M:/JBMusic, published", out)
        self.assertEqual(self.backup_files(), [])
        self.assertEqual(self.leftovers(), [])
        self.assertEqual(len(self.mails), 1)

    def test_changed_cart_backed_up_then_replaced(self):
        write(self.cart(), mp3("wk38"))
        d = self.drop(mp3("wk39"))
        out, _ = self.main()
        self.assertEqual(read(self.cart()), mp3("wk39"))
        [bak] = self.backup_files()
        self.assertEqual(read(bak), mp3("wk38"))
        self.assertIn("CART replaced DJB_76097.mp3; previous copy -> " + bak, out)
        self.assertEqual(self.published(), [d["id"]])

    def test_airing_cart_deferred_archive_still_filed(self):
        write(self.cart(), mp3("wk38"))
        self.airing("DJB_76097.mp3")
        d = self.drop(mp3("wk39"))
        out, summary = self.main()
        self.assertEqual(read(self.cart()), mp3("wk38"))      # untouched while airing
        self.assertEqual(read(self.dated(d)), mp3("wk39"))    # archive copy filed anyway
        self.assertEqual(self.published(), [])                # so the next run retries
        self.assertIn("DEFER dj-tony-neal/DJB_76097: on air now (journal: DJB_76097.mp3 started 5 min ago", out)
        self.assertIn("SUMMARY dj-drops: new=0 | none | deferred=1", summary)
        self.assertEqual(self.backup_files(), [])
        self.assertEqual(self.mails, [])
        # next run, still airing: archive already there -> no second download
        sync._names.clear()
        out, _ = self.main()
        self.assertEqual(len(self.curls), 1)
        self.assertIn("DEFER dj-tony-neal/DJB_76097: on air now", out)
        # it finished: the run after files the cart and publishes
        with mock.patch.object(sync, "utcnow", return_value=self.now + timedelta(minutes=90)):
            sync._names.clear()
            self.main()
        self.assertEqual(read(self.cart()), mp3("wk39"))
        self.assertEqual(self.published(), [d["id"]])

    def test_same_bytes_not_rewritten(self):
        write(self.cart(), mp3("wk39"))
        before = os.stat(self.cart()).st_mtime_ns
        self.airing("DJB_76097.mp3")          # airing doesn't matter: nothing to write
        d = self.drop(mp3("wk39"))            # archive copy missing -> slow path
        out, summary = self.main()
        self.assertIn("SAME sha256 dj-tony-neal/DJB_76097.mp3: the cart already holds these bytes", out)
        self.assertEqual(os.stat(self.cart()).st_mtime_ns, before)
        self.assertEqual(self.backup_files(), [])
        self.assertEqual(read(self.dated(d)), mp3("wk39"))
        self.assertEqual(self.published(), [d["id"]])

    def test_platform_checksum_fast_path_skips_the_download(self):
        data = mp3("emailed")
        d = self.drop(data, source="email", checksum_sha256=sha(data), size_bytes=12345)  # size is wrong
        write(self.cart(), data)
        write(self.dated(d), data)
        out, _ = self.main()
        self.assertEqual(self.curls, [])
        self.assertEqual(self.published(), [d["id"]])
        self.assertIn("SAME sha256 dj-tony-neal/DJB_76097.mp3: both copies match the platform checksum", out)

    def test_portal_reupload_ignores_a_stale_email_checksum(self):
        old, new = mp3("emailed"), mp3("portal", 300_000)   # a real re-upload differs in size
        write(self.cart(), old)
        d = self.drop(new, source="web", checksum_sha256=sha(old))
        write(self.dated(d), old)
        self.main()
        self.assertEqual(len(self.curls), 1)
        self.assertEqual(read(self.cart()), new)

    def test_two_file_cart_warned_once_and_left_alone(self):
        write(self.cart("DJB_76097.wav"), b"RIFF....WAVE")
        wav_before = os.stat(self.cart("DJB_76097.wav")).st_mtime_ns
        self.drop(mp3("a"))
        self.drop(mp3("b"), week="2026-09-28")        # same cart, next week's row
        out, summary = self.main()
        self.assertEqual(out.count("WARN two files for cart DJB_76097"), 1)
        self.assertIn("DJB_76097.mp3 + DJB_76097.wav", out)
        self.assertEqual(os.stat(self.cart("DJB_76097.wav")).st_mtime_ns, wav_before)
        self.assertTrue(summary.endswith("| two-file carts=1"), summary)

    def test_bad_bytes_never_reach_the_cart(self):
        write(self.cart(), mp3("wk38"))
        self.drop(b"<html>" + b"x" * 200_000)
        out, _ = self.main()
        self.assertIn("not audio -- cart left untouched", out)
        self.assertEqual(read(self.cart()), mp3("wk38"))
        self.assertEqual(self.published(), [])
        self.assertEqual(self.leftovers(), [])

    def test_cart_held_open_is_deferred(self):
        write(self.cart(), mp3("wk38"))
        self.drop(mp3("wk39"))
        real = os.replace

        def held(src, dst):
            if os.path.normcase(dst) == os.path.normcase(self.cart()):
                raise PermissionError(32, "being used by another process")
            return real(src, dst)

        with mock.patch.object(sync.os, "replace", side_effect=held):
            out, summary = self.main()
        self.assertIn("DEFER dj-tony-neal/DJB_76097: cart in use, replace refused", out)
        self.assertEqual(read(self.cart()), mp3("wk38"))
        self.assertEqual(self.published(), [])
        self.assertIn("deferred=1", summary)
        self.assertEqual(self.leftovers(), [])

    def test_second_run_while_one_is_going_is_skipped(self):
        self.drop(mp3("wk39"))
        held = sync.run_lock()
        self.assertIsNotNone(held)
        try:
            out, summary = self.main()
        finally:
            sync.release_run_lock(held)
        self.assertEqual(summary, "SUMMARY dj-drops: new=0 | busy (previous run still going)")
        self.assertEqual(self.calls, [])
        self.assertFalse(os.path.exists(self.cart()))
        _, summary = self.main()                       # lock released -> runs
        self.assertTrue(summary.startswith("SUMMARY dj-drops: new=1"), summary)

    def test_one_broken_row_does_not_stop_the_rest(self):
        self.pending.append({"id": "broken"})          # no file_code
        d = self.drop(mp3("wk39"))
        out, _ = self.main()
        self.assertIn("FAIL None: KeyError", out)
        self.assertEqual(self.published(), [d["id"]])


if __name__ == "__main__":
    unittest.main(verbosity=2)
