#!/usr/bin/env python3
"""
Tests for gmail-watcher's OneDrive sermon links (Progressive / pmb1 switched to
personal OneDrive share links on 2026-09-13 and was missed three Sundays running).
No network, no Gmail, nothing written outside a temp dir.

    python scripts/test_gmail_watcher_onedrive.py
"""
import base64
import importlib.util
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gw = _load("gmail_watcher", "gmail-watcher.py")
PMB1 = gw.SERMONS["vesax86@gmail.com"]
LCC1 = gw.SERMONS["lewischapel.org"]
DVP1 = gw.SERMONS["ffwcaudio@gmail.com"]

# the 2026-09-20 10:23 and 2026-09-13 11:40 bodies, as the Gmail API returns them
BODY_0920 = ("This is the same from today just sent as link. I hope one of the 2 work. "
             "https://1drv.ms/u/c/bea052afc5541739/IQCn23j8zhIRTaAquCX1orFPASQln8LJXxcH-WHADjrjnPM \r\n")
BODY_0913 = ("https://1drv.ms/u/c/bea052afc5541739/IQBrx9P5VtMcSLjd8a1EtCa2AUm749BCcko2S9hX2CiQ75s\r\n"
             "Been having issues emailing it, so I hope this works.")
WAV = b"RIFF\x80A\xc4\x13WAVEfmt " + b"\x00" * 64


def msg_with(text):
    data = base64.urlsafe_b64encode(text.encode()).decode()
    return {"id": "m1", "payload": {"mimeType": "multipart/alternative", "headers": [
        {"name": "From", "value": "Progressive <vesax86@gmail.com>"}],
        "parts": [{"mimeType": "text/plain", "body": {"data": data}}]}}


class ExtractOneDrive(unittest.TestCase):
    def test_1drv_link_gets_download_flag(self):
        self.assertEqual(gw.extract_onedrive(BODY_0920),
                         "https://1drv.ms/u/c/bea052afc5541739/IQCn23j8zhIRTaAquCX1orFPASQln8LJXxcH-WHADjrjnPM?download=1")

    def test_link_at_line_start(self):
        self.assertTrue(gw.extract_onedrive(BODY_0913).endswith("75s?download=1"))

    def test_live_link_with_query_gets_ampersand(self):
        u = gw.extract_onedrive("see https://onedrive.live.com/:u:/g/personal/ABC/XYZ?resid=ABC!s1&e=2 ok")
        self.assertEqual(u, "https://onedrive.live.com/:u:/g/personal/ABC/XYZ?resid=ABC!s1&e=2&download=1")

    def test_existing_download_flag_kept(self):
        self.assertEqual(gw.extract_onedrive("<https://1drv.ms/u/c/a/b?download=1>"), "https://1drv.ms/u/c/a/b?download=1")

    def test_trailing_punctuation_stripped(self):
        self.assertEqual(gw.extract_onedrive("link: https://1drv.ms/u/c/a/b."), "https://1drv.ms/u/c/a/b?download=1")

    def test_no_link(self):
        self.assertIsNone(gw.extract_onedrive("Sunday, 9h43m AM.wav"))
        self.assertIsNone(gw.extract_onedrive("https://drive.google.com/file/d/1OuBsxos85pwqdjQ0AzPmLETMn631x62Y/view"))


class FetchAudioFallbacks(unittest.TestCase):
    def setUp(self):
        self.saved = (gw.onedrive_bytes, gw.drive_search_by_name, gw.drive_bytes, gw.log)
        self.calls = []
        gw.log = lambda m: None
        gw.drive_search_by_name = lambda drive, text, frm: self.calls.append("search") or None
        gw.drive_bytes = lambda drive, fid: self.calls.append(("drive", fid)) or WAV

    def tearDown(self):
        gw.onedrive_bytes, gw.drive_search_by_name, gw.drive_bytes, gw.log = self.saved

    def test_drive_kind_uses_onedrive_when_no_drive_id(self):
        gw.onedrive_bytes = lambda url: self.calls.append(("od", url)) or WAV
        self.assertEqual(gw.fetch_audio(None, None, msg_with(BODY_0920), PMB1), WAV)
        self.assertEqual(self.calls[0][0], "od")
        self.assertNotIn("search", self.calls)

    def test_drive_kind_falls_through_to_name_search_when_onedrive_fails(self):
        gw.onedrive_bytes = lambda url: self.calls.append(("od", url)) or None
        self.assertIsNone(gw.fetch_audio(None, None, msg_with(BODY_0913), PMB1))
        self.assertEqual([c if isinstance(c, str) else c[0] for c in self.calls], ["od", "search"])

    def test_drive_link_still_preferred(self):
        gw.onedrive_bytes = lambda url: self.fail("OneDrive must not be tried when a Drive id exists")
        body = "https://drive.google.com/file/d/1OuBsxos85pwqdjQ0AzPmLETMn631x62Y/view " + BODY_0920
        self.assertEqual(gw.fetch_audio(None, None, msg_with(body), PMB1), WAV)
        self.assertEqual(self.calls, [("drive", "1OuBsxos85pwqdjQ0AzPmLETMn631x62Y")])

    def test_attachment_kind_falls_back_to_onedrive(self):
        gw.onedrive_bytes = lambda url: WAV
        self.assertEqual(gw.fetch_audio(None, None, msg_with(BODY_0920), LCC1), WAV)

    def test_dropbox_kind_falls_back_to_onedrive(self):
        gw.onedrive_bytes = lambda url: WAV
        self.assertEqual(gw.fetch_audio(None, None, msg_with(BODY_0920), DVP1), WAV)


class OneDriveBytes(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.saved = (gw.CONFIG_DIR, gw.subprocess.run, gw.log)
        gw.CONFIG_DIR = self.tmp
        gw.log = lambda m: None

    def tearDown(self):
        gw.CONFIG_DIR, gw.subprocess.run, gw.log = self.saved

    def fake_curl(self, payload, rc=0):
        def run(args, **kw):
            self.assertIn("-A", args)
            self.assertEqual(args[args.index("-A") + 1], gw.BROWSER_UA)
            with open(args[args.index("-o") + 1], "wb") as fh:
                fh.write(payload)
            return type("R", (), {"returncode": rc})()
        gw.subprocess.run = run

    def test_audio_accepted_and_temp_files_removed(self):
        self.fake_curl(WAV)
        self.assertEqual(gw.onedrive_bytes("https://1drv.ms/u/c/a/b?download=1"), WAV)
        self.assertEqual(os.listdir(self.tmp), [])

    def test_blocked_html_page_rejected(self):
        self.fake_curl(b"<!DOCTYPE html PUBLIC '-//W3C//DTD'> The request is blocked.")
        self.assertIsNone(gw.onedrive_bytes("https://1drv.ms/u/c/a/b?download=1"))
        self.assertEqual(os.listdir(self.tmp), [])

    def test_m4a_accepted_for_transcode(self):
        m4a = b"\x00\x00\x00\x20ftypM4A " + b"\x00" * 32
        self.fake_curl(m4a)
        self.assertEqual(gw.onedrive_bytes("https://1drv.ms/u/c/a/b?download=1"), m4a)

    def test_curl_failure(self):
        self.fake_curl(b"", rc=28)
        self.assertIsNone(gw.onedrive_bytes("https://1drv.ms/u/c/a/b?download=1"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
