# Phase A — Tickets, ranked by listenership × engagement impact

**Date:** 2026-04-18
**Goal:** Every ticket here exists because it moves at least one of:
- **Listenership** = audio minutes streamed, time-to-first-audio, % of visitors who press play, concurrent listeners
- **Engagement** = DAU/WAU, sessions/user, actions/session, 7- and 30-day retention

If a ticket can't be tied to one of those, it doesn't belong in Phase A.

---

## Scoring legend

| Symbol | Meaning |
|--------|---------|
| 🔊 | Listenership impact |
| ❤️ | Engagement impact |
| ⏱ | Estimated build time |
| 🧪 | Acceptance test |

---

## A1 — Audio-first "Live Now" home hero  🔊🔊🔊  ❤️❤️  ⏱ 1 day

**Why first.** Today's hero says "Hip Hop, Sports, Reactions And Podcasts" with a `Now Streaming` button — text-led, not action-led. We're burying the lede. The home page is the highest-traffic surface and right now it does not lead with **the actual song playing right now** and a giant play button. That single change is the biggest one-shot lift to time-to-first-audio.

**Build:**
- New component `apps/web/src/components/home/live-now-hero.tsx`.
- Polls `useNowPlaying(true)` regardless of play state so the *track on air* is always visible.
- Hero left: 320×320 album art (live from now-playing) with subtle pulse when playing, dark plate when paused.
- Hero right:
  - `[● LIVE]` badge with concurrent-listener pill (`Live worldwide` placeholder until restream metrics land).
  - Track title (display serif, 40–48 px), artist (sans, 24 px).
  - Primary CTA: `▶ Tap to listen` (60 px tall, full-bleed on mobile). When playing, swaps to `⏸ Pause` and shows `Next point in 47s` micro-copy.
  - Earning explainer chip: `+1 WP / 90 s while you listen` — clickable, opens `/earn`.
  - Today's WP earned (live, increments visibly on each award).
  - Subtitle line: current show + host (linked to `/shows/[slug]`).
- Replace `<Hero />` import in `apps/web/src/app/(main)/page.tsx`.
- Demote the existing show-carousel hero to a smaller "On the air" strip below, keeping the slide cycling but at half-height.

**🧪 Acceptance:**
- LCP element on `/` is the album art image, ≤ 2.0 s on 4G.
- Pressing the CTA starts audio in ≤ 1.5 s; CTA flips to pause state and the WP-per-90s ring starts animating.
- Track title updates within 15 s of a real Cirrus feed change without a page refresh.
- Mobile (375 px) layout has no horizontal scroll, button height ≥ 56 px, hit area ≥ 48 px.

---

## A2 — Server-side points ledger sync  🔊  ❤️❤️❤️  ⏱ 2 days

**Why.** Points are real on the client but invisible to the server. That blocks: leaderboards (engagement), cross-device balance (engagement), redemptions (marketplace), anti-fraud (trust). Without this, every other engagement feature is built on sand.

**Build:**
- New endpoint `POST /points/award` in `apps/api/src/modules/points/points.controller.ts` accepting `{ idempotencyKey, amount, reason, ref?, occurredAt }`. Server validates and writes a single `points_ledger` row per idempotency key.
- Daily cap enforcement server-side per `reason` (240 listening pts/day, etc.).
- New `apps/web/src/lib/points-sync.ts`:
  - Outbox queue persisted to `localStorage` under `wccg_points_outbox`.
  - On every `awardListeningBatch` / bonus award, push `{ idempotencyKey, amount, reason, ts }` to outbox.
  - Background flusher: every 30 s when online, drain outbox to `/points/award`. On 200, remove. On network error, retry with exponential backoff.
  - On flush, also fetch `/points/balance` and reconcile if drift > 5 pts (server is authoritative).
- `useListeningPoints` calls `enqueuePointEvent(...)` alongside its localStorage writes — backwards-compatible, no UX regression if the API is down.
- `getListeningPoints()` continues to read from localStorage for instant UI; the next sync corrects drift.

**🧪 Acceptance:**
- Listen for 5 minutes → server `points_ledger` shows ≥ 3 listening events totaling expected points within 60 s of session end.
- Kill the API → keep listening → points still award locally → bring API back → outbox drains and ledger catches up.
- Issue the same idempotency key twice → only one ledger row written.
- Daily cap of 240 listening pts is enforced even if client floods the endpoint.

---

## A3 — Now-playing rail on home (artist-first discovery)  🔊  ❤️❤️  ⏱ 1 day

**Why.** People who *care* about the artist on air are the ones who keep listening. A "More by [artist]" / "About this artist" tile right under the hero converts curiosity into dwell time, and it's the natural bridge to the wiki (Phase C).

**Build:**
- `apps/web/src/components/home/artist-rail.tsx`:
  - Uses `useNowPlaying` artist + title.
  - Three tiles: `About this artist` (links to `/wiki/<slug>` — stub page is OK; real wiki ships in Phase C), `More by [artist]` (queries Spotify/Apple Music public catalog for top tracks — read-only embed), `Add to favorites` (saves to a `user_favorites` table; awards 5 WP first time per artist).
  - When the now-playing artist changes, all three tiles slide-update.
- Stub `/wiki/[slug]` route renders just `<h1>{artist}</h1>` and `Coming soon — auto-research in progress`. Place a "Notify me when ready" button that subscribes the user to a `wiki_watchers` row.

**🧪 Acceptance:**
- Artist tile updates without page refresh when the track changes.
- "Add to favorites" persists across sessions and shows a tiny `★` next to the artist name.
- Stub wiki page returns 200 for any artist slug; doesn't 404.

---

## A4 — Daily streak + check-in surfacing on home  ❤️❤️❤️  ⏱ 0.5 day

**Why.** Streaks are the cheapest engagement loop in software. Right now check-in is a separate page. Surface today's status on home and most users will press the button.

**Build:**
- `apps/web/src/components/home/daily-streak-card.tsx`:
  - Shows "🔥 12-day streak — claim today's bonus" with a primary button when not yet claimed.
  - Shows "✓ Claimed today — back tomorrow for +25 WP" when already claimed.
  - Tiny calendar showing the last 14 days (filled = listened that day).
- Streak read from a server projection over `points_ledger` (depends on A2). Until A2 lands, fall back to localStorage.
- Award 25 WP on first listen-of-day (already partially exists as DAILY_BOUNTY = 3 WP — bump to 25 for impact and rename).

**🧪 Acceptance:**
- A user who listens for ≥ 60 s sees their streak increment by next day's first session.
- Streak resets after 36 h of no listening.
- Two clicks from home to a claimed daily bonus.

---

## A5 — Live leaderboard widget  ❤️❤️  ⏱ 1 day  *(depends on A2)*

**Why.** Public ranking is the second-cheapest engagement loop. Even a small "you're #47 this week" badge bumps return rate.

**Build:**
- New endpoint `GET /points/leaderboard?period=weekly|monthly|all`.
- New component `apps/web/src/components/home/leaderboard-card.tsx` showing top 5 + the current user's rank + delta.
- Privacy: opt-in via `/my/notifications/preferences` (default in for new accounts, settable any time).

**🧪 Acceptance:**
- Top 5 query runs in < 100 ms at p95 with 100k users.
- Rank update visible to user within 2 min of a points event.

---

## A6 — Push-notification opt-in nudge  ❤️❤️  ⏱ 1 day

**Why.** Push is the highest-ROI re-engagement channel. We have to ask after the user has *some* invested attention, not on first visit.

**Build:**
- `apps/web/src/components/notifications/push-prompt.tsx`:
  - Triggers exactly once per user, after 2 minutes of cumulative listening in a single session.
  - Modal: "Hear it first when [favorited host] goes live? (+50 WP for opting in)".
  - Standard Web Push (VAPID). Backend already has stubs for notifications under `/my/notifications`.
- Server logs subscription to a `push_subscriptions` table, sends test ping on subscribe.

**🧪 Acceptance:**
- Prompt fires at the 2-minute mark, never sooner.
- Declining suppresses the prompt for 30 days.
- Accepting awards 50 WP and sends a "You're in" test push within 10 s.

---

## A7 — Schedule from DB + "Up Next" rail  🔊  ❤️  ⏱ 2 days

**Why.** The hardcoded `data/schedule.ts` blocks ops from changing the schedule without a deploy and prevents the player and home from reliably saying "Up next: [show] at 10 AM" — a strong listenership pull.

**Build:**
- Seed `shows`, `hosts`, `show_hosts`, `schedule_blocks` tables from `data/schedule.ts` (one-time script in `scripts/seed-schedule.ts`).
- New endpoint `GET /schedule/now-and-next` → `{ now: ScheduleBlock, upcoming: ScheduleBlock[] }`.
- New component `apps/web/src/components/home/up-next-rail.tsx` showing now + next two blocks with a 60 s tick.
- Replace `resolveNowPlaying()` in `data/schedule.ts` with a hook backed by the API.
- Admin: CRUD UI for shows + hosts + schedule blocks at `/my/admin/operations/schedule` (basic — power users edit in Supabase if needed).

**🧪 Acceptance:**
- Editing a schedule block in admin reflects on home within 60 s.
- "Up Next" rail correctly shifts at the top of every hour without refresh.

---

## A8 — Newsletter actually subscribes (+100 WP first time)  ❤️❤️  ⏱ 0.5 day

**Why.** The current home form fakes success. That's a trust hole and a missed engagement loop. Email is still our second-best re-engagement channel after push.

**Build:**
- Resend integration in `apps/api/src/modules/marketing/`.
- `POST /marketing/newsletter` → upsert email to a `newsletter_subscribers` table, send a confirmation email with a magic-link to associate to the account.
- On confirmed subscription, award 100 WP via `/points/award` (idempotency key = `newsletter:<email>`).
- Replace fake handler in `apps/web/src/app/(main)/page.tsx` with real call.

**🧪 Acceptance:**
- Submitting an email lands a row in DB and a real confirmation email within 30 s.
- Confirming the email awards 100 WP exactly once per email.

---

## A9 — Funnel analytics  🔊  ❤️  ⏱ 1 day

**Why.** Without instrumentation we can't tell if A1–A8 actually moved the needles. This must ship in the same release as A1.

**Build:**
- PostHog (or Plausible if simpler) integration in `apps/web/src/lib/analytics.ts`.
- Track these events (and only these — keep the schema small):
  - `visit_home`
  - `play_clicked` (with `source: 'hero' | 'global_player' | 'sticky_bar'`)
  - `audio_first_byte` (with `latency_ms`)
  - `audio_listen_minute` (every minute the user is actually listening, debounced)
  - `point_awarded` (with `reason`, `amount`)
  - `daily_check_in`
  - `signup_completed`
  - `wiki_viewed`
  - `place_check_in`
  - `marketplace_view`
- Dashboard panels: visit→play conversion, p50 first-byte latency, listen-minutes/DAU, retention curves D1/D7/D30.

**🧪 Acceptance:**
- All events fire and appear in PostHog within 10 s.
- Dashboard live before A1 ships so we can see the lift.

---

## Sequencing & dependencies

```
A9 (analytics, parallel)
A1 (hero) ─────────────► measurable lift starts here
A2 (sync) ────► A4, A5
A3 (rail, parallel with A2)
A4, A5, A6, A8 parallel after A2
A7 anytime (no dep)
```

**Recommended order to ship:** A9 + A1 together (one release) → A2 → A3 + A4 (one release) → A5 + A6 + A8 (one release) → A7 (one release). Five releases, ~10 working days.

---

## Out of Phase A (deferred to B/C)

- Marketplace storefront (Phase B)
- Places directory rebuild (Phase B)
- Auto-research agent + Obsidian wiki (Phase C)
- Restream destination fan-out beyond web (Phase D)
- Mobile native app (post-launch)

---

## Definition of done for Phase A

- p75 home LCP ≤ 2.0 s on 4G
- Visit→play conversion ≥ 35% on first visit (baseline TBD by A9)
- Median session listening time ≥ 12 min
- D7 retention of new signups ≥ 25%
- Server-side points ledger reconciles to client within 60 s for ≥ 99% of users
- Daily streak claimed by ≥ 40% of DAU
