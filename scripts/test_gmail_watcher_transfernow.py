#!/usr/bin/env python3
"""
Pure-function tests for gmail-watcher's DJ-pack path (TransferNow / Drive ->
studio-sync ingest). No network, no Gmail, nothing written outside a temp dir.

    python scripts/test_gmail_watcher_transfernow.py
"""
import importlib.util
import os
import sys
import tempfile
import unittest
from datetime import date, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gw = _load("gmail_watcher", "gmail-watcher.py")
sync = _load("sync_dj_drops", "sync-dj-drops.py")
import studio_sync_secret  # noqa: E402

TONY = gw.DJ_PACKS["tnealmusic@gmail.com"]
DADDY = gw.DJ_PACKS["djdaddyblack005@gmail.com"]
CORLEONE = gw.DJ_PACKS["cjgarris3@hotmail.com"]

# the 2026-09-26 pack exactly as TransferNow listed it (API order, typo'd names)
PACK_0926 = [
    dict(id="H8aOkr", name="hh9-26 (26)/hh9=26, 3 (26).mp3", size=55445508, kind="tn"),
    dict(id="Ney2CA", name="hh9-26 (26)/hh9-26, 1 (26).mp3", size=58512271, kind="tn"),
    dict(id="nKAm1d", name="hh9-26 (26)/hh9-26, 2 (26).mp3", size=55180103, kind="tn"),
    dict(id="cVG4PY", name="hh9-26 (26)/hh9-29, 4 (26).mp3", size=55948103, kind="tn"),
]
RNB_0919 = [dict(id=f"r{n}", name=f"9-19 (26)/rnb9-19, {n} (26).mp3", size=5, kind="tn") for n in range(1, 9)]


def f(name, size=1):
    return dict(id=name, name=name, size=size, kind="tn")


class PartNumbers(unittest.TestCase):
    def test_0926_typo_names(self):
        self.assertEqual(gw.pack_part_number("hh9-26, 1 (26).mp3", TONY), 1)
        self.assertEqual(gw.pack_part_number("hh9-26, 2 (26).mp3", TONY), 2)
        self.assertEqual(gw.pack_part_number("hh9=26, 3 (26).mp3", TONY), 3)
        self.assertEqual(gw.pack_part_number("hh9-29, 4 (26).mp3", TONY), 4)

    def test_folder_prefix_and_variants(self):
        self.assertEqual(gw.pack_part_number("hh9-26 (26)/hh9-26, 1 (26).mp3", TONY), 1)
        self.assertEqual(gw.pack_part_number("hh9-13,2(26).mp3", TONY), 2)
        self.assertEqual(gw.pack_part_number("rnb9-19, 7 (26) (80's).mp3", TONY), 7)
        self.assertIsNone(gw.pack_part_number("hh9-26 (26).mp3", TONY))

    def test_other_djs(self):
        self.assertEqual(gw.pack_part_number("DjDBM1 05-15-26.mp3", DADDY), 1)
        self.assertEqual(gw.pack_part_number("DjDBM2 05-15-26.mp3", DADDY), 2)
        self.assertEqual(gw.pack_part_number("DJB_75093.mp3", CORLEONE), 1)
        self.assertEqual(gw.pack_part_number("DJB_75094.mp3", CORLEONE), 2)
        self.assertIsNone(gw.pack_part_number("DJB_76097.mp3", CORLEONE))  # not his cart

    def test_0926_plan_orders_by_part_not_name(self):
        parts, others, problem = gw.plan_pack(PACK_0926, TONY)
        self.assertIsNone(problem)
        self.assertEqual(others, [])
        got = {TONY["carts"][n - 1]: parts[n]["id"] for n in parts}
        self.assertEqual(got, {"DJB_76097": "Ney2CA", "DJB_76098": "nKAm1d",
                               "DJB_76099": "H8aOkr", "DJB_76100": "cVG4PY"})
        # a name sort would have put the typo'd part 4 ("hh9-29") third
        by_name = [e["id"] for e in sorted(PACK_0926, key=lambda e: e["name"])]
        self.assertNotEqual(by_name, ["Ney2CA", "nKAm1d", "H8aOkr", "cVG4PY"])


class SetFilter(unittest.TestCase):
    def test_hh_in_rnb_out(self):
        self.assertTrue(gw.pack_in_set("hh9-26 (26)/hh9-26, 1 (26).mp3", TONY))
        self.assertTrue(gw.pack_in_set("HH9-26, 1 (26).MP3", TONY))
        self.assertFalse(gw.pack_in_set("9-19 (26)/rnb9-19, 1 (26).mp3", TONY))
        self.assertFalse(gw.pack_in_set("hh9-26 cover.jpg", TONY))

    def test_mixed_pack_keeps_only_hh(self):
        parts, others, problem = gw.plan_pack(PACK_0926 + RNB_0919, TONY)
        self.assertIsNone(problem)
        self.assertEqual(sorted(parts), [1, 2, 3, 4])
        self.assertEqual(len(others), 8)

    def test_rnb_only_pack_is_not_a_problem_just_empty(self):
        parts, others, problem = gw.plan_pack(RNB_0919, TONY)
        self.assertEqual((parts, problem), ({}, None))
        self.assertEqual(len(others), 8)

    def test_wrong_part_sets_block_ingest(self):
        base = [f("hh9-26, 1 (26).mp3"), f("hh9-26, 2 (26).mp3"), f("hh9-26, 4 (26).mp3")]
        self.assertIsNotNone(gw.plan_pack(base, TONY)[2])                                  # 3 missing
        self.assertIsNotNone(gw.plan_pack(base + [f("hh9-26, 3 (26).mp3"), f("hh9-26, 2 (26) clean.mp3")], TONY)[2])  # dup
        self.assertIsNotNone(gw.plan_pack(base + [f("hh9-26, 3 (26).mp3"), f("hh9-26, 5 (26).mp3")], TONY)[2])  # extra
        self.assertIsNotNone(gw.plan_pack(base + [f("hh9-26, 3 (26).wav")], TONY)[2])      # not mp3
        self.assertIsNotNone(gw.plan_pack(base + [f("hh9-26 part three.mp3")], TONY)[2])   # no part number
        self.assertIsNone(gw.plan_pack(base + [f("hh9-26, 3 (26).mp3")], TONY)[2])

    def test_corleone_folder(self):
        parts, others, problem = gw.plan_pack([f("DJB_75094.mp3"), f("DJB_75093.mp3"), f("flyer.png")], CORLEONE)
        self.assertIsNone(problem)
        self.assertEqual({n: parts[n]["name"] for n in parts}, {1: "DJB_75093.mp3", 2: "DJB_75094.mp3"})
        self.assertEqual(len(others), 1)


class AirDate(unittest.TestCase):
    CASES = [
        # (spec, subject, email received, expected air date)
        (TONY, "The week of 9/26/26 | DJ Tony Neal | Urban (Hip Hop & R&B mixes)", datetime(2026, 9, 25, 1, 20), date(2026, 9, 26)),
        (TONY, "Urban Mixes (week of 9/13/26) T. Neal", datetime(2026, 9, 10, 20, 57), date(2026, 9, 12)),  # names a Sunday
        (TONY, "Urban Mixes (week of 8/22/26) T. Neal", datetime(2026, 8, 20, 23, 20), date(2026, 8, 22)),
        (TONY, "Urban Stations / Hip Hop (the week of 8/16/26) T. Neal", datetime(2026, 8, 13, 20, 37), date(2026, 8, 15)),
        (TONY, "Urban (week of 7-25) T. Neal", datetime(2026, 7, 23, 18, 5), date(2026, 7, 25)),
        (TONY, "Urban Mixes (week of 7//18/26 - Tony Neal", datetime(2026, 7, 17, 3, 54), date(2026, 7, 18)),
        (TONY, "Hip Hop / R&B (Week of 7-4-26) T. Neal", datetime(2026, 7, 2, 17, 49), date(2026, 7, 4)),
        (TONY, "Hip Hop Mixes (Week of 6/27/26)", datetime(2026, 6, 22, 17, 52), date(2026, 6, 27)),
        (TONY, "Urban Mixes (Hip Hop & R&B) T. Neal", datetime(2026, 8, 6, 23, 2), date(2026, 8, 8)),        # no date
        (TONY, "The week of 9/26/25 | DJ Tony Neal", datetime(2026, 9, 25, 9, 0), date(2026, 9, 26)),       # typo'd year
        (TONY, "Urban Mixes T. Neal", datetime(2026, 9, 26, 22, 30), date(2026, 10, 3)),                     # during the show
        (DADDY, "Friday Mixes 05-15-26 1&2", datetime(2026, 5, 11, 20, 15), date(2026, 5, 15)),
        (DADDY, "Mix Show For This Friday 02-20-26", datetime(2026, 2, 17, 18, 37), date(2026, 2, 20)),
        (CORLEONE, "Shorty: WCCG 6/21/26 MIXSHOW", datetime(2026, 6, 19, 14, 2), date(2026, 6, 21)),
        (CORLEONE, "This One: WCCG 5/10/26 MIXSHOW", datetime(2026, 5, 9, 18, 9), date(2026, 5, 10)),
    ]

    def test_subject_variants(self):
        for spec, subj, got_at, want in self.CASES:
            with self.subTest(subj=subj):
                self.assertEqual(gw.pack_air_date(subj, got_at, spec)[0], want)

    def test_no_false_dates(self):
        ref = date(2026, 9, 1)
        self.assertIsNone(gw.parse_subject_date("more on the way!!! rnb8-29, 1 (26) T. Neal", ref))
        self.assertIsNone(gw.parse_subject_date("New Pass word needed: Time to upload your mix - WCCG 104.5 FM", ref))
        self.assertIsNone(gw.parse_subject_date("Fwd: Slow Jam Mixtape Show #431 - Tonight at 9PM EST", ref))


class IngestTiming(unittest.TestCase):
    """Replaces the old Saturday on-air window: a pack is ingested only for the NEXT
    show, and only up to PACK_LEAD_MINUTES before it starts."""

    def test_tony_saturday_cutoff(self):
        sat = date(2026, 9, 26)
        self.assertEqual(gw.ingest_timing(sat, datetime(2026, 9, 25, 9, 0), TONY), "ok")
        self.assertEqual(gw.ingest_timing(sat, datetime(2026, 9, 26, 21, 54), TONY), "ok")
        self.assertEqual(gw.ingest_timing(sat, datetime(2026, 9, 26, 21, 55), TONY), "late")
        self.assertEqual(gw.ingest_timing(sat, datetime(2026, 9, 27, 0, 30), TONY), "late")
        self.assertEqual(gw.ingest_timing(date(2026, 10, 3), datetime(2026, 9, 26, 21, 55), TONY), "ok")
        self.assertEqual(gw.ingest_timing(date(2026, 10, 3), datetime(2026, 9, 25, 9, 0), TONY), "early")

    def test_corleone_sunday(self):
        sun = date(2026, 9, 27)
        self.assertEqual(gw.ingest_timing(sun, datetime(2026, 9, 27, 16, 54), CORLEONE), "ok")
        self.assertEqual(gw.ingest_timing(sun, datetime(2026, 9, 27, 16, 55), CORLEONE), "late")


class IngestShaping(unittest.TestCase):
    SHA = "AB" * 32

    def test_week_of_matches_portal_and_studio_sync(self):
        # live rows: Tony Sat 9/26 -> 2026-09-21; Corleone Sun 9/20 -> 2026-09-14; Daddy Black Fri 9/4 -> 2026-08-31
        for air, want, dow in [(date(2026, 9, 26), "2026-09-21", 6), (date(2026, 9, 20), "2026-09-14", 0),
                               (date(2026, 9, 4), "2026-08-31", 5)]:
            self.assertEqual(gw.week_of_for(air), want)
            # sync-dj-drops.py maps (week_of, slot day_of_week 0=Sun) back to the same air date
            self.assertEqual(sync.air_date(want, dow).date(), air)

    def test_storage_path_is_the_portal_convention(self):
        self.assertEqual(gw.storage_path_for("dj-tony-neal", "2026-09-21", "DJB_76097"),
                         "dj-tony-neal/2026-09-21/DJB_76097.mp3")

    def test_payloads(self):
        p = gw.ingest_payload(TONY, "DJB_76097", "2026-09-21", 58512271.0, self.SHA)
        self.assertEqual(p, {"action": "ingest", "dj_slug": "dj-tony-neal", "file_code": "DJB_76097",
                             "week_of": "2026-09-21", "size_bytes": 58512271, "format": "mp3",
                             "checksum_sha256": "ab" * 32, "source": "email"})
        self.assertNotIn("secret", p)
        self.assertIsInstance(p["size_bytes"], int)
        q = gw.ingest_payload(TONY, "DJB_76097", "2026-09-21", 58512271, self.SHA, action="ingested")
        self.assertEqual({**q, "action": "ingest"}, p)

    def test_ingest_needed(self):
        path = "dj-tony-neal/2026-09-21/DJB_76097.mp3"
        sha = "ab" * 32
        self.assertTrue(gw.ingest_needed(None, sha, path))
        # this week's live row: published, holding part 3, no checksum -> must be overwritten
        self.assertTrue(gw.ingest_needed({"status": "published", "checksum_sha256": None, "storage_path": path}, sha, path))
        self.assertFalse(gw.ingest_needed({"status": "published", "checksum_sha256": sha.upper(), "storage_path": path}, sha, path))
        self.assertFalse(gw.ingest_needed({"status": "uploaded", "checksum_sha256": sha, "storage_path": path}, sha, path))
        self.assertTrue(gw.ingest_needed({"status": "rejected", "checksum_sha256": sha, "storage_path": path}, sha, path))
        self.assertTrue(gw.ingest_needed({"status": "published", "checksum_sha256": sha, "storage_path": path + "x"}, sha, path))
        self.assertTrue(gw.ingest_needed({"status": "published", "checksum_sha256": "cd" * 32, "storage_path": path}, sha, path))


class Links(unittest.TestCase):
    def test_transfernow_links(self):
        body = ("Here you go https://thecoredjs.transfernow.net/dl/hh9-26-26\n"
                '<a href="https://thecoredjs.transfernow.net/dl/hh9-26-26">download</a> '
                "also (https://www.transfernow.net/dl/20260903hr0erXu7).")
        self.assertEqual(gw.extract_transfernow_links(body),
                         ["https://thecoredjs.transfernow.net/dl/hh9-26-26",
                          "https://www.transfernow.net/dl/20260903hr0erXu7"])
        self.assertEqual(gw.tn_slug("https://thecoredjs.transfernow.net/dl/hh9-26-26"), "hh9-26-26")
        self.assertEqual(gw.extract_transfernow_links("Fwd: This Week in Hip-Hop News"), [])

    def test_drive_links(self):
        body = ("DjDBM1 05-15-26.mp3 <https://drive.google.com/file/d/1m66mm6TA_auEejJt2MpTIKKtmgXvTfNo/view?usp=drive_web>\n"
                "Shorty https://drive.google.com/drive/folders/1UEV8-sK-hoBi-4nuHulpTFJQkKDweavn?usp=drive_link")
        self.assertEqual(gw.DRIVE_FILE_RE.findall(body), ["1m66mm6TA_auEejJt2MpTIKKtmgXvTfNo"])
        self.assertEqual(gw.DRIVE_FOLDER_RE.findall(body), ["1UEV8-sK-hoBi-4nuHulpTFJQkKDweavn"])


def _mail(subject, body, received):
    import base64
    data = base64.urlsafe_b64encode(body.encode()).decode()
    return {"id": "m", "internalDate": str(int(received.timestamp() * 1000)),
            "payload": {"headers": [{"name": "Subject", "value": subject},
                                    {"name": "From", "value": "Tony <tnealmusic@gmail.com>"}],
                        "mimeType": "text/plain", "body": {"data": data}}}


class HandlerFlow(unittest.TestCase):
    """handle_dj_pack end to end with every network call faked (TransferNow, the
    studio-sync edge fn, the signed PUT, Gmail send). Checks the ingest ORDER:
    all ingest -> all uploads -> all ingested, and nothing flipped on a failure."""
    LINK = "https://thecoredjs.transfernow.net/dl/hh9-26-26"
    NOW = datetime(2026, 9, 25, 9, 30)
    RECEIVED = datetime(2026, 9, 25, 1, 20)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.calls, self.mails, self.fail_put = [], [], None
        self.saved = {k: getattr(gw, k) for k in ("CONFIG_DIR", "LOG", "tn_metadata", "tn_download",
                                                   "verify_part", "studio_sync", "put_signed", "send_mail")}
        gw.CONFIG_DIR = self.tmp.name
        gw.LOG = os.path.join(self.tmp.name, "watcher.log")
        gw.tn_metadata = lambda sess, url: dict(base="https://x", transferId="T1", name="hh9-26 (26)",
                                                files=[dict(e) for e in PACK_0926], until="", sender="")

        def fake_download(sess, meta, entry, dest):
            with open(dest, "wb") as fh:
                fh.write(entry["id"].encode())
        gw.tn_download = fake_download
        gw.verify_part = lambda path, size: (size, ("%064x" % size), 1380.0)

        def fake_sync(secret, payload):
            self.calls.append((payload["action"], payload["file_code"]))
            if payload["action"] == "ingest":
                return {"ok": True, "upload_url": "https://signed/" + payload["file_code"],
                        "storage_path": gw.storage_path_for(payload["dj_slug"], payload["week_of"], payload["file_code"]),
                        "existing": None}
            return {"ok": True, "id": "row-" + payload["file_code"]}
        gw.studio_sync = fake_sync

        def fake_put(url, path, label):
            if label == self.fail_put:
                raise gw.PackRetry(f"upload of {label}: HTTP 500")
            self.calls.append(("put", label))
        gw.put_signed = fake_put
        gw.send_mail = lambda gmail, subject, body: self.mails.append((subject, body))

    def tearDown(self):
        for k, v in self.saved.items():
            setattr(gw, k, v)
        self.tmp.cleanup()

    def state(self):
        return {"processed": [], "seeded": True}

    def test_happy_path_order_and_idempotence(self):
        st = self.state()
        msg = _mail("The week of 9/26/26 | DJ Tony Neal | Urban (Hip Hop & R&B mixes)", "grab it " + self.LINK, self.RECEIVED)
        gw.handle_dj_pack(None, None, msg, "m1", TONY, st, now=self.NOW)
        actions = [a for a, _ in self.calls]
        self.assertEqual(actions, ["ingest"] * 4 + ["put"] * 4 + ["ingested"] * 4)
        self.assertEqual([c for a, c in self.calls if a == "ingested"],
                         ["DJB_76097", "DJB_76098", "DJB_76099", "DJB_76100"])
        self.assertIn("m1", st["processed"])
        self.assertIn("tn:T1", st["dj_packs"])
        self.assertEqual(len(self.mails), 1)
        self.assertIn("ingested for Sat 9/26", self.mails[0][0])
        self.assertIn("'hh9-26, 1 (26).mp3' -> DJB_76097", self.mails[0][1])
        self.assertEqual(os.listdir(os.path.join(self.tmp.name, "_djpack")), [])  # staging cleaned
        # the same link in a second mail: nothing re-fetched, no mail
        self.calls.clear()
        gw.handle_dj_pack(None, None, msg, "m2", TONY, st, now=self.NOW)
        self.assertEqual((self.calls, len(self.mails)), ([], 1))
        self.assertIn("m2", st["processed"])

    def test_failed_upload_flips_nothing_and_backs_off(self):
        st = self.state()
        self.fail_put = "DJB_76099"
        msg = _mail("The week of 9/26/26 | DJ Tony Neal", self.LINK, self.RECEIVED)
        gw.handle_dj_pack(None, None, msg, "m1", TONY, st, now=self.NOW)
        self.assertNotIn("ingested", [a for a, _ in self.calls])
        self.assertNotIn("m1", st["processed"])
        self.assertIn("m1", st["pack_retry"])
        self.assertEqual(len(self.mails), 1)
        self.assertIn("FAILED", self.mails[0][0])
        self.calls.clear()
        gw.handle_dj_pack(None, None, msg, "m1", TONY, st, now=self.NOW)  # inside the back-off
        self.assertEqual(self.calls, [])
        # after the back-off it retries, succeeds, and mails the summary
        self.fail_put = None
        later = datetime(2026, 9, 25, 10, 0)
        gw.handle_dj_pack(None, None, msg, "m1", TONY, st, now=later)
        self.assertIn("m1", st["processed"])
        self.assertNotIn("m1", st["pack_retry"])
        self.assertIn("ingested", self.mails[-1][0])

    def test_newsletter_ignored_and_late_pack_refused(self):
        st = self.state()
        gw.handle_dj_pack(None, None, _mail("Fwd: This Week in Hip-Hop News | CoreDjsLive.com", "news", self.RECEIVED),
                          "n1", TONY, st, now=self.NOW)
        self.assertEqual((self.calls, self.mails, st["processed"]), ([], [], ["n1"]))
        late = datetime(2026, 9, 26, 22, 10)
        gw.handle_dj_pack(None, None, _mail("The week of 9/26/26 | DJ Tony Neal", self.LINK, self.RECEIVED),
                          "m9", TONY, st, now=late)
        self.assertEqual(self.calls, [])
        self.assertIn("NOT synced", self.mails[-1][0])
        self.assertIn("m9", st["processed"])


class SecretLookup(unittest.TestCase):
    def setUp(self):
        self._env = os.environ.pop(studio_sync_secret.ENV, None)
        self._file = studio_sync_secret.FILE
        self.tmp = tempfile.TemporaryDirectory()
        studio_sync_secret.FILE = os.path.join(self.tmp.name, "studio-sync.secret")

    def tearDown(self):
        studio_sync_secret.FILE = self._file
        if self._env is not None:
            os.environ[studio_sync_secret.ENV] = self._env
        self.tmp.cleanup()

    def test_order(self):
        self.assertIsNone(studio_sync_secret.load())                       # nothing configured
        legacy = studio_sync_secret.load(legacy=True)
        self.assertTrue(legacy and len(legacy) >= 20)                      # parsed from sync-dj-drops.py
        with open(studio_sync_secret.FILE, "w", encoding="utf-8") as fh:
            fh.write("from-file\n")
        self.assertEqual(studio_sync_secret.load(legacy=True), "from-file")
        os.environ[studio_sync_secret.ENV] = "from-env"
        try:
            self.assertEqual(studio_sync_secret.load(legacy=True), "from-env")
        finally:
            os.environ.pop(studio_sync_secret.ENV, None)

    def test_legacy_parse_never_executes(self):
        src = os.path.join(self.tmp.name, "x.py")
        with open(src, "w", encoding="utf-8") as fh:
            fh.write('import nonexistent_module\nSECRET = load() or "abc123"\n')
        self.assertEqual(studio_sync_secret.legacy_constant(src), "abc123")


if __name__ == "__main__":
    unittest.main(verbosity=2)
