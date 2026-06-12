# Pull DJ Corleone (Shorty Corleone)'s weekly WCCG mixshow folders into the
# local archive. He emails a link-public Google Drive FOLDER each week
# (subject carries the exact Sunday air date); the folder holds the two
# hour files, usually already named DJB_75093.mp3 / DJB_75094.mp3.
#
# Anonymous listing via embeddedfolderview, files via uc?export=download.
# Two-file folders map (sorted) -> DJB_75093/75094; other counts keep their
# original names. Idempotent; logs to D:\WCCG\sync-logs\corleone-pull.log.

import os, re, subprocess
from datetime import datetime

ROOT = r"D:\WCCG\b-mixshows\x-dj-corleone\a-on-air"
LOG = r"D:\WCCG\sync-logs\corleone-pull.log"

FOLDERS = [
    ("05312026", "16AXO00migbrS7i84rrV-C7fK9LNuF28G"),
    ("05242026", "1zcXeI9-9W4MTdRFTKE5B5SM-9YzxegK_"),
    ("05172026", "17w8m9MToL9k_11O-LanADyKHZjGgVbcA"),
    ("05102026", "1wwQfMSNe8RoL0JWTPhNUT9hBsqqM9jJT"),
    ("05032026", "1umTfN9DNM51867fSZx2b0QFyPPAzGvOq"),
    ("04262026", "16Db2886c6GO6_WDbi_1oCUxLwTcjBVD7"),
    ("04192026", "1jwK3zXq4EX-vi0-y3gPM_nec1rrbXFW0"),
    ("04122026", "124uPYOp617oxRoWri2sIJ6mMiOCq355T"),
    ("04052026", "1nORBUfn7kUQ7SiTjzsazNMJcLoLDFq8W"),
    ("03292026", "15bTz7GLi_ZI72ve4kceL1ovOA7LGHAM4"),
    ("03152026", "1QKYfqfnPIQtPdBveT3uK2kW1u9tNof3W"),
    ("03082026", "1x37hUKZj8CTIpbS74akAKIseXo4TrXba"),
    ("03012026", "1w6aSyFAKVhqKuFYl304qtmIYO8HvMtjo"),
    ("02222026", "1i-cihyuRBEIJCVQLTPEDAZxkpPDnPs5V"),
    ("02152026", "1XG-U4Dg1n0ikqhhjPV97YmxZx2LkvFQY"),
    ("02082026", "1X3xb-mxZCxoMGgq3ZhDH6hzPfvWG_XR_"),
    ("02012026", "1YZ5g_aTJT10w_CdQpX318MTFBF1c-Hlx"),
    ("01182026", "18Fz9N8Ulf4TFRLmYaGQnuAU7QT8GEN8n"),
    ("01112026", "1HgDJHVD1Rp6OYGjbzoMfzVlgoHiDwSUS"),
    ("01042026", "1ACXrxibW7WGtMe8rd9yfG7tiF6mpg0eP"),
    ("12282025", "1-CO8F0dJo64st5qscQHw5pJEaIQ9tJvS"),
    ("12212025", "1ZclGS5iKuGIlgRqMGe8Hw-lZwXVYlJYl"),
    ("12142025", "1VkjL18url5RaSuKbS_zSXxpSWqLuXN5n"),
    # 11/30 + 12/7 emails reused this folder id; current contents file as 12/7
    ("12072025", "1ud3wyZGDRwRkK9dOE_RrR24xtOrHzp_j"),
    ("11232025", "1FCx6VfvYiYzAI4ziU5tKbYT3V0WwpR7V"),
    ("11162025", "1IAlRYB0nioNzPZhLgIR4-fcGaXTwNClI"),
    ("11092025", "15a6ulBaq3yLYiV2UiCex3j9y20AzdlQG"),
    ("11022025", "1vBI3zEYSXVPHft8UcpAia5g3Ncmge1wd"),
]

def log(msg):
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line, flush=True)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def fetch(url, dest=None):
    args = ["curl", "-sL", "--max-time", "600", url]
    if dest: args += ["-o", dest]
    r = subprocess.run(args, capture_output=True)
    return r.returncode == 0, (r.stdout.decode("utf-8", "replace") if not dest else "")

def list_folder(fid):
    ok, html = fetch(f"https://drive.google.com/embeddedfolderview?id={fid}#list")
    if not ok: return None
    ids = re.findall(r'https://drive\.google\.com/file/d/([A-Za-z0-9_-]{20,})', html)
    names = re.findall(r'flip-entry-title">([^<]+)', html)
    pairs = list(dict.fromkeys(zip(ids, names)))  # dedupe, keep order
    return [(i, n) for i, n in pairs if re.search(r'\.(mp3|wav|m4a)$', n, re.I)]

def main():
    ok = skipped = failed = 0
    for airdate, fid in FOLDERS:
        files = list_folder(fid)
        if files is None or len(files) == 0:
            log(f"EMPTY/UNLISTABLE {airdate} folder {fid}")
            failed += 1
            continue
        folder = os.path.join(ROOT, f"{airdate}-onair")
        os.makedirs(folder, exist_ok=True)
        # two audio files -> canonical slot code names (sorted for stability)
        names = {}
        if len(files) == 2:
            s = sorted(files, key=lambda x: x[1].lower())
            names = {s[0][0]: "DJB_75093.mp3", s[1][0]: "DJB_75094.mp3"}
        for i, n in files:
            dest = os.path.join(folder, names.get(i, re.sub(r'[\\/:*?"<>|]', "_", n)))
            if os.path.exists(dest) and os.path.getsize(dest) > 3_000_000:
                skipped += 1
                continue
            okd, _ = fetch(f"https://drive.google.com/uc?export=download&id={i}&confirm=t", dest)
            size = os.path.getsize(dest) if os.path.exists(dest) else 0
            head = open(dest, "rb").read(3) if size else b""
            if okd and size > 3_000_000 and head in (b"ID3", b"\xff\xfb", b"\xff\xf3", b"RIF"):
                ok += 1
                log(f"OK   {airdate}/{os.path.basename(dest)} ({size//1024//1024} MB)")
            else:
                failed += 1
                if os.path.exists(dest): os.remove(dest)
                log(f"FAIL {airdate}/{n} id={i} size={size}")
    log(f"DONE ok={ok} skipped={skipped} failed={failed}")

if __name__ == "__main__":
    main()
