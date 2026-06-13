# Import the legacy Mix Squad DJ bios from wccg1045fm.com into each DJ's
# member profile (profiles.bio). One-off backfill, idempotent (only fills
# empty bios). Sourced from the old WordPress "the-mix-squad/<slug>" pages
# (page sitemap), parsed out of the post-content block, booking-form tail
# and player template stripped. Old-site slugs are mapped to our DB slugs.
#
# Writes via the temporary mint-sermon-upload edge function's set-dj-bio
# action (delete that function after use). Run: python scripts/import-dj-bios.py

import re, html as ihtml, subprocess, json, time

OLD = ["dj-chuck-t","dj-chuck","dj-daddyblack","dj-daffie","dj-dane-dinero","dj-ike-gda",
 "dj-itanist","dj-izzynice","dj-jb","dj-juice","dj-killako","dj-kingviv","dj-lj",
 "dj-loudiamonds","dj-official","dj-rayn","dj-ricoveli","dj-spinwiz","dj-swazzey",
 "dj-t-money","dj-tommygeemixx","dj-tonelo","dj-tony-neal","dj-weezy","dj-whosane",
 "dj-wolf","dj-yafeelme","dj-yodo"]
MAP = {"dj-daddyblack":"dj-daddy-black","dj-izzynice":"dj-izzy-nice","dj-jb":"dj-jay-b",
 "dj-lj":"dj-ljay","dj-loudiamonds":"dj-lou-diamonds","dj-spinwiz":"dj-spin-wiz",
 "dj-swazzey":"dj-swayzee","dj-tommygeemixx":"dj-tommy-gee","dj-tonelo":"dj-tone-lo"}

TAB = re.compile(r'^(Mixes|DJ Bio|DJ Information|Booking Information|Booking|\d+\s*Tracks?|'
  r'Play|Pause|Sorry, no results\.?|Please try another keyword|Home|Discover|Streaming|'
  r'Legacy Streaming|Browse All|Support|Listen Live|Skip to content|Go to Top|Go Back|'
  r'WCCG 104\.5 FM|SOUL 104\.5 FM|HOT 104\.5 FM|104\.5 THE VIBE|The Mix Squad)\s*$', re.I)
STOP = re.compile(r'(Current step|Please complete this booking request|Submission of this form'
  r'|By submitting this form|Digital Signature|Submit Request|EVENT INFORMATION'
  r'|DJ Details|Booking & Inquiries|does not make the event a station event'
  r'|Disclaimers? & Agreements|Disclaimer$)', re.I)

def fetch(url):
    raw=subprocess.run(["curl","-s","-A","Mozilla/5.0 wccg-bio","--max-time","40",url],
                       capture_output=True).stdout
    try: return raw.decode("utf-8")
    except UnicodeDecodeError: return raw.decode("cp1252","replace")

def clean_line(s):
    s = s.replace('�',"'")          # corrupted smart quotes -> apostrophe
    s = re.sub(r'\s+',' ',s).strip()
    s = s.lstrip('•›»-\'" ').strip()
    s = re.sub(r'\s+([,.;:!?])', r'\1', s)  # "word ," -> "word,"
    s = re.sub(r"''+", '"', s)             # ''..'' collapsed -> "
    return s

def extract(t, disp):
    i=t.find('class="post-content')
    if i<0: return ""
    region=t[i:]
    region=re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>',' ',region)
    region=re.sub(r'<(br|/p|/div|/h\d|/li|/td|/tr)\s*/?>','\n',region,flags=re.I)
    region=re.sub(r'<li[^>]*>','\n• ',region,flags=re.I)
    region=re.sub(r'<[^>]+>',' ',region)
    region=ihtml.unescape(region)
    seen=set(); out=[]
    for raw in region.splitlines():
        s=clean_line(raw)
        if len(s)<4: continue
        if STOP.search(s): break
        if '{{' in s or '}}' in s or s.startswith(('=','@',':','v-','{','}','<')): continue
        if re.match(r'^[\W_]+$',s): continue
        if TAB.match(s): continue
        if re.match(r'^\d{4}-\d\d-\d\dT',s): continue
        if s.upper()==disp.upper() or s.replace(' ','').upper()==disp.replace(' ','').upper(): continue
        low=s.lower()
        if 'timeless streams carry' in low: continue
        if low.startswith('home') and 'mix squad' in low: continue
        if s in seen: continue
        seen.add(s); out.append(s)
    # merge lowercase-continuation fragments into previous line
    merged=[]
    for s in out:
        if merged and re.match(r'^[a-z]', s) and not merged[-1].endswith(('.','!','?',':')):
            merged[-1]=merged[-1]+' '+s
        else:
            merged.append(s)
    return "\n".join(merged).strip()

results={}
for old in OLD:
    db=MAP.get(old,old)
    html=fetch(f"https://wccg1045fm.com/the-mix-squad/{old}/")
    tm=re.search(r'<title>([^<|]+)',html)
    disp=(tm.group(1).strip() if tm else old)
    bio=extract(html,disp)
    results[db]={"old":old,"len":len(bio),"bio":bio}
    print(f"{db:18s} {len(bio):5d}")
    time.sleep(0.4)
json.dump(results,open(r"C:\Users\wccg1\dj_bios.json","w",encoding="utf-8"),indent=1,ensure_ascii=False)
print("WROTE")

# ---- load step ----
import json, re, subprocess

FN="https://irjiqbmoohklagdegezz.supabase.co/functions/v1/mint-sermon-upload"
SECRET="0493a297c313da1dc41082e7189971725fe76f31aa3100f2"
d=json.load(open(r"C:\Users\wccg1\dj_bios.json",encoding="utf-8"))
NAME=lambda s: re.sub(r'[^a-z0-9]','',s.lower())

def clean(bio, db_slug):
    lines=[l.strip() for l in bio.splitlines() if l.strip()]
    nameforms={NAME(db_slug)}                # dj-chuck-t -> djchuckt
    out=[]; sigs=set()
    for s in lines:
        if 'post-content' in s or 'class="' in s: continue
        n=NAME(s)
        if n in nameforms: continue          # breadcrumb / heading == name
        if len(n)<3: continue
        sig=n[:45]
        if sig in sigs: continue             # kills duplicated intro
        sigs.add(sig); out.append(s)
    # also register the display-name-with-spaces forms from first line
    return "\n".join(out).strip()

ok=skip=fail=0
for slug,rec in d.items():
    bio=clean(rec["bio"], slug)
    if len(bio)<120:
        print(f"SKIP {slug} (too short after clean: {len(bio)})"); skip+=1; continue
    r=subprocess.run(["curl","-s","--max-time","40","-X","POST",FN,
        "-H","Content-Type: application/json","-H",f"x-ingest-secret: {SECRET}",
        "-d",json.dumps({"action":"set-dj-bio","slug":slug,"bio":bio})],capture_output=True)
    try: res=json.loads(r.stdout.decode("utf-8","replace"))
    except: res={"error":r.stdout.decode("utf-8","replace")[:80]}
    if res.get("ok"):
        tag="(skipped: bio exists)" if res.get("skipped") else f"{len(bio)} chars"
        print(f"OK   {slug:18s} {tag}"); ok+=1
    else:
        print(f"FAIL {slug:18s} {res.get('error')}"); fail+=1
# stash cleaned for review
json.dump({k:clean(v["bio"],k) for k,v in d.items()},
          open(r"C:\Users\wccg1\dj_bios_clean.json","w",encoding="utf-8"),indent=1,ensure_ascii=False)
print(f"\nok={ok} skip={skip} fail={fail}")
