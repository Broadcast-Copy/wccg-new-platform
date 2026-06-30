# Podcast Studio — multi-user (LiveKit) setup

The Podcast Studio (`/studio/podcast`) can connect multiple signed-in users into
one live audio/video room (host + guests see and hear each other). The transport
is **LiveKit**. This is **feature-flagged off** until the steps below are done —
with no LiveKit configured, the studio works exactly as before (solo recorder).

## What was built

- **Edge function** `supabase/functions/livekit-token` — mints a short-lived
  LiveKit join token for the *signed-in* user. The API secret never reaches the
  browser. Returns `503` (studio stays solo) until the secrets below are set.
- **Client** `apps/web/src/hooks/use-livekit-room.ts` + `components/studio/livekit-grid.tsx`
  — connect, publish camera/mic, render every participant's real video/audio.
- **Wiring** in `studio/podcast/page.tsx` — when LiveKit is configured the video
  area shows the live multi-party grid; the invite link/QR carry `?room=<id>` so
  a guest opening it lands in the **same** room.

## One-time setup (you)

### 1. Create a LiveKit project
- Sign up at <https://cloud.livekit.io> (free tier is fine to start).
- In the project, open **Settings → Keys** and create an API key.
- Note three values:
  - **API Key** (looks like `APIxxxxxxxx`)
  - **API Secret**
  - **Project URL** — the `wss://<your-project>.livekit.cloud` websocket URL.

### 2. Set the Supabase secrets (server-side; used by the edge function)
From the repo, or via the Supabase dashboard → Edge Functions → Secrets:

```
supabase secrets set LIVEKIT_API_KEY=APIxxxxxxxx
supabase secrets set LIVEKIT_API_SECRET=your-secret
supabase secrets set LIVEKIT_URL=wss://your-project.livekit.cloud
```

(Or just paste the three to me and I'll set them via the Supabase MCP.)

### 3. Deploy the edge function
```
supabase functions deploy livekit-token
```
(Or I deploy it via the Supabase MCP. It's safe to deploy before the secrets
exist — it just returns 503 until they're set.)

### 4. Expose the LiveKit URL to the web build (client flag)
The browser needs the **public** websocket URL (this is not a secret — the token
is what's protected). Add a GitHub Actions secret and it ships on the next build:

- Repo → Settings → Secrets and variables → Actions → New repository secret
  - Name: `NEXT_PUBLIC_LIVEKIT_URL`
  - Value: `wss://your-project.livekit.cloud`

`.github/workflows/deploy.yml` already passes `NEXT_PUBLIC_LIVEKIT_URL` into the
build (empty by default = feature off). Re-run the deploy (push or the manual
"Run workflow" button) once the secret is set.

## How it works once enabled

- The host opens `/studio/podcast`. Their room id is `studio-<their-user-id>`,
  and the invite link becomes `/studio/podcast?room=studio-<host-id>`.
- A guest opens that link (must be signed in), gets their own token, and joins
  the same room — both now see/hear each other in the grid.
- Mic/camera buttons drive the real published tracks. The record button still
  records the local user (single-party). Multi-party recording is a later step
  (LiveKit **Egress** records the whole room server-side).

## Notes / future
- Free tier has monthly minute limits; check LiveKit usage if it grows.
- For self-hosting later (broadcastcopy.ai multi-tenant), LiveKit is open-source;
  only `LIVEKIT_URL` + keys change.
- Multi-party recording → add a LiveKit Egress call (room composite) triggered
  from an edge function; out of scope for this first cut.
