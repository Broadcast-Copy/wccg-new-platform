# WCCG 104.5 FM — Super-App PRD (Remaining Work)

_Last updated: 2026-06-06_

## 1. Product context
WCCG 104.5 FM is a community-radio **super-app** for Fayetteville, NC and the surrounding
counties: live streaming, on-demand video & DJ mixshows, social profiles & direct messaging,
a local business directory, events, rewards/points, a marketplace, and staff/admin consoles.
Operated by **Carson Communications**.

## 2. Architecture & constraints (must honor)
- **Frontend:** Next.js 16 App Router, `output: 'export'` (fully static). Deployed to KnownHost
  (`app.wccg1045fm.com`) via GitHub Actions → `lftp`.
- **No API server:** all data access is **browser → Supabase direct** (`@/lib/supabase/client`).
  The legacy NestJS `apiClient` is dead — any remaining call silently fails.
- **Supabase:** Postgres + **RLS is the real authorization backstop** (static export has no
  middleware), Storage buckets, SECURITY DEFINER helpers (`is_staff()`, `is_admin()`,
  `is_internal()`), Edge Functions (Resend email).
- **Dynamic routes:** client-resolved via a `_placeholder` `generateStaticParams` shim **plus**
  an `.htaccess` SPA-fallback rule (required for refresh/share).
- **Lint:** `react-hooks/set-state-in-effect` is strictly enforced — never call setState
  synchronously in an effect body (post-await + `active` guard, lazy initializer, or event handler).
- **Deploy:** push to `main` → `next build --webpack` (324 routes) → `lftp` to KnownHost
  (`include-hidden-files` so `.htaccess` ships). Verify via the Actions API.

## 3. Status snapshot (live)
DJ mixshow pipeline (slots/drops/upload + admin oversight & nudge), video wall + watch page,
public social profiles + follows + **listener↔listener DMs from profiles**, messenger dock,
**notifications** (bell + new-DM / new-follower triggers), **entity follows** (hosts/shows),
**newsletter signup**, Duke card (Supabase video slider), Watch "Latest Gospel" + catalog fixes
(Joel Osteen removed, Dr. Tony Haire seeded), admin-mode Carson logo, dynamic-route 404 fallbacks.

## 4. Guiding principles
1. Supabase-direct, **RLS-enforced**; never rely on client guards for data security.
2. **Graceful degradation** (no crashes) when data is absent.
3. **Reuse existing tables** before creating new ones.
4. Every change: clean `next build` (324 routes) + deploy verified via the Actions API.

## 5. Epics & requirements

### EPIC A — Eliminate the dead `apiClient` (primary)
Goal: zero runtime `apiClient` calls on user paths. Legend: ✅ done · ⬜ todo · 🧱 needs new table/RPC.

| ID | Feature | Files | Backing data | Status |
|----|---------|-------|--------------|--------|
| A1 | Notifications bell | `notification-bell.tsx` | `notifications` (+ triggers) | ✅ |
| A2 | Follows (host/show) | `follow-button`, `follower-count` | `entity_follows` | ✅ |
| A3 | Newsletter signup | `page.tsx` | `newsletter_subscribers` | ✅ |
| A4 | Home "Upcoming Events" | `page.tsx` → UpcomingEventsSection | `events` ✅ | ⬜ Wave 1 |
| A5 | Live-now / Up-next rails | `live-now-rail.tsx`, `up-next-rail.tsx` | `streams`+`stream_metadata`, `schedule_blocks` ✅ | ⬜ Wave 1 |
| A6 | Places directory + profile | `places/page.tsx`, `place-profile-client.tsx` | `directory_listings` ✅ | ⬜ Wave 1 |
| A7 | Place reviews + check-in | `place-profile-client.tsx` | 🧱 `place_reviews`, `place_checkins` | ⬜ Wave 2 |
| A8 | Podcast delete | `my/podcasts/page.tsx` | `dj_mixes` ✅ | ⬜ Wave 1 |
| A9 | Mix upload | `mix-uploader.tsx` | `dj_mixes` ✅ + Storage | ⬜ Wave 1 |
| A10 | Favorites list/remove | `favorites-list.tsx` | `favorites` / `user_favorites` ✅ | ⬜ Wave 1 |
| A11 | Points: balance/streak/leaderboard | `points-badge`, `daily-streak-card`, `leaderboard-card` | `user_points`, `points_history`, `user_milestones` ✅ + `points_leaderboard()` RPC 🧱 | ⬜ Wave 1 |
| A12 | Points sync (outbox) | `points-sync.ts` | none — points award via secure RPCs → make no-op | ⬜ Wave 1 |
| A13 | Wiki research/approve/queue | `wiki-entity-client`, `use-wiki-trigger`, `studio/wiki/queue` | 🧱 wiki tables + AI research Edge Function | ⬜ Wave 2 (admin) |
| A14 | Push subscribe | `push-prompt` | 🧱 `push_subscriptions` + web-push Edge Function | ⬜ Wave 3 |

**Acceptance (per feature):** performs its action against Supabase with optimistic UI, error
handling, and correct RLS; renders an empty/graceful state when there's no data.

### EPIC B — Routing & navigation hygiene
- **B1** ✅ `.htaccess` SPA fallbacks for all dynamic routes.
- **B2** ⬜ Consolidate role navigation into one source of truth (`lib/role-nav.ts`) shared by the
  sidebar + user-menu (task #19).
- **B3** ⬜ Pre-render `/djs/[slug]` + `/hosts/[hostId]` for known ids (speed/SEO) — optional, since
  fallbacks now exist (task #3).

### EPIC C — Listener social & communication
- **C1** ✅ Message button on profiles + DM backbone (listener↔listener verified).
- **C2** ⬜ Make regular **listeners discoverable** — a People/Members directory beyond DJs — so
  listener↔listener messaging scales (today only hub member grids + profiles surface people).
- **C3** ⬜ (stretch) presence/online indicator; hub/group chat.

### EPIC D — Content & data integrity
- **D1** ⬜ Confirm the **real Mt. Pisgah Missionary Baptist Church** YouTube channel (the config id
  was Progressive MBC); reseed Gospel. _Needs the correct channel from the station._
- **D2** ⬜ Optionally feature Dr. Tony Haire **full-length** "Encouraging Moment" broadcasts instead
  of shorts. _Needs source._
- **D3** ⬜ Scheduled re-seed of program videos (Edge Function/cron) so Watch stays current.

### EPIC E — Code quality
- **E1** ⬜ Clear the 193 ESLint errors (mostly `no-explicit-any` + unused vars in `espn-api.ts`,
  `dsp/ad-platforms.ts`) — type the external API responses. Non-blocking for the build.

### EPIC F — Notifications expansion
- **F1** ⬜ More producers: post likes, event reminders, points milestones, DJ-drop-received (admin);
  a full `/my/notifications` page.

### EPIC G — Access-control polish
- **G1** ⬜ Guard `/my/marketing/*` with `RequireRole`; sweep for any other unguarded `/my/*`.

## 6. Phased roadmap
- **Wave 1 (in progress):** A4–A12 (table-backed `apiClient` rebuilds) + `points_leaderboard` RPC. Multi-agent.
- **Wave 2:** A7 (place reviews/check-in tables), A13 (wiki), B2 (role-nav), C2 (members directory), G1 (guard).
- **Wave 3:** A14 (push), E1 (lint), F1 (notification producers), B3 (pre-render), D1–D3 (content; needs station inputs).

## 7. Risks / open questions
- **Points:** awarding is intentionally locked for integrity; the client outbox sync becomes a no-op.
  Confirm no points are lost (they're awarded by secure RPCs — listening/redeem).
- **New tables (A7, A13, A14):** confirm these features are wanted before building.
- **Content (D1/D2):** need the station to supply the correct YouTube channels.
