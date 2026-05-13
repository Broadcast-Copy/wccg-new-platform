# Restream Fan-out — Runbook

**Last updated:** 2026-05-13
**Audience:** WCCG operators

The restream worker pipes the WCCG live stream to YouTube Live, Twitch,
Facebook Live, custom RTMP endpoints, and (v2) Discord — simultaneously,
unattended, 24/7. This doc tells you how to bring it online safely.

> **The rule:** turn on ONE destination first. Watch it for an hour. Then
> add the next. Don't flip everything green on day 1.

---

## 1. Install ffmpeg on the host (VPS)

The worker shells out to `ffmpeg`. It must be on `PATH` of the process
that runs `apps/workers`.

```bash
ssh vps
sudo apt-get update && sudo apt-get install -y ffmpeg
ffmpeg -version | head -3
```

Confirm it sees:
- a build year ≥ 2024,
- `--enable-libx264` (video encoder for static-image mode),
- `--enable-libfdk-aac` OR `--enable-libfaac` OR `--enable-aac`
  (AAC encoder required by YouTube/Twitch/Facebook).

Most Debian/Ubuntu builds ship with `libx264 + native AAC` which is
fine for our use case.

---

## 2. Generate and set the shared secret

The worker authenticates to the API with a single bearer token. Same value
on both sides.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → 4f9c2e3a1b7d8e0f...
```

Set on the API host (`apps/api/.env`):

```env
RESTREAM_AGENT_TOKEN=4f9c2e3a1b7d8e0f...
```

And on the workers host (`apps/workers/.env`):

```env
WCCG_API_URL=https://api.wccg1045fm.com/api/v1
RESTREAM_AGENT_TOKEN=4f9c2e3a1b7d8e0f...
FFMPEG_BIN=ffmpeg                  # or /usr/local/bin/ffmpeg if non-PATH
WCCG_RESTREAM_POLL_MS=30000        # reconcile cadence; 30s default
```

Restart both:

```bash
pm2 restart wccg-api wccg-workers
pm2 logs wccg-workers | grep restream    # should see: "reconciler starting"
```

---

## 3. Get your first stream key (YouTube Live — easiest test)

1. https://studio.youtube.com/channel/UC.../livestreaming
2. **Go Live** → **Stream**
3. Pick a title, set visibility to **Unlisted** for the first test
4. Click **Edit** on the auto-created stream
5. Copy the **Stream key** (`live_xxxxxxxx_xxxxxxxxxxxxx`)
6. RTMP URL is the standard `rtmp://a.rtmp.youtube.com/live2`

> An **Unlisted** stream is the right test mode — YouTube doesn't email
> your subscribers and the URL only goes to people you share it with.

---

## 4. Add the destination in the admin UI

`/my/admin/restream` → **New destination** →

| Field | Value |
|---|---|
| Slug | `youtube-test` |
| Label | `YouTube Live — test` |
| Platform | `YouTube Live` |
| RTMP URL | (leave blank — picks up the default) |
| Stream key | (paste from step 3) |
| Video mode | `Static background image` |
| Background image URL | (leave blank — uses WCCG logo) |
| Video bitrate | `1500` for first test |
| Audio bitrate | `128` |
| Source URL | (leave blank — uses default Icecast mount) |

**Save it disabled first.** Click the row, verify all fields look right
(stream key shows last-4 only, that's correct — it's stored full but
masked to the UI).

---

## 5. Turn it on, watch it

Click **Enable** on that row.

Within ~30 seconds you should see the status pill go:

```
idle  →  starting  →  live  (pulsing green dot)
```

In the YouTube Live Control Room:
- "Stream status" goes from Offline → Receiving
- After ~10s, the preview tile shows your background image + the WCCG audio

If it stays in `idle` after 60s or flips to `failed`:

```bash
ssh vps
pm2 logs wccg-workers --lines 100 | grep -E 'restream|ffmpeg'
```

Common causes table is in §8.

---

## 6. Verify for an hour, then add the next

Real bandwidth and CPU only become visible after the encoder hits
steady state (~5 min). Things to check:

```bash
# CPU + memory on the VPS
top -p $(pgrep -f "ffmpeg.*rtmp")

# Outbound bandwidth per stream
iftop -t -s 60 | grep -E 'tx|rx'

# Worker heartbeat events
ssh vps "pm2 logs wccg-workers --lines 200 | grep heartbeat"
```

On the admin page, the **last_active_at** timestamp updates every 60s.
If it stops updating mid-stream, the worker thinks the process died —
look for an `error` event next to it.

Once you've held green for an hour:
- Bandwidth in `iftop` matches your bitrate (~1.6 Mbps for 1500+128k).
- CPU sustained at ~80–100% of one core per ffmpeg process.
- No restart events in `/my/admin/restream/:id/events`.

Then add Twitch / Facebook the same way.

---

## 7. Bandwidth math

| Destinations enabled | Per-stream bitrate | Total Mbps | Monthly outbound |
|---|---|---|---|
| 1 | 1500 + 128 ≈ 1.65 Mbps | 1.65 | ~540 GB |
| 1 | 2500 + 128 ≈ 2.65 Mbps | 2.65 | ~860 GB |
| 3 | each 1500 + 128 | 4.95 | ~1.6 TB |
| 3 | each 2500 + 128 | 7.95 | ~2.6 TB |

**KnownHost VPS plans typically include 1–5 TB/month outbound.** If you
plan to run 3 destinations 24/7, check your plan or expect ~$0.01/GB on
overage. The `/my/admin/restream` page now shows a running estimate at
the bottom — that number tracks the bitrates you actually have set on
the enabled destinations.

Ways to reduce bandwidth:

- **Lower bitrate.** 1500 kbps video is fine for a static-image radio
  show. Drop to 1000 if you're tight.
- **Only enable during shows.** A scheduled toggle (cron job calling
  `PATCH /restream/:id/toggle`) is a tidy follow-up.
- **Drop video entirely.** Twitch and YouTube refuse audio-only RTMP,
  but a "custom RTMP" destination pointing at a service that accepts it
  works.

---

## 8. Common failures

| Symptom | Cause | Fix |
|---|---|---|
| Status stays `idle`, never starts | ffmpeg not on PATH | `ffmpeg -version` on the worker host; set `FFMPEG_BIN=/full/path` |
| `failed` with `Stream ended prematurely` | Wrong RTMP URL or stream key expired (YouTube rotates keys per session) | Refresh the stream key in YouTube Studio, update destination |
| `failed` with `Connection refused` | RTMP URL typo / port blocked / VPS outbound firewall | Test from VPS: `curl -v telnet://a.rtmp.youtube.com:1935` |
| `failed` with `Could not write header` | Audio/video codec mismatch with destination | Make sure `video_mode != 'none'` for YouTube/Twitch/Facebook |
| Constant reconnecting | Source Icecast mount down or wrong URL | `curl -I $WCCG_RESTREAM_DEFAULT_SOURCE` should return 200 |
| Pulled key shows blank | Edited row didn't include the stream key (UI masks it but doesn't preserve unchanged values when you PATCH) | Re-enter the stream key when you edit |
| `consecutive_failures` climbs | Crash loop. Backoff is 1s → 60s capped | Disable the destination, investigate logs, fix, re-enable |

---

## 9. What's NOT in v1 (file a request when you need it)

- **Discord voice channel ingestion.** The schema and admin UI accept
  Discord destinations but the worker logs an "unsupported in v1" error.
  Discord requires `discord.js` voice gateway + a real-time PCM mixer;
  it's a separate worker piece, ~1 day of work.
- **Schedule-driven enable/disable.** No cron yet. Wire up via a one-
  line `PATCH /restream/:id/toggle` from cron or an n8n flow.
- **Live waveform video mode.** Currently `video_mode='waveform'` falls
  back to static image. Adding a real waveform requires ffmpeg's
  `showwaves` filter — easy follow-up.
- **Per-destination loudness target.** Currently passes the source audio
  through untouched. Add `-af loudnorm` if a platform complains.
- **Stream key rotation.** YouTube rotates keys per session. We don't
  detect this — re-paste the key when YouTube gives you a new one.

---

## 10. Quick rollback

If everything goes sideways:

```bash
# Stop all restream processes immediately
ssh vps "pm2 stop wccg-workers"
# Or disable all destinations via the API
ssh vps "curl -X PATCH -H 'Authorization: Bearer …' \
  https://api.wccg1045fm.com/api/v1/restream/<id>/toggle \
  -d '{\"enabled\":false}'"
# Or directly in SQL:
# UPDATE restream_destinations SET enabled = false;
```

Then start over with §5.
