# Pull DJ Daddy Black's emailed mixes (Google Drive links harvested from
# biggleem@gmail.com via Gmail print-view scrape) into the station's local
# mixshow folder structure:
#   D:\WCCG\b-mixshows\k-dj-daddyblack\a-on-air\<MMDDYYYY>-onair\DJB_76075/76.mp3
# Part 1 -> DJB_76075, part 2 -> DJB_76076 (his Friday slot codes); parts 3+
# keep descriptive names. Emails whose air date can't be inferred go to
# z-email-archive\<email-date>\ with original ordering preserved.
#
# Drive download: the anonymous uc?export=download&confirm=t endpoint works for
# his link-shared files (verified). Each file is validated (MP3 magic, >3 MB).
# Idempotent: existing non-empty targets are skipped.

import json, os, re, subprocess, sys
from datetime import datetime, timedelta

ROOT = r"D:\WCCG\b-mixshows\k-dj-daddyblack"
ONAIR = os.path.join(ROOT, "a-on-air")
ARCHIVE = os.path.join(ROOT, "z-email-archive")
LOG = r"D:\WCCG\sync-logs\daddyblack-pull.log"

PLAN = """
1EswcbTHuL8xECf_Rf92jbKVLtViI33m1||Mar 25, 2020|Friday 5 to 6 Mix... 1st and 2nd Half
1iAvu972kb6pw-wu35hGgIFmKeUYBgsgU||Mar 25, 2020|Friday 5 to 6 Mix... 1st and 2nd Half
1eDgeLfFtoL8rhEgQG6aocaTmtvI_l69j||Mar 31, 2020|Way Back Wednesday Prt 1 & Prt 2
14HH5o8xE_M1FpLZn2faqUETwdnROYLbQ||Mar 31, 2020|Way Back Wednesday Prt 1 & Prt 2
1fem6R7nZEYQoMcnV5o4gBA3g5ntvLDUp||Apr 1, 2020|So Smooth Thursdays Prt 1 & 2
1soYJG2-rmMxzahd8UB1AoV3zX0bVK5Oh||Apr 1, 2020|So Smooth Thursdays Prt 1 & 2
1s3SPEgoGQDjtfYGgGdC5CxJWcS8_Ku1H||Apr 3, 2020|Friday 5 to 6 Mix 4-3-20 prt 2
12l7_qeATchE6GOrKz1yMh5GSgoCDgz3n||Apr 3, 2020|Friday 5 to 6 Mix 4-3-20 prt 2
1ujmCNInduhLeQvmvxkzr2t5felR_N6M8||Apr 7, 2020|Way Back Wednesday Mix, So Smooth Thursd
1XsYApJgPfSzK-FIFaczuYsJ5AqE_Rci6||Apr 7, 2020|Way Back Wednesday Mix, So Smooth Thursd
1jD29p-LPLqX862lsklKHF1ecNcaz_v3H||Apr 7, 2020|Way Back Wednesday Mix, So Smooth Thursd
1Vf4sFykg7Dseqkukdq4IPgYchTDXxYAu||Apr 7, 2020|Way Back Wednesday Mix, So Smooth Thursd
13OvOkduLaJVCJvyQdq7wzCSIC29cBDT4||Apr 7, 2020|Way Back Wednesday Mix, So Smooth Thursd
1NiHVnDBh2tR-I5CvbnCvalKku5QScGqB||Apr 14, 2020|Wednesday and Thursday Mixes Part 1 & 2
1Hh_mTSJYYXVPekfsT_tAgHsWz7VZc4bR||Apr 14, 2020|Wednesday and Thursday Mixes Part 1 & 2
15VX5w614U7QFwfxkgpEvVQR75qiU6FT4||Apr 14, 2020|Wednesday and Thursday Mixes Part 1 & 2
181xt4Z9sbSP0GrovPnRCbzizqrb2klUb||Apr 14, 2020|Wednesday and Thursday Mixes Part 1 & 2
1INQtyhv5ijhS3XN0qTc9tOhRzklze7Gy||Apr 16, 2020|Friday 5 to 6 Mix prt 1 & 2
1JFHsT8HkCun8iVojXbZDixxz5ZCptTru||Apr 16, 2020|Friday 5 to 6 Mix prt 1 & 2
1bVUenwXUEgqWpUinCw4irBwhxs_z2o4u||Apr 23, 2020|Friday Mix 5p to 6p Parts 1 & 2
1a0V8oN3RrnTbRN-XrbGzf9zlfxkgRt3F||Apr 23, 2020|Friday Mix 5p to 6p Parts 1 & 2
15OOw6KcEVFM1kngFVjsTkPAySup13Gb2||May 20, 2020|Friday 5-21-20 Mixes prts 1 & 2
177nerjvvp4S92KuqIF7595QbzRhRifTf||May 20, 2020|Friday 5-21-20 Mixes prts 1 & 2
1a_h7oR9jZ3nc4yRJSvT_-cJebIKDGubl||May 22, 2020|Memorial Day Mixes Prt. 1 & 2
1AGC9E8lZ4vHL9C-NjVoQ79KRKF7dJOcq||May 22, 2020|Memorial Day Mixes Prt. 1 & 2
1d-i-o4p4PbK92jqzqK5avFnGqDlUlF8g||May 26, 2020|Friday Mix 5-29-20 prts 1 & 2
1Xgp-udJC6s-dIiiFvP97C4uLF5ujk1e9||May 31, 2020|Friday Mix 6-5-20 parts 1&2
1bkjCHnCq_Z_9A0OQqeBlLIk5JzedBe7j||May 31, 2020|Friday Mix 6-5-20 parts 1&2
1OTQag4YLOIabQ_6f_6uXGTGAd7H0MLN4||Jun 6, 2020|Friday Mixes 6-12-20 prts 1 & 2
1XeWj5-r3R74ktwiSdyWqksnpx1DyvJwe||Jun 6, 2020|Friday Mixes 6-12-20 prts 1 & 2
1ITwKY0YFbGeMejwVzhlLYNVsBjuAYN1r||Jun 25, 2020|Friday Mix prts 1 & 2
1hSmH_jGhzW6az6nen-nSEuRiRgRo0BLw||Jun 25, 2020|Friday Mix prts 1 & 2
1WNt6JUmN8So0Dr4UY0DHdto66NZKSlsw||Jul 2, 2020|Friday Mixes prts 1 and 2
1VrbFqlIbHPOogtFydYge94nHxqblk--Z||Jul 2, 2020|Friday Mixes prts 1 and 2
1EF3PNOhNOyJQt0TuYT_Ha5oz_TBJkBfc||Jul 2, 2020|4th of July Mixes prts. 1,2,3, and 4
18mhV9sQxyz9kTg37yCZ70k73XMw8frwk||Jul 2, 2020|4th of July Mixes prts. 1,2,3, and 4
1XLo2n4hcfBOkEbT5Q1WpXvM9jHEIwFLM||Jul 2, 2020|4th of July Mixes prts. 1,2,3, and 4
1WfhlUd_z6Y3qXfMAMf2sXx10eDrzoCXw||Jul 2, 2020|4th of July Mixes prts. 1,2,3, and 4
10USadtyKjvidvlkAWuWZcx0dFYu-wiO3||Jul 8, 2020|Friday Mixes 7-10-20 prts 1 & 2
19Mpsb1S4Tdt1nWaEEucQDLAwGc9qOZDc||Jul 8, 2020|Friday Mixes 7-10-20 prts 1 & 2
1wzAL2KGB59LHaw3NMW1YI_L1CpgI65EY||Jul 13, 2020|Friday Mixes 7-17-20 parts 1&2
1qJw8SjxzhBBnsAR4OBU-72gNByWoAGf0||Jul 13, 2020|Friday Mixes 7-17-20 parts 1&2
1ZnYypK8lmH1OWBo2aRPTIy9k56alTjuy||Jul 19, 2020|Friday Mix 7-24-20 prts 1 & 2
1XwVcHF6V3nzfZXD5DUpPLCGc0RFcyIK_||Jul 19, 2020|Friday Mix 7-24-20 prts 1 & 2
1fWkKuQMJZ42TypweTbvEvIZN54ljGKrI||Jul 30, 2020|Friday Mix 7-31-20 prts 1 & 2
1xaWINHAFb6P4RJ8W8pMR8P2a0A09YYXT||Jul 30, 2020|Friday Mix 7-31-20 prts 1 & 2
1_qM6XqWTaDZiUkIJFUL9MBJOw9QDIOtX||Aug 6, 2020|Friday 8-1-2 -Mixx psrts 1&2
1DvI8XQ1dyZuOOYJiIHwLjItXi5Tp3NPP||Aug 6, 2020|Friday 8-1-2 -Mixx psrts 1&2
1FgEFvd2kez8PYcoLleEh4av9QnXOt0MY||Aug 9, 2020|Friday Mixx 8-14-20 parts 1 7 2
1xWW0HKGYtMvdmP2Hv_w5p-uI80q1YbjW||Aug 9, 2020|Friday Mixx 8-14-20 parts 1 7 2
1l9AlZnvQ_Wh_99uXwecE_iRH5xnfL2kk||Aug 16, 2020|Friday Mixx 8-21-20 Parts 1&2
1wcPsF6BkzrjuLDjkJq0KpEVoIR_uzWZU||Aug 16, 2020|Friday Mixx 8-21-20 Parts 1&2
1qT0yPozIpdI0Lz51eVLvucdLh-dIe-y-||Aug 27, 2020|Friday Mixx 8-28-20 prts 1&2
1AkPHXanBHuEh4DSJWni2ppYa1D9vjiDe||Aug 27, 2020|Friday Mixx 8-28-20 prts 1&2
12cZ-HYUbmGb-EXPWpdJ_KfzuKaVKZkDg||Aug 31, 2020|Friday MIxx dedicated to SnowDogg
16lyiQYY6kbYCNeM8lyuHbQg1LjnSEMJ7||Aug 31, 2020|Friday MIxx dedicated to SnowDogg
1FgTKR0RqZDDYG3CO9-ZEwLFhUc2phnTT||Oct 2, 2020|10-2-20 Friday Mix
1Nh-XhuLhnB4OVtpGLA6GPFMFrmGLBZxD||Oct 2, 2020|10-2-20 Friday Mix
1oAgKr2k6SWo3S1Cb4sf0EzWceurNABea||Oct 22, 2020|Friday 10-23-20 prts. 1& 2
1i9Eb1LWkSgEaZXoO1Ck__ZhiXLb_IfSc||Oct 22, 2020|Friday 10-23-20 prts. 1& 2
1rqixaYgwOozfCpNyONHZtI4fuelvwDBp||Oct 29, 2020|October 30th Mix prt 1 & 2
1BNxLmv1axE1A328iJwzIOvxiFHyOajOD||Oct 29, 2020|October 30th Mix prt 1 & 2
1omOS9vugke0DVbNKj_TlJY7j2s-XEsMQ||Nov 6, 2020|Friday Mixx 11-6-20
1UirDak56gfsz7tDK9WT9xsLVhj5cfnqX||Nov 6, 2020|Friday Mixx 11-6-20
1EoqIq72VnUTQFqLvPMozf3vyYrlvyuAv||Nov 13, 2020|November, Friday 13th Mixx parts 1&2
12ss6rRyXyeYZy-bYrKe1GfTwwpzKMVSP||Nov 13, 2020|November, Friday 13th Mixx parts 1&2
1IYezvBEkmjboNuEmzo0ZvQLbdB3ZEywL||Dec 6, 2020|Friday 12-11-20 Mix prts 1 &2
1Mhz4RfjDessIC7CRdMeCfOeiFQ4iofx5||Dec 6, 2020|Friday 12-11-20 Mix prts 1 &2
1DTW2miHsPTFHDAXz75k4hnAbi9vBBdyy||Oct 5, 2022|Friday 10-7-22 Mix... Dedicated to the f
1R1g-m5W5tZtFf_p31VE3DzJEUlEETV1U||Oct 5, 2022|Friday 10-7-22 Mix... Dedicated to the f
1xidCnu4esRfIzJckOHLI6pgZKzJk_gCk||Nov 3, 2022|Friday Mixes 11-4-22 parts 1 and 2
1vlBlEw485bMxBRQBXkZZSRp-bihMLBKG||Nov 3, 2022|Friday Mixes 11-4-22 parts 1 and 2
19orvEJaZV3syHvwRlv1mfEWMUHbRqfme||Dec 2, 2022|Friday Mix 12-2-22 parts 1 & 2
1ksTbes3o3gpFWb3K6ruHSkw38_oj72yn||Dec 2, 2022|Friday Mix 12-2-22 parts 1 & 2
1RmI9Mme2vVA_TWI2ucmjYFVGemlsIAfj||Dec 15, 2022|Friday 12-16-22 Mixes 1 & 2
16bWyZV-BPkUmw7UG1Jhm3i2GdEm4IrlF||Dec 15, 2022|Friday 12-16-22 Mixes 1 & 2
1gmBxzaUArivEFgln9HjwoqRoFupbICC-||Dec 21, 2022|Fwd: 12-23-22 mixes, prt1 & 2
1s20A1AWWwznQvKsb0_bwQzEnoXSstNvW||Dec 21, 2022|Fwd: 12-23-22 mixes, prt1 & 2
1o_GUzDcmF5Vx2jtZeePwOcHe-uGdVIS5||Jan 6, 2023|Friday 01-06-23 mix (compilation; 9-5-22
1g5wWsPmSCvZe6wgDIb6LAFFirZO8wyvp||Jan 6, 2023|Friday 01-06-23 mix (compilation; 9-5-22
1WjlmMX6YqhtzbJIUizkkg69qiw8Ruugq||Jan 19, 2023|Friday Mixes for 1-20-23
1VLhDxRZp-6rPKZmj1UnlzZl0zyj0XbxU||Jan 19, 2023|Friday Mixes for 1-20-23
1dlIvvzgdbooZrhwbH0-tZym4R2IaEyLJ||Jan 22, 2023|DjDBM2 Redone for Friday 1-20-23 Mix
1SVhAKRlLM5S_DLvCrSX22F_zm_5VHeyh||Feb 10, 2023|Friday 2-10-23 5 o'clock Mixes 1 & 2
1M_RIY7rRwcgP1FelRTbIET90hh7pG5vG||Feb 10, 2023|Friday 2-10-23 5 o'clock Mixes 1 & 2
1Okgj_imEZTsUr8_WgOKjPJqAJTU5tAhT||Nov 10, 2025|Friday 12pm Mixes
1nUhjxjaMmKfejInGO4_l32DdX_IXVT0n||Nov 10, 2025|Friday 12pm Mixes
1-DGVCyPQ0GFy8OUw711DgNwhgZAWlAUV||Nov 17, 2025|Friday Mix Part 1
1V23EcG8U9b5dAstU7O87O9rYCn93JRRO||Nov 18, 2025|Friday Mix prt 2
1pbkrz-kJIuASOKHfdnHrHLJtbicJIm3v||Dec 1, 2025|Mixes for Friday 12-05-25
1DC6bXvvHcZJp3ZuB41lZfQ0N2BHTzsN6||Dec 1, 2025|Mixes for Friday 12-05-25
11BOu3mGH77XiCzPGaFL_4U_gpTOscBG0||Dec 15, 2025|Mixes for Friday 12-26-25 Parts 1 and 2
16q1to-WRFm8jA6Tt9DvmyDSbN7C1uQNV||Dec 15, 2025|Mixes for Friday 12-26-25 Parts 1 and 2
1A03x5pVh3sN8zW2diqEonB6QvHDnaIJF||Dec 29, 2025|Mixes for Friday 01-02-26 Parts 1&2
115jZ6XSXdttFGOsuH5grHYTuUdC-TumN||Dec 29, 2025|Mixes for Friday 01-02-26 Parts 1&2
1WsdEAnyRaJ1L8Qw3Ri6PuL-i0PRQ2g-a||Jan 6, 2026|Just 1st Mix for 01-09-26
1dtW6cecfrnNQrtNEGbJHIvKfXsJV6Ygb||Jan 7, 2026|Mix 2 for Friday 01-09-26
1NOw1j88vgctl51O7_qGhynk6f8AoffH_||Jan 13, 2026|1 Mix for Friday 01-16-26
1HTdDhQaybre9UypJlCrW2Q4xvN5ThQEv||Jan 27, 2026|Friday 01-30-26 Mixes
1MVCMUzySOrprQrfIJVTsPZCv9SNs-g9e||Jan 27, 2026|Friday 01-30-26 Mixes
1cM6K-EypJEI6tXiF0w-zzP1gCctiPX0O||Feb 4, 2026|Friday 02-06-26 Lunch Time Mixes
1INs0bQlykIVt9edPzhIlTK2dh-qCebsc||Feb 4, 2026|Friday 02-06-26 Lunch Time Mixes
1E20OsSI_MeeojZa0Mo_o-1BjYW720rdJ||Feb 10, 2026|Mixes Friday 02-13-26
1tRIszqR41IeAeRZbqLApKNPFjtcH46ru||Feb 10, 2026|Mixes Friday 02-13-26
17UDqgjzpJoD8u0AQwupyqda-jKHZNkXC||Feb 17, 2026|Mix Show For This Friday 02-20-26
1fpuwlq4I2O9ds8_ogS0b1ZLSL2ZqFR7K||Feb 17, 2026|Mix Show For This Friday 02-20-26
1m66mm6TA_auEejJt2MpTIKKtmgXvTfNo||May 11, 2026|Friday Mixes 05-15-26 1&2
1Vk1VyabWoHlYbm_Ly1r7QPgtRXvJ67BU||May 11, 2026|Friday Mixes 05-15-26 1&2
""".strip()

# Subjects that resolve to a specific air date no regex can find.
WEEKDAY = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}

def next_weekday(d, wd):
    return d + timedelta(days=(wd - d.weekday()) % 7)

def air_date_for(subj, email_dt):
    s = subj.lower()
    m = re.search(r"\b(\d{1,2})-(\d{1,2})-(\d{2})\b", subj)
    if m:
        mo, da, yr = int(m.group(1)), int(m.group(2)), 2000 + int(m.group(3))
        try:
            return datetime(yr, mo, da)
        except ValueError:
            pass
    if "memorial day" in s:
        return next_weekday(email_dt, WEEKDAY["mon"])
    if "4th of july" in s:
        return datetime(email_dt.year, 7, 4)
    if "october 30th" in s:
        return datetime(email_dt.year, 10, 30)
    if "friday 13th" in s:
        return next_weekday(email_dt, WEEKDAY["fri"])
    if "wednesday" in s and "thursday" not in s:
        return next_weekday(email_dt, WEEKDAY["wed"])
    if "thursday" in s and "wednesday" not in s:
        return next_weekday(email_dt, WEEKDAY["thu"])
    if "wednesday" in s and "thursday" in s:
        return None  # ambiguous multi-show email
    if "friday" in s or "mix" in s:
        return next_weekday(email_dt, WEEKDAY["fri"])
    return None

def log(msg):
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line, flush=True)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def download(file_id, dest):
    url = f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"
    tmp = dest + ".part"
    r = subprocess.run(["curl", "-sL", "--max-time", "600", "-o", tmp, url], capture_output=True)
    if r.returncode != 0 or not os.path.exists(tmp):
        return f"curl failed rc={r.returncode}"
    size = os.path.getsize(tmp)
    with open(tmp, "rb") as f:
        head = f.read(3)
    if size < 3_000_000 or head not in (b"ID3", b"\xff\xfb", b"\xff\xf3"):
        with open(tmp, "rb") as f:
            sniff = f.read(200)
        os.remove(tmp)
        if b"<html" in sniff.lower() or b"<!doctype" in sniff.lower():
            return f"got HTML (not shared publicly?) size={size}"
        return f"bad file size={size} head={head!r}"
    os.replace(tmp, dest)
    return None

def main():
    # group rows by (email_date, subject)
    groups = {}
    order = []
    seen_ids = set()
    for line in PLAN.splitlines():
        fid, _name, edate, subj = line.split("|", 3)
        fid = fid.strip()
        if "PLACEHOLDER" in fid:
            log(f"SKIP truncated id for: {edate} | {subj} (needs manual)")
            continue
        if fid in seen_ids:
            continue
        seen_ids.add(fid)
        key = (edate.strip(), subj.strip())
        if key not in groups:
            groups[key] = []
            order.append(key)
        groups[key].append(fid)

    total = ok = skipped = failed = 0
    for key in order:
        edate, subj = key
        email_dt = datetime.strptime(edate, "%b %d, %Y")
        air = air_date_for(subj, email_dt)
        files = groups[key]
        redone = "redone" in subj.lower()
        part_offset = 2 if ("mix 2" in subj.lower() or "prt 2" in subj.lower() or redone) else 1

        for i, fid in enumerate(files):
            total += 1
            part = part_offset + i if len(files) <= 2 else 1 + i
            if air is not None:
                folder = os.path.join(ONAIR, f"{air:%m%d%Y}-onair")
                if part == 1:
                    fname = "DJB_76075.mp3"
                elif part == 2:
                    fname = "DJB_76076.mp3" if not redone else "DJB_76076.mp3"
                else:
                    fname = f"daddyblack-prt{part}.mp3"
                # Redone replaces the original part 2: keep the original aside.
                dest = os.path.join(folder, fname)
                if redone and os.path.exists(dest):
                    os.replace(dest, os.path.join(folder, "DJB_76076-original.mp3"))
            else:
                folder = os.path.join(ARCHIVE, f"{email_dt:%Y-%m-%d}")
                fname = f"part{part}.mp3"
                dest = os.path.join(folder, fname)
            os.makedirs(folder, exist_ok=True)
            if os.path.exists(dest) and os.path.getsize(dest) > 3_000_000:
                skipped += 1
                log(f"SKIP exists {dest}")
                continue
            err = download(fid, dest)
            if err:
                failed += 1
                log(f"FAIL {fid} -> {dest}: {err} | {subj}")
            else:
                ok += 1
                log(f"OK   {dest} ({os.path.getsize(dest)//1024//1024} MB) | {subj}")

    log(f"DONE total={total} ok={ok} skipped={skipped} failed={failed}")

if __name__ == "__main__":
    main()
