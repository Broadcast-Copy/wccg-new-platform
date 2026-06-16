#!/usr/bin/env python3
r"""
WCCG Radio-Spider Sync  -  runs ON the broadcast PC.

Syndicated networks drop multi-segment shows into
    D:\WCCG\a-traffic (1-1999)\resources\<provider>\
This maps the NEWEST delivery's segments, in hour/segment order, onto the show's
fixed DJB cart range in M:\JBMusic (the flat playout library DJB Radio Spider
plays from), backing up the current carts first.

Config-driven (PROVIDERS below). State is baseline-seeded so a first run does NOT
overwrite carts with whatever is already sitting in the folder - it only acts when
a delivery NEWER than the last handled one appears. Use --catchup to force the
current newest delivery onto the carts now.

Modes:
    python radio-spider-sync.py --dry-run     # show the mapping, change nothing
    python radio-spider-sync.py --status      # what's configured + last handled
    python radio-spider-sync.py --catchup      # push the current newest delivery to carts NOW
    python radio-spider-sync.py --once         # process only deliveries newer than state
    python radio-spider-sync.py --loop         # poll forever
"""

import os
import re
import sys
import json
import time
import shutil
import argparse
from datetime import datetime

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
ONAIR_FLAT = os.environ.get("WCCG_ONAIR_ROOT", r"M:\JBMusic")
CONFIG_DIR = os.environ.get("WCCG_RSPIDER_DIR", r"C:\Users\wccg1\.wccg-radio-spider")
STATE_FILE = os.path.join(CONFIG_DIR, "state.json")
LOG = r"D:\WCCG\sync-logs\radio-spider-sync.log"
POLL_SECONDS = int(os.environ.get("WCCG_RSPIDER_POLL", "120"))

# Each provider: a folder the network delivers into, a regex that matches its
# segment files and captures a 6-digit mmddyy `date` token, and the contiguous
# DJB cart range the show airs from. Segments are ordered by (hour, segment)
# parsed from H<h>S<s> in the filename and copied onto cart_start, cart_start+1, …
PROVIDERS = [
    dict(
        name="Bootleg Kev",
        folder=r"D:\WCCG\a-traffic (1-1999)\resources\Premiere Networks",
        regex=r"Bootleg-Kev_(?P<date>\d{6})_H(?P<h>\d+)S(?P<s>\d+)",
        cart_start=70531,
        cart_count=19,
        ext="mp3",
    ),
    # Pending cart numbers - fill cart_start/cart_count and uncomment:
    # dict(
    #     name="Deja Vu",
    #     folder=r"D:\WCCG\a-traffic (1-1999)\resources\Mr Master",
    #     regex=r".*-H(?P<h>\d+)S(?P<s>\d+).*",   # confirm the date token + naming
    #     cart_start=0, cart_count=0, ext="mp3",
    # ),
]


# --------------------------------------------------------------------------- #
def log(msg: str):
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line, flush=True)
    try:
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def load_state() -> dict:
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {"handled": {}, "seeded": False}


def save_state(state: dict):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def _date_val(token: str) -> int:
    """mmddyy -> sortable yyyymmdd int."""
    mm, dd, yy = int(token[0:2]), int(token[2:4]), int(token[4:6])
    return (2000 + yy) * 10000 + mm * 100 + dd


def scan(provider: dict):
    """Return (newest_token, [ (hour, seg, fullpath), … ] sorted) for a provider, or (None, [])."""
    folder = provider["folder"]
    rx = re.compile(provider["regex"], re.IGNORECASE)
    if not os.path.isdir(folder):
        return None, []
    matches = []  # (date_token, hour, seg, path)
    for root, _dirs, files in os.walk(folder):
        # skip our own backup dir
        if os.path.basename(root).lower().startswith("_replaced"):
            continue
        for fn in files:
            m = rx.search(fn)
            if not m:
                continue
            gd = m.groupdict()
            token = gd.get("date") or "000000"
            matches.append((token, int(gd["h"]), int(gd["s"]), os.path.join(root, fn)))
    if not matches:
        return None, []
    newest = max(matches, key=lambda t: _date_val(t[0]))[0]
    segs = sorted([m for m in matches if m[0] == newest], key=lambda t: (t[1], t[2]))
    return newest, [(h, s, p) for (_tok, h, s, p) in segs]


def plan(provider: dict, segs):
    """Return list of (src_path, cart_name) mappings."""
    out = []
    for i, (h, s, path) in enumerate(segs):
        cart = provider["cart_start"] + i
        out.append((path, f"DJB_{cart}.{provider['ext']}", h, s))
    return out


def apply_plan(provider: dict, newest: str, segs, dry: bool) -> bool:
    mapping = plan(provider, segs)
    n = len(mapping)
    log(f"  {provider['name']}: delivery {newest} has {n} segment(s) -> carts "
        f"DJB_{provider['cart_start']}..DJB_{provider['cart_start'] + n - 1}")
    if n != provider["cart_count"]:
        log(f"  !! segment count {n} != configured cart_count {provider['cart_count']} "
            f"- SKIPPING to avoid mis-mapping. Check the delivery / config.")
        return False

    bak = os.path.join(provider["folder"], f"_replaced-{datetime.now():%Y%m%d}")
    for src, cart_name, h, s in mapping:
        dest = os.path.join(ONAIR_FLAT, cart_name)
        sz = os.path.getsize(src)
        if dry:
            log(f"     [dry] H{h}S{s}  {os.path.basename(src)}  ({sz:,} B)  ->  {dest}")
            continue
        os.makedirs(bak, exist_ok=True)
        if os.path.exists(dest):
            shutil.copy2(dest, os.path.join(bak, cart_name))  # back up current cart
        shutil.copy2(src, dest)
        if os.path.getsize(dest) != sz:
            log(f"  !! size mismatch writing {dest}")
            return False
        log(f"     H{h}S{s}  {os.path.basename(src)}  ({sz:,} B)  ->  {cart_name}")
    if not dry:
        log(f"  OK {provider['name']} {newest} synced to {n} carts (prev carts backed up in {bak})")
    return True


def run(state: dict, *, dry: bool, catchup: bool, seed_only: bool):
    changed = False
    for prov in PROVIDERS:
        if prov["cart_start"] <= 0 or prov["cart_count"] <= 0:
            log(f"  {prov['name']}: not configured (cart range missing) - skipping")
            continue
        newest, segs = scan(prov)
        if not newest:
            log(f"  {prov['name']}: no deliveries found in {prov['folder']}")
            continue
        last = state["handled"].get(prov["name"])
        if seed_only:
            state["handled"][prov["name"]] = newest
            log(f"  {prov['name']}: baseline seeded at delivery {newest} (future-only)")
            changed = True
            continue
        if not catchup and last is not None and _date_val(newest) <= _date_val(last):
            log(f"  {prov['name']}: newest {newest} already handled (last {last})")
            continue
        ok = apply_plan(prov, newest, segs, dry)
        if ok and not dry:
            state["handled"][prov["name"]] = newest
            changed = True
    return changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="show the mapping, change nothing")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--catchup", action="store_true", help="force current newest onto carts now")
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--loop", action="store_true")
    args = ap.parse_args()

    state = load_state()

    if args.status:
        log(f"radio-spider-sync - flat={ONAIR_FLAT}")
        for p in PROVIDERS:
            newest, segs = scan(p)
            log(f"  {p['name']}: folder={p['folder']}")
            log(f"      carts DJB_{p['cart_start']}..{p['cart_start'] + p['cart_count'] - 1} "
                f"({p['cart_count']}) | newest delivery={newest} ({len(segs)} seg) | "
                f"last handled={state['handled'].get(p['name'])}")
        return

    if args.dry_run:
        log("DRY RUN - no files will be written")
        run(state, dry=True, catchup=True, seed_only=False)
        return

    if not state.get("seeded"):
        # First ever run with no explicit catchup: baseline so we never auto-push
        # a stale delivery. Future newer deliveries sync automatically.
        if not args.catchup:
            run(state, dry=False, catchup=False, seed_only=True)
            state["seeded"] = True
            save_state(state)
            log("baseline seeded - only deliveries newer than the above will sync. "
                "Use --catchup to push the current newest now.")
            if not args.loop:
                return
        else:
            state["seeded"] = True

    if args.loop:
        log(f"polling every {POLL_SECONDS}s - Ctrl+C to stop")
        while True:
            try:
                if run(state, dry=False, catchup=False, seed_only=False):
                    save_state(state)
            except Exception as e:  # noqa: BLE001
                log(f"  error: {e}")
            time.sleep(POLL_SECONDS)
    else:
        if run(state, dry=False, catchup=args.catchup, seed_only=False):
            save_state(state)
        log("done")


if __name__ == "__main__":
    main()
