# DJ Portal & FTP — Runbook

**Date:** 2026-04-19
**Audience:** WCCG Engineering / Operations
**Automation target:** Radio Spider (FTP polling)
**Your FTP:** you already run one — this doc tells you which directories to point it at.

---

## TL;DR — the two paths

Pick **one** root directory on your server (recommended: `/home/$USER/wccg-mixes/` outside `public_html`):

```
/home/$USER/wccg-mixes/                  ← set as $WCCG_DROP_ROOT
├── incoming/                            ← DJs FTP into subdirectories here
│   ├── dj-tony-neal/
│   │   ├── DJB_76097.mp3
│   │   ├── DJB_76097.mp3.processed     ← sentinel; created by the worker
│   │   └── ...
│   ├── dj-ike-gda/
│   └── ...   (one per DJ, slug = djs.slug column)
└── ready/                               ← Radio Spider FTP-pulls from here
    ├── DJB_76051.mp3
    ├── DJB_76052.mp3
    └── ...   (canonical cart pool — file_code names exactly)
```

Configure both halves:

| Surface | What to point at the path |
|---------|----------------------------|
| **Each DJ's FTP client** | `incoming/<their-slug>/` (chrooted FTP user; one account per DJ) |
| **Radio Spider** | `ready/` (read-only FTP user is sufficient) |
| **Workers (`apps/workers/.env`)** | `WCCG_DROP_ROOT=/home/$USER/wccg-mixes` |
| **API (`apps/api/.env`)** | `WCCG_DROP_ROOT=/home/$USER/wccg-mixes` (same value — web uploads also land in `ready/`) |

---

## 1. How files flow

```
              ┌─────────────────────────────────────┐
              │  WEB UPLOAD                         │
              │  /my/dj  →  POST /djs/me/upload     │
              └───────────────┬─────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
  Supabase Storage    dj_drops row     /ready/DJB_NNNNN.mp3
  (archive)           (status='uploaded')  (Radio Spider pulls)


              ┌─────────────────────────────────────┐
              │  FTP UPLOAD                         │
              │  DJ → /incoming/<slug>/DJB_NNNNN.mp3│
              └───────────────┬─────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
  ─                  dj_drops row     /ready/DJB_NNNNN.mp3
                     (status='uploaded')  (Radio Spider pulls)
```

Both surfaces converge on the same `dj_drops` row + the same file in `/ready/`.
Radio Spider doesn't care which surface a DJ used.

---

## 2. Operator setup

### 2.1 Apply the migrations (in Supabase SQL Editor, in order)

```
supabase/migrations/010_phase_a_engagement.sql
supabase/migrations/011_seed_schedule_phase_a.sql
supabase/migrations/012_phase_b_c_schema.sql
supabase/migrations/013_dj_portal_schema.sql
supabase/migrations/014_seed_djs.sql
```

`014` seeds 25 DJs and 27 weekly slots covering every cell in your two-segment day-part matrix (file codes `DJB_76051`–`DJB_76100`, with statuses preserved from your `-x` / `-?` / `-??` markers).

### 2.2 Create the Storage bucket

Supabase Dashboard → Storage → **Create bucket** named `dj-drops`, **private**.
This is the long-term archive; Radio Spider doesn't read from here.

### 2.3 Create the filesystem tree on the VPS

```bash
ssh $VPS_USER@$VPS_HOST
mkdir -p ~/wccg-mixes/incoming ~/wccg-mixes/ready
chmod 750 ~/wccg-mixes
chmod 770 ~/wccg-mixes/incoming        # writable for DJ FTP group
chmod 755 ~/wccg-mixes/ready           # read-only for spider
```

Pre-create the per-DJ folders so DJ FTP accounts can chroot into them cleanly:

```bash
for slug in $(curl -s https://api.wccg1045fm.com/api/v1/djs/admin/all -H "Authorization: Bearer $ADMIN_JWT" | jq -r '.[].slug'); do
  mkdir -p ~/wccg-mixes/incoming/$slug
  chmod 770 ~/wccg-mixes/incoming/$slug
done
```

(Or just `mkdir` the 25 folders by hand — slug list is in `014_seed_djs.sql`.)

### 2.4 Wire up your existing FTP server

You said you already run FTP. Configure it to:

- Make `~/wccg-mixes/` reachable to authenticated users (chroot recommended).
- Create an FTP account **per DJ** with `chroot` set to `~/wccg-mixes/incoming/<their-slug>/`.
  - Username convention: anything you like — the DJ slug from the seed data is the natural choice (`dj-tony-neal`, `dj-ike-gda`, …).
  - Permissions: read + write + delete on their own folder.
- Create **one** read-only FTP account for Radio Spider, chrooted to `~/wccg-mixes/ready/`.
  - Username: `radio-spider` (or whatever fits your conventions).
  - Permissions: read only.

If you'd rather have the platform manage FTP accounts, the API has
`/djs/me/ftp` and `/djs/me/ftp/rotate` endpoints that issue scrypt-hashed
credentials — point your FTP server's auth backend at the
`dj_ftp_accounts` table.

### 2.5 Workers env (`apps/workers/.env`)

```bash
SUPABASE_URL=https://lmoqvvkhibfiwudgdopb.supabase.co
SUPABASE_SECRET_KEY=<service-role-key>

# DJ drops — required for the watcher to do anything
WCCG_DROP_ROOT=/home/$USER/wccg-mixes
DJ_DROPS_POLL_MS=10000                  # default 10s
# DJ_DROPS_WATCHER_DISABLED=true        # to skip the watcher

# Auto-research agent (optional)
ANTHROPIC_API_KEY=<your-key>            # omit to disable
# AGENT_DISABLED=true

# Embedded FTP server (off by default — you have your own)
# FTP_DISABLED=false                    # set to false to enable
```

### 2.6 API env (`apps/api/.env`) — add the same `WCCG_DROP_ROOT`

```bash
WCCG_DROP_ROOT=/home/$USER/wccg-mixes
```

When set, every web upload also drops a copy into `$WCCG_DROP_ROOT/ready/` so
Radio Spider sees it without waiting for any sync step.

### 2.7 Restart pm2

```bash
cd ~/wccg-new-platform
pm2 startOrRestart infra/deploy/ecosystem.config.cjs --env production
pm2 save
pm2 logs wccg-workers --lines 20      # watch the watcher boot up
```

You should see:

```
[dj-drops] watching /home/.../wccg-mixes/incoming every 10000ms; mirror → /home/.../wccg-mixes/ready
```

---

## 3. Radio Spider configuration

In Radio Spider's **FTP Sites** / **Synchronization** dialog:

| Field            | Value |
|------------------|-------|
| Server / Host    | your FTP host (e.g. `ftp.wccg1045fm.com` or VPS IP) |
| Port             | 21 (or 990 for FTPS) |
| Username         | `radio-spider` (the read-only account you created) |
| Password         | the password you set |
| Mode             | Passive |
| Encryption       | FTPS / Explicit TLS (recommended) |
| Remote directory | `/` (the chroot maps to `wccg-mixes/ready/`) |
| Local target     | wherever Radio Spider keeps its cart pool |
| Polling interval | 5–15 minutes |
| Sync rule        | "Mirror only newer" — files have stable canonical names so this is safe |
| File mask        | `DJB_*.mp3;DJB_*.wav;DJB_*.flac` |
| On conflict      | Overwrite (newer ingested file always wins) |

That's it. The cart pool you'll see in Radio Spider's ingestion folder will be
`DJB_76051.mp3` … `DJB_76100.mp3` — exactly the names in your scheduling
spreadsheet.

---

## 4. DJ instructions (give this to each DJ)

### Web upload (easy)
1. Sign in at `app.wccg1045fm.com`, open `/my/dj`.
2. Drag your `DJB_NNNNN.mp3` file onto the page (or use the per-slot upload
   button). The page detects the file code from the filename.
3. Status flips to **uploaded** in seconds. Done.

### FTP upload (for DAW automation / scripts)
1. Get your FTP credentials from your station ops contact (or, if the platform
   issues them, from `/my/dj` → **FTP sync** → **Rotate password**).
2. Configure your FTP client:
   - Host, port, username/password as provided
   - Mode: Passive (PASV)
   - Encryption: FTPS if available (recommended)
3. Drop files into the directory you connect to. Filenames must be exactly
   `DJB_NNNNN.mp3` (or `.wav` / `.flac`) using your assigned codes.
4. The server validates within ~10 seconds and the file appears in the
   station's automation rotation. A `.processed` sentinel file appears next
   to your upload — that's how the system marks "I saw this." Leave it alone.

### What gets rejected
- Filename not matching `DJB_NNNNN.{mp3|wav|flac}`
- File code not assigned to your account
- Folder you uploaded to belongs to a different DJ

Errors are logged to `dj_ftp_log` — your ops contact can look them up.

---

## 5. Operational queries

```sql
-- Who hasn't dropped this week?
SELECT * FROM dj_drops_this_week
WHERE drop_status = 'pending'
ORDER BY day_of_week, start_time, file_code;

-- Recent FTP activity
SELECT created_at, username, action, path, ok, error
FROM dj_ftp_log
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;

-- Drops landed today
SELECT file_code, status, source, uploaded_at, size_bytes
FROM dj_drops
WHERE uploaded_at::date = current_date
ORDER BY uploaded_at DESC;
```

Web dashboard for the same data: **`/my/admin/dj-drops`**.

---

## 6. Endpoint reference (web API)

| Method | Path                          | Auth     | What |
|--------|-------------------------------|----------|------|
| GET    | `/djs/me`                     | DJ       | Slots + this-week drop status |
| POST   | `/djs/me/upload`              | DJ       | Multipart file upload (also writes to `WCCG_DROP_ROOT/ready/`) |
| GET    | `/djs/me/drops?weeks=4`       | DJ       | Drop history |
| GET    | `/djs/me/ftp`                 | DJ       | FTP creds (password hidden after issue) |
| POST   | `/djs/me/ftp/rotate`          | DJ       | Rotate FTP password (returned once) |
| GET    | `/djs/admin/missing?weekOf=…` | Admin    | What's missing this week |
| GET    | `/djs/admin/all`              | Admin    | Full DJ + slots list |
| POST   | `/djs/admin/claim`            | Admin    | Link a DJ slug to a Supabase user |
| GET    | `/djs/:slug`                  | Anyone   | Public DJ profile |

---

## 7. The optional embedded FTP server

`apps/workers/src/ftp/ftp-server.ts` exists but is **off by default** because
you already run FTP. To turn it on, set `FTP_DISABLED=false` in
`apps/workers/.env`. It binds on `FTP_PORT` (default 2121), authenticates
against `dj_ftp_accounts`, and uses the same `dj_drops` ingestion path.
Useful only if you want WCCG to host FTP on its own — which you don't need.

---

## 8. Things to remember

- **The week boundary is ISO Monday in America/New_York.** A Saturday-night
  upload counts toward the week that started the prior Monday.
- **Sentinel files** (`<file>.processed`) prevent the watcher from
  reprocessing the same upload. If you want to force a re-ingest, delete
  both the audio file *and* its sentinel; the next FTP upload will be picked
  up fresh.
- **`/ready/` is overwrite-on-rewrite.** If a DJ re-uploads a file with the
  same code (correcting an error), Radio Spider sees the new bytes on its
  next poll. The Supabase Storage archive keeps the old version too because
  upserts there append, not replace, in the bucket history.
- **No deps to install on your FTP server** — the platform doesn't touch
  your FTP daemon. It only reads/writes the directory tree under
  `$WCCG_DROP_ROOT/`.
