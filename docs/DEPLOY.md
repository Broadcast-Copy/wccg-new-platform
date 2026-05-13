# Deployment Runbook

**Last updated:** 2026-05-13

The platform has three deploy surfaces, each driven by a GitHub Actions workflow.

| Surface | Workflow | What it does |
|---|---|---|
| **Web** (Next.js static export → `app.wccg1045fm.com`) | `.github/workflows/deploy.yml` | Builds the Next.js static export and rsyncs to KnownHost. Also pushes to GitHub Pages as a backup. |
| **API + Admin + Workers** (NestJS + pm2 on VPS) | `.github/workflows/deploy-vps.yml` | SSH-deploys to the VPS, runs `pnpm install`, `pnpm build`, `pm2 startOrRestart`. |
| **Studio-sync** (Windows production-room PC) | _no CI; pull-based_ | The studio PC runs `git pull && pnpm install` manually after a release. See [DJ-PORTAL-FTP.md §7](DJ-PORTAL-FTP.md). |

---

## Required GitHub Actions secrets

Set at [Settings → Secrets and variables → Actions](../../settings/secrets/actions).

### Web (deploy.yml)

| Secret | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://irjiqbmoohklagdegezz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key from Supabase dashboard → Settings → API |
| `KNOWNHOST_SSH_HOST` | rsync target |
| `KNOWNHOST_SSH_USER` | rsync user |
| `KNOWNHOST_SSH_PASSWORD` | or use `KNOWNHOST_SSH_KEY` |
| `KNOWNHOST_SSH_PORT` | optional, defaults to 22 |

### VPS (deploy-vps.yml)

| Secret | Notes |
|---|---|
| `VPS_HOST` | hostname or IP of the API VPS |
| `VPS_USER` | SSH user (must have sudo-less pm2 + git access) |
| `VPS_SSH_KEY` | full `-----BEGIN OPENSSH PRIVATE KEY-----…END` block |
| `VPS_PORT` | optional, defaults to 22 |

**Without these secrets, the workflow now skips gracefully with a yellow warning** — no more failed-job red marks on every push. As soon as the secrets are set, the next push (or a manual workflow dispatch) will deploy.

---

## VPS environment

Once the VPS deploy runs, you'll want these env vars in `~/wccg-new-platform/apps/api/.env`:

```bash
# Database
SUPABASE_URL=https://irjiqbmoohklagdegezz.supabase.co
SUPABASE_SECRET_KEY=<service role key — keep this server-side only>
SUPABASE_JWT_SECRET=<from Supabase dashboard → Settings → API → JWT secret>

# Studio-sync agent (Phase 2D) — also set on the studio PC
STUDIO_AGENT_TOKEN=<32-char hex; same value on both>

# Restream agent (Phase D) — also set in the workers env
RESTREAM_AGENT_TOKEN=<32-char hex; same value on both>

# Optional integrations (each feature no-ops gracefully if missing)
ANTHROPIC_API_KEY=…                # auto-research wiki agent
RESEND_API_KEY=…                   # newsletter confirmation
STRIPE_SECRET_KEY=…                # marketplace
NEXT_PUBLIC_VAPID_PUBLIC_KEY=…     # web push
VAPID_PRIVATE_KEY=…
```

And in `~/wccg-new-platform/apps/workers/.env`:

```bash
SUPABASE_URL=…
SUPABASE_SECRET_KEY=…

# Worker→API auth (must match the API)
WCCG_API_URL=https://api.wccg1045fm.com/api/v1
WCCG_API_ADMIN_TOKEN=<any logged-in Supabase access_token, or service role>
RESTREAM_AGENT_TOKEN=<same as API>

# Metadata polling (Phase 3) — leave 'manual' if you set now-playing via the MCR UI
WCCG_METADATA_SOURCE=icecast       # icecast | shoutcast | centova | manual
WCCG_METADATA_URL=http://stream.wccg1045fm.com:8000
WCCG_METADATA_MOUNT=/wccg          # for multi-mount Icecast setups

# Restream (Phase D) — VPS hosts ffmpeg
FFMPEG_BIN=ffmpeg                  # path to ffmpeg, default 'ffmpeg' on PATH
```

The studio PC (Windows) needs different env vars — see [DJ-PORTAL-FTP.md §7](DJ-PORTAL-FTP.md).

---

## pm2 process list

`infra/deploy/ecosystem.config.cjs` runs three apps:

```
wccg-api      port 3001
wccg-admin    port 3002
wccg-workers  background (metadata-poll, restream, studio-sync, dj-drops watcher, auto-research)
```

Restart commands:

```bash
ssh vps "pm2 restart wccg-api wccg-workers"
ssh vps "pm2 logs wccg-workers"           # tail worker output
ssh vps "pm2 monit"                       # live dashboard
```

---

## Manual deploy (skip CI)

```bash
ssh vps
cd ~/wccg-new-platform
git fetch --quiet origin main && git reset --hard origin/main
pnpm install --frozen-lockfile
pnpm --filter api build
pnpm --filter admin build
pnpm --filter @wccg/workers build
pm2 startOrRestart infra/deploy/ecosystem.config.cjs --env production
pm2 save
pm2 list
```

---

## Generating shared secrets

For STUDIO_AGENT_TOKEN, RESTREAM_AGENT_TOKEN, etc.:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the SAME value on both ends (API + worker). The worker side picks it up at boot.
