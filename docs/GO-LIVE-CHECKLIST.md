# Go-Live Checklist

**Date:** 2026-05-22
**Status:** all code shipped; 5 manual steps left to take the new features live.

Everything below is something the platform-as-code can't do on its own —
each requires credentials or dashboard access only you have. Each step is
self-contained; do them in any order.

---

## 1. Install ffmpeg on the VPS  *(required for restream / Phase D)*

```bash
ssh <vps-host>
sudo apt-get update && sudo apt-get install -y ffmpeg
ffmpeg -version | head -1            # should print 4.x or 6.x
which ffmpeg                         # remember this path
pm2 restart wccg-workers             # restream worker now sees it on PATH
```

If `which ffmpeg` returns a path other than `/usr/bin/ffmpeg`, also add
to `apps/workers/.env`:

```env
FFMPEG_BIN=/usr/local/bin/ffmpeg     # whatever `which ffmpeg` returned
```

---

## 2. Set the three GitHub Actions secrets

[Direct link → Settings → Secrets → Actions](https://github.com/Broadcast-Copy/wccg-new-platform/settings/secrets/actions)

| Secret | Value |
|---|---|
| `VPS_HOST` | hostname or IP of the API VPS |
| `VPS_USER` | SSH user with sudo-less pm2 + git access |
| `VPS_SSH_KEY` | full `-----BEGIN OPENSSH PRIVATE KEY-----…END` block |
| `VPS_PORT` | *(optional, defaults to 22)* |

Once set, the next push or `workflow_dispatch` of **Deploy API / Admin /
Workers to VPS** will auto-deploy. Until then the workflow skips with a
yellow warning (no more failed-red marks).

Faster via `gh` CLI on your laptop:

```bash
gh secret set VPS_HOST    --repo Broadcast-Copy/wccg-new-platform --body "<hostname>"
gh secret set VPS_USER    --repo Broadcast-Copy/wccg-new-platform --body "<user>"
gh secret set VPS_SSH_KEY --repo Broadcast-Copy/wccg-new-platform < ~/.ssh/wccg_vps_key
```

---

## 3. Set the two shared bearer tokens

Use the SAME value on both ends (API + worker). The agent + API gate on
exact match.

### On the API VPS

```bash
ssh <vps-host>
cat >> ~/wccg-new-platform/apps/api/.env <<'EOF'

# Shared bearer tokens for Phase 2D + Phase D worker callbacks
STUDIO_AGENT_TOKEN=<value-from-step-3a-below>
RESTREAM_AGENT_TOKEN=<value-from-step-3a-below>
EOF
pm2 restart wccg-api
```

### Same VPS, worker side

```bash
cat >> ~/wccg-new-platform/apps/workers/.env <<'EOF'

WCCG_API_URL=https://api.wccg1045fm.com/api/v1
STUDIO_AGENT_TOKEN=<same-value-as-api>
RESTREAM_AGENT_TOKEN=<same-value-as-api>
FFMPEG_BIN=ffmpeg
EOF
pm2 restart wccg-workers
```

### On the production-room (Windows) PC

```cmd
cd C:\path\to\wccg-new-platform\apps\workers
echo WCCG_API_URL=https://api.wccg1045fm.com/api/v1>> .env
echo STUDIO_AGENT_TOKEN=<same-value>>> .env
echo WCCG_STUDIO_ARCHIVE_ROOT=D:\WCCG\b-mixshows>> .env
echo WCCG_STUDIO_ONAIR_ROOT=M:\JBMusic>> .env
```

### 3a. To regenerate tokens whenever you want

```bash
openssl rand -hex 32        # one each for STUDIO_ and RESTREAM_
# or:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Enable HIBP-leaked-password protection in Supabase

[Direct link → Auth → Providers → Email](https://supabase.com/dashboard/project/irjiqbmoohklagdegezz/auth/providers?provider=Email)

Scroll to **"Password Security"** → flip **"Prevent use of leaked
passwords"** to ON. Click Save.

That closes the last remaining WARN-level item on the Supabase security
advisor.

---

## 5. Re-applying migrations on a fresh DB rebuild

Already applied to the live DB via the Supabase MCP. This is only
relevant if you ever rebuild from scratch (e.g. `supabase db reset`).
Apply in this order (skip `014` — `015` supersedes it):

```
001 through 012      pre-existing
013_dj_portal_schema
015_dj_roster_v2
016_record_pool
017_master_control_eas
018_rls_policies
019_restream
020_analytics_views
```

`014_seed_djs.sql` remains in the repo for historical reference but
duplicates / is overridden by `015_dj_roster_v2.sql`. Applying both in
order is harmless (015 uses ON CONFLICT DO UPDATE), but you can also
skip 014 entirely.

After applying, run:

```bash
node scripts/seed-dj-accounts.mjs    # needs SUPABASE_SERVICE_ROLE_KEY
```

to recreate the 33 DJ auth accounts with their `hotter1045!` temp
passwords.

---

## Confirming everything is live

After steps 1-4, smoke-test from your laptop:

```bash
# (a) Web is rebuilding + redeploying — check Actions tab
gh run list --repo Broadcast-Copy/wccg-new-platform --limit 5

# (b) API admin endpoints are gated
curl https://api.wccg1045fm.com/api/v1/mcr/dashboard
# → 401 unauthorized (correct — no bearer)

# (c) Public on-air endpoint works
curl https://api.wccg1045fm.com/api/v1/mcr/on-air | jq .
# → JSON with signalStatus, listeners, etc.

# (d) Restream agent can reach the API
ssh <vps-host> "pm2 logs wccg-workers --lines 20 | grep restream"
# → should see "reconciler starting" line
```
