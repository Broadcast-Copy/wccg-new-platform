#!/usr/bin/env python3
"""
Tests for gmail-watcher's WEBSITE path: a sermon synced for air is queued and a
background worker puts it on the church's profile through the studio-sync
"sermon" actions (owner 2026-09-28). Sandbox only: a local mock of the edge
function + the signed-upload endpoint on 127.0.0.1:3097, every file in a temp
dir. Nothing touches Gmail, Supabase, the Sunday folders or M:\\JBMusic.

    python scripts/test_gmail_watcher_site.py
"""
import base64
import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import types
import unittest
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gw = _load("gmail_watcher_site", "gmail-watcher.py")
import studio_sync_secret  # noqa: E402

PORT = 3097
SECRET = "sandbox-secret-" + "x" * 32
MP3 = b"ID3\x03\x00\x00\x00\x00\x00\x00" + os.urandom(6000)
PMB1 = gw.SERMONS["vesax86@gmail.com"]


class Mock:
    """In-memory studio-sync sermon actions + signed-upload store."""
    def __init__(self):
        self.calls, self.objects, self.rows = [], {}, {}
        self.fail = {}            # action -> (status, error) for the NEXT call of that action
        self.on_put = None        # hook(path) run during a PUT


class Handler(BaseHTTPRequestHandler):
    mock = None

    def log_message(self, *a):
        pass

    def _send(self, status, obj):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        m = Handler.mock
        path = self.path.split("/upload/", 1)[1]
        data = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        m.calls.append(("PUT", path, self.headers.get("Content-Type")))
        if m.on_put:
            m.on_put(path)
        m.objects[path] = data
        self._send(200, {"Key": path})

    def do_POST(self):
        m = Handler.mock
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
        action = body.get("action")
        m.calls.append((action, body.get("church_code"), body.get("air_date")))
        if body.get("secret") != SECRET:
            return self._send(403, {"error": "forbidden"})
        if action in m.fail:
            status, err = m.fail.pop(action)
            return self._send(status, {"error": err})
        key = (body["church_code"], body["air_date"])
        path = f"{body['church_code']}/{body['air_date']}-{body.get('checksum_sha256', '')[:16]}.mp3"
        if action == "sermon":
            row = m.rows.get(key)
            if row and row["sha"] == body["checksum_sha256"]:
                return self._send(200, {"ok": True, "done": True, "upload_url": None, "storage_path": path})
            return self._send(200, {"ok": True, "done": False, "storage_path": path,
                                    "upload_url": f"http://127.0.0.1:{PORT}/upload/{path}",
                                    "airs_at": body["air_date"] + "T17:00:00+00:00"})
        if action == "sermon_uploaded":
            obj = m.objects.get(path)
            if obj is None or len(obj) != body["size_bytes"]:
                return self._send(409, {"error": "object not found / size"})
            m.rows[key] = {"sha": body["checksum_sha256"], "path": path}
            return self._send(200, {"ok": True, "id": "row1", "storage_path": path,
                                    "airs_at": body["air_date"] + "T17:00:00+00:00"})
        if action == "sermon_withdraw":
            return self._send(200, {"ok": True, "row_deleted": key in m.rows, "removed": []})
        return self._send(400, {"error": "unknown action"})


class Sandbox(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.mock = Handler.mock = Mock()
        self.saved = {k: getattr(gw, k) for k in ("CONFIG_DIR", "LOG", "SERMON_ROOT", "ONAIR_FLAT",
                                                   "SITE_PUBLISH", "SITE_DRY_RUN")}
        self.saved_fn = studio_sync_secret.FN
        gw.CONFIG_DIR = os.path.join(self.tmp.name, "cfg")
        os.makedirs(gw.CONFIG_DIR)
        gw.LOG = os.path.join(self.tmp.name, "watcher.log")
        gw.SERMON_ROOT = os.path.join(self.tmp.name, "gospel")
        gw.ONAIR_FLAT = os.path.join(self.tmp.name, "JBMusic")
        os.makedirs(gw.ONAIR_FLAT)
        gw.SITE_PUBLISH, gw.SITE_DRY_RUN = True, False
        studio_sync_secret.FN = f"http://127.0.0.1:{PORT}/fn"
        gw.AIR_BUSY.clear()

    def tearDown(self):
        for k, v in self.saved.items():
            setattr(gw, k, v)
        studio_sync_secret.FN = self.saved_fn
        gw.AIR_BUSY.clear()
        self.tmp.cleanup()

    # helpers
    def src(self, data=MP3, name="pmb1.mp3"):
        p = os.path.join(self.tmp.name, name)
        with open(p, "wb") as fh:
            fh.write(data)
        return p

    def entry(self, code="pmb1", air=date(2099, 12, 27)):
        with open(os.path.join(gw.site_dirs()[0], f"{code}-{air:%Y-%m-%d}.json"), encoding="utf-8") as fh:
            return json.load(fh)

    def queued(self):
        q = gw.site_dirs()[0]
        return sorted(n for n in os.listdir(q) if n.endswith(".json")) if os.path.isdir(q) else []

    def actions(self):
        return [c[0] for c in self.mock.calls]


class Queue(Sandbox):
    def test_queue_writes_one_entry_per_church_sunday(self):
        self.assertTrue(gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src()))
        e = self.entry()
        self.assertEqual((e["code"], e["air_date"], e["tries"]), ("pmb1", "2099-12-27", 0))
        # a re-send for the same Sunday replaces the entry (newest file wins)
        self.assertTrue(gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src(name="other.mp3")))
        self.assertEqual(self.queued(), ["pmb1-2099-12-27.json"])
        self.assertTrue(self.entry()["src"].endswith("other.mp3"))

    def test_queue_never_raises(self):
        blocker = os.path.join(self.tmp.name, "a-file")
        with open(blocker, "w") as fh:
            fh.write("x")
        gw.CONFIG_DIR = os.path.join(blocker, "cfg")          # makedirs under a FILE fails
        self.assertFalse(gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src()))

    def test_switched_off(self):
        gw.SITE_PUBLISH = False
        self.assertFalse(gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src()))
        self.assertEqual(self.queued(), [])


class AirPathUnchanged(Sandbox):
    """handle_message for a sermon: the air sync happens exactly as before, then the
    website entry is queued; a broken queue changes nothing for air."""
    def run_message(self):
        mails = []
        saved = {k: getattr(gw, k) for k in ("fetch_audio", "ffmpeg_intact", "send_mail")}
        gw.fetch_audio = lambda gmail, drive, msg, spec: MP3 + b"\x00" * 210000
        gw.ffmpeg_intact = lambda path: True
        gw.send_mail = lambda gmail, subject, body: mails.append((subject, body))
        msg = {"id": "m1", "internalDate": str(int(datetime.now().timestamp() * 1000)),
               "payload": {"headers": [{"name": "From", "value": "Progressive <vesax86@gmail.com>"},
                                       {"name": "Subject", "value": "sermon"}]}}
        gmail = types.SimpleNamespace(users=lambda: types.SimpleNamespace(messages=lambda: types.SimpleNamespace(
            get=lambda **k: types.SimpleNamespace(execute=lambda: msg))))
        state = {"processed": []}
        try:
            gw.handle_message(gmail, None, "m1", state)
        finally:
            for k, v in saved.items():
                setattr(gw, k, v)
        return state, mails

    def test_synced_then_queued(self):
        state, mails = self.run_message()
        sun = gw.this_sunday()
        cart = os.path.join(gw.ONAIR_FLAT, "DJB_52011.mp3")
        self.assertEqual(state["processed"], ["m1"])
        self.assertTrue(os.path.exists(cart))
        e = self.entry(air=sun)
        self.assertEqual(e["src"], os.path.join(gw.sunday_folder(sun), "pmb1.mp3"))
        self.assertIn("Website: queued", mails[0][1])
        self.assertEqual(self.mock.calls, [])                  # nothing uploaded on the air path

    def test_queue_failure_changes_nothing_for_air(self):
        saved = gw._write_json_atomic
        gw._write_json_atomic = lambda *a: (_ for _ in ()).throw(OSError("disk full"))
        try:
            state, mails = self.run_message()
        finally:
            gw._write_json_atomic = saved
        self.assertEqual(state["processed"], ["m1"])
        self.assertTrue(os.path.exists(os.path.join(gw.ONAIR_FLAT, "DJB_52011.mp3")))
        self.assertNotIn("Website", mails[0][1])


class Worker(Sandbox):
    def test_mp3_goes_as_is_in_order(self):
        src = self.src()
        gw.queue_site_publish("pmb1", date(2099, 12, 27), src)
        self.assertEqual(gw.site_process_due(secret=SECRET), 1)
        self.assertEqual(self.actions(), ["sermon", "PUT", "sermon_uploaded"])
        self.assertEqual(self.mock.calls[1][2], "audio/mpeg")
        (path, data), = self.mock.objects.items()
        self.assertEqual(data, MP3)
        self.assertTrue(path.endswith(hashlib.sha256(MP3).hexdigest()[:16] + ".mp3"))
        self.assertEqual(self.queued(), [])
        self.assertEqual(os.listdir(gw.site_dirs()[3]), [])    # snapshot cleaned up
        self.assertTrue(os.path.exists(src))                   # the Sunday-folder file is untouched

    @unittest.skipUnless(os.path.exists(gw.FFMPEG), "station ffmpeg not installed")
    def test_wav_is_transcoded_for_the_web(self):
        wav = os.path.join(self.tmp.name, "pmb1.wav")
        subprocess.run([gw.FFMPEG, "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
                        "-ar", "44100", "-ac", "2", wav], check=True, creationflags=gw.NO_WINDOW)
        gw.queue_site_publish("pmb1", date(2099, 12, 27), wav)
        self.assertEqual(gw.site_process_due(secret=SECRET), 1)
        (_, data), = self.mock.objects.items()
        self.assertTrue(data[:3] == b"ID3" or data[0] == 0xFF)
        self.assertEqual(os.listdir(gw.site_dirs()[3]), [])

    def test_already_there_uploads_nothing(self):
        self.mock.rows[("pmb1", "2099-12-27")] = {"sha": hashlib.sha256(MP3).hexdigest(), "path": "x"}
        gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src())
        self.assertEqual(gw.site_process_due(secret=SECRET), 1)
        self.assertEqual(self.actions(), ["sermon"])
        self.assertEqual(self.queued(), [])

    def test_transient_failure_backs_off_then_succeeds(self):
        gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src())
        self.mock.fail["sermon"] = (500, "boom")
        now = datetime.now()
        self.assertEqual(gw.site_process_due(now=now, secret=SECRET), 0)
        e = self.entry()
        self.assertEqual(e["tries"], 1)
        self.assertIn("HTTP 500", e["last"])
        self.assertEqual(gw.site_process_due(now=now + timedelta(minutes=1), secret=SECRET), 0)  # not due
        self.assertEqual(self.actions(), ["sermon"])
        self.assertEqual(gw.site_process_due(now=now + timedelta(minutes=3), secret=SECRET), 1)
        self.assertEqual(self.queued(), [])

    def test_secret_not_provisioned_yet_is_retried(self):
        gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src())
        self.assertEqual(gw.site_process_due(secret="wrong"), 0)     # 403
        self.assertEqual(self.entry()["tries"], 1)
        saved = studio_sync_secret.load
        studio_sync_secret.load = lambda legacy=False: None           # nothing on this PC
        try:
            self.assertEqual(gw.site_process_due(now=datetime.now() + timedelta(minutes=3)), 0)
        finally:
            studio_sync_secret.load = saved
        self.assertIn("no studio-sync secret", self.entry()["last"])

    def test_archive_conflict_is_parked_not_retried(self):
        gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src())
        self.mock.fail["sermon"] = (409, "aired over a week ago")
        gw.site_process_due(secret=SECRET)
        self.assertEqual(self.queued(), [])
        self.assertEqual(os.listdir(gw.site_dirs()[1]), ["pmb1-2099-12-27.json"])

    def test_gives_up_after_two_weeks(self):
        gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src(), now=datetime.now() - timedelta(days=15))
        self.mock.fail["sermon"] = (500, "boom")
        gw.site_process_due(secret=SECRET)
        self.assertEqual(self.queued(), [])
        self.assertEqual(os.listdir(gw.site_dirs()[1]), ["pmb1-2099-12-27.json"])

    def test_nothing_starts_while_a_mail_is_handled(self):
        gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src())
        gw.AIR_BUSY.set()
        self.assertEqual(gw.site_process_due(secret=SECRET), 0)
        self.assertEqual(self.mock.calls, [])
        self.assertEqual(self.entry()["tries"], 0)

    def test_resend_during_upload_is_not_lost(self):
        src = self.src()
        gw.queue_site_publish("pmb1", date(2099, 12, 27), src)
        self.mock.on_put = lambda path: gw.queue_site_publish("pmb1", date(2099, 12, 27), src)
        self.assertEqual(gw.site_process_due(secret=SECRET), 1)
        self.assertEqual(self.queued(), ["pmb1-2099-12-27.json"])   # the newer entry survives
        self.assertEqual(self.entry()["tries"], 0)

    def test_dry_run_uploads_nothing(self):
        gw.SITE_DRY_RUN = True
        gw.queue_site_publish("pmb1", date(2099, 12, 27), self.src())
        self.assertEqual(gw.site_process_due(), 0)
        self.assertEqual(self.mock.calls, [])
        self.assertEqual(os.listdir(gw.site_dirs()[2]), ["pmb1-2099-12-27.json"])
        with open(gw.LOG, encoding="utf-8") as fh:
            self.assertIn("DRY RUN pmb1 2099-12-27", fh.read())


class Cli(Sandbox):
    def args(self, **kw):
        base = dict(publish_sermon=None, withdraw_sermon=False, backfill_sermons=None, until=None,
                    church=None, air_date=None, checksum=None, dry_run=False)
        base.update(kw)
        return types.SimpleNamespace(**base)

    def test_publish_dry_run_needs_no_secret_or_network(self):
        rc = gw.sermon_site_cli(self.args(publish_sermon=self.src(), church="pmb1",
                                          air_date="2099-12-27", dry_run=True))
        self.assertEqual(rc, 0)
        self.assertEqual(self.mock.calls, [])

    def test_publish_and_withdraw(self):
        os.environ[studio_sync_secret.ENV] = SECRET
        try:
            self.assertEqual(gw.sermon_site_cli(self.args(publish_sermon=self.src(), church="pmb1",
                                                          air_date="2099-12-27")), 0)
            self.assertEqual(gw.sermon_site_cli(self.args(withdraw_sermon=True, church="pmb1",
                                                          air_date="2099-12-27")), 0)
        finally:
            os.environ.pop(studio_sync_secret.ENV, None)
        self.assertEqual(self.actions(), ["sermon", "PUT", "sermon_uploaded", "sermon_withdraw"])

    def test_unknown_church_refused(self):
        self.assertEqual(gw.sermon_site_cli(self.args(publish_sermon=self.src(), church="zzz9",
                                                      air_date="2099-12-27", dry_run=True)), 1)

    def test_backfill_discovery(self):
        def put(rel, data=MP3):
            p = os.path.join(gw.SERMON_ROOT, rel)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "wb") as fh:
                fh.write(data)
        put(r"2026\sunday 061426\lcc1.mp3")      # before since
        put(r"2026\sunday 062126\pmb1.wav")      # both kept on disk that week:
        put(r"2026\sunday 062126\pmb1.mp3")      #   only the .mp3 is published
        put(r"2026\sunday 062126\gpn1.mp3")
        put(r"2026\sunday 062126\notes.txt")
        put(r"2026\sunday 062226\thm1.mp3")      # a Monday: not a Sunday folder
        put(r"2026\sunday 062826\dvp1.m4a")
        files = gw.sunday_folder_files(date(2026, 6, 15), root=gw.SERMON_ROOT)
        self.assertEqual([(c, d) for c, d, _ in files],
                         [("gpn1", date(2026, 6, 21)), ("pmb1", date(2026, 6, 21)), ("dvp1", date(2026, 6, 28))])
        self.assertTrue(files[1][2].endswith("pmb1.mp3"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
