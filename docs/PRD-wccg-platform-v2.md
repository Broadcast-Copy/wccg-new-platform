# PRD: WCCG 104.5 FM — Platform v2

**Date:** 2026-04-18
**Status:** Draft v1
**Owner:** WCCG Product & Engineering
**Priority:** P0 — defines the next 3 quarters of product work
**Production host:** `app.wccg1045fm.com`

---

## 0. North Star

> **WCCG is no longer "a radio station with a website." It is a local-media super-app where listening is rewarded, the community is mapped, and the knowledge behind every song, story, and place is alive — authored by humans, continuously researched by agents, and remembered forever.**

Five pillars, one product:

| # | Pillar | One-line promise |
|---|--------|------------------|
| 1 | **Restream** | One stream, every platform, frame-accurate, monetized. |
| 2 | **Listen & Earn** | Every minute you listen, every action you take, earns WCCG Points. |
| 3 | **Marketplace** | Spend Points on merch, tickets, experiences, and local deals. |
| 4 | **Places** | The definitive directory of what to do, eat, and see in the WCCG footprint. |
| 5 | **Living Knowledge** | An auto-researched, Obsidian-backed, LLM-authored wiki for every artist, host, place, event, and story. |

Success looks like: a listener wakes up, opens the app, sees a personalized "Today on WCCG" card, taps play, earns points passively while commuting, spends those points on lunch at a mapped local spot, and — without ever asking — has a one-paragraph LLM-written briefing on the artist now on air, sourced and cited from the wiki.

---

## 1. Design Principles (non-negotiable)

1. **Audio is the anchor.** The persistent player is the most important component in the entire app. It never stops, never re-mounts, never loses position during navigation. All design decisions orbit around it.
2. **Every surface is earnable.** Any action worth doing is worth rewarding. Listening, checking in, reviewing a place, reading a wiki article — all emit point events.
3. **Local > global.** WCCG is Chicago-area first. A national feature only ships if the local equivalent already works.
4. **Progressive disclosure.** The home screen is three taps from silence to earning. Power features (editor, analytics, admin) live deeper.
5. **No dead UI.** Every visible control does something or is hidden. The audio-editor PRD pain (50% stub buttons) is never repeated.
6. **Typography-led, dark-first.** A serif display + geometric sans pairing (Fraunces × Inter is the current direction). Station brand red (#C8102E) used sparingly, never as a fill for large surfaces.
7. **Accessibility is table stakes.** WCAG 2.2 AA. Captions on every stream. Keyboard-navigable player. Respect `prefers-reduced-motion`.
8. **Latency is a feature.** First audio byte < 1.5 s on 4G. TTI < 2.5 s on mid-tier Android. LCP < 2.0 s on the home screen.

---

## 2. Information Architecture

```
app.wccg1045fm.com
├── /                          Home — live player, now playing, personalized rail
├── /listen                    All streams (main, HD2, HD3, podcasts, restreams)
├── /shows                     Schedule, hosts, episode archive
│   └── /shows/[slug]
├── /hosts/[slug]              Host profile (auto-wiki enriched)
├── /artists/[slug]            Artist profile (auto-wiki enriched)
├── /events                    Calendar + event detail + RSVP
├── /places                    Directory — map, list, categories
│   └── /places/[slug]         Place profile (hours, menu, reviews, check-in)
├── /deals                     Marketplace storefront
│   ├── /deals/merch
│   ├── /deals/tickets
│   └── /deals/experiences
├── /wiki                      The LLM wiki — search, recent, trending
│   └── /wiki/[slug]           Article (entity page, sourced, editable)
├── /earn                      How points work, challenges, leaderboard
├── /my                        Authenticated dashboard (points, history, saved, orders)
└── /studio                    Creator/staff tools (editor, uploads, admin)
```

The left sidebar persists in `/my`, the player persists everywhere. The wiki is cross-linked from every entity page automatically.

---

## 3. Pillar 1 — Restream

### 3.1 Goal
Ingest the WCCG master stream once, distribute it to the web, mobile, Alexa/Google, TuneIn, Radio Garden, a Discord bot, YouTube Live, Twitch, and partner embeds — without the on-air team doing anything different.

### 3.2 Requirements
- **Ingest:** Icecast/Shoutcast source from the studio (already mocked in `packages/integrations`). Support Centova as a fallback control panel.
- **Transcode fan-out:** A restream worker (FFmpeg in a BullMQ job) produces: `aac-64k`, `aac-128k`, `mp3-128k`, `opus-96k`, HLS (`.m3u8` + fMP4 segments), and a low-latency LL-HLS variant.
- **Destinations (MVP):**
  - Web player (HLS + MSE fallback to MP3 progressive)
  - Mobile (native HLS)
  - RTMP push to YouTube Live and Twitch (audio-only with branded visualizer frame)
  - Discord voice channel (bot in a WCCG server)
  - TuneIn + Radio Garden feeds (passive — directory listing kept current)
- **Metadata:** Icecast ICY title parsing + a `NowPlaying` event bus (Supabase Realtime channel `now_playing`) so every surface updates within 500 ms of a track change.
- **Programmatic ad insertion:** SSAI pipeline stub — cue points from the traffic log (`/my/admin/traffic/log`) drive spot replacement on digital-only streams for geo-targeting.
- **Resilience:** Auto-failover to a backup URL if the primary ingest drops. 30-second rolling DVR buffer on the web player ("rewind live").

### 3.3 Non-goals (MVP)
- Video restream beyond the branded audio frame.
- User-generated restreaming (creators-as-stations) — deferred to Phase 4.

### 3.4 Key data
```
streams(id, slug, name, source_url, codec, bitrate, status, is_primary)
stream_destinations(id, stream_id, kind, target_url, credentials_ref, status)
now_playing(stream_id, track_id, started_at, artist, title, album, artwork_url)
```

### 3.5 Acceptance
- Play button on `/` plays within 1.5 s on a 10 Mbps connection.
- Navigating to any route does not interrupt audio.
- A track change in the studio is reflected on all surfaces in < 1 s.
- Killing the primary ingest container triggers failover without a listener-visible gap > 3 s.

---

## 4. Pillar 2 — Listen & Earn

### 4.1 Economy design

**Unit:** WCCG Points (WP). Non-redeemable for cash. Expire 12 months after issuance (rolling).

**Earning rates (starting values, tunable):**

| Action | WP | Cap |
|--------|-----|-----|
| Minute of verified listening | 1 WP / min | 240 WP / day |
| Daily check-in | 25 WP | 1× / day |
| Check-in at a WCCG Place | 50 WP | 3× / day, distinct places |
| Review a place (photo + 20+ chars) | 100 WP | 5× / week |
| RSVP an event | 20 WP | once per event |
| Attend an event (QR scan) | 200 WP | once per event |
| Read a wiki article (>30 s dwell) | 10 WP | 100 WP / day |
| Refer a friend who activates | 500 WP | unlimited |
| Contest win | variable | per contest |

**Anti-fraud:**
- Listening verified with heartbeat pings every 30 s containing a signed JWT; only counted when the tab is visible/audible and the player reports `playing` state.
- Geo-fenced check-ins (100 m radius) using a signed POST from the client + server-side haversine check.
- Device fingerprint + IP velocity limits to stop farming.

### 4.2 Data model

```sql
point_accounts(user_id pk, balance int, lifetime_earned int, lifetime_spent int)
point_events(id, user_id, kind, delta int, reason, ref_type, ref_id, created_at)
listening_sessions(id, user_id, stream_id, started_at, ended_at, verified_minutes int, points_awarded int)
daily_caps(user_id, day, kind, count)
```

Points are **always** represented as an append-only ledger. Balance is a projection derived from `point_events`. No direct writes to `balance`.

### 4.3 UI surfaces
- Persistent "X WP earned today" chip in the player.
- `/earn` — explanation, daily streak, weekly/monthly challenges.
- `/my/points` — balance, ledger, upcoming expirations, pending.
- `/leaderboard` — weekly, monthly, all-time (opt-in privacy).

### 4.4 Acceptance
- A listener with the tab active and audio playing accrues WP within 1% of the expected rate over a 30-minute test.
- Closing the tab stops accrual within one heartbeat cycle.
- The ledger reconciles to the balance in every unit test and nightly cron.

---

## 5. Pillar 3 — Marketplace

### 5.1 Storefront
- **Categories:** Merch (station swag + partner artists), Tickets (station events + local venue partners), Experiences (studio tours, meet-and-greets, on-air shout-outs), Local Deals (redeemable at Places).
- **Pricing model:** Each product has an optional `cash_price` (USD) **and** a `points_price` (WP). Checkout supports cash-only, points-only, or a split (configurable per product, e.g., "50% off if you pay 1000 WP + $10").
- **Inventory:** Variants (size/color), stock tracking, per-SKU caps, lottery-style drops for high-demand items.
- **Fulfillment:** Shippable (Shippo/EasyPost integration), pickup at studio, digital delivery (codes/QRs), on-premise redemption at Places (QR scanned by vendor).

### 5.2 Data model
```
products(id, slug, kind, title, description, brand_id, cash_price_cents, points_price, stock, status)
product_variants(id, product_id, name, sku, stock, cash_price_cents, points_price)
orders(id, user_id, status, total_cash_cents, total_points, fulfillment_kind, address_id)
order_items(id, order_id, product_variant_id, qty, cash_cents, points)
redemptions(id, order_item_id, place_id, qr_code, redeemed_at, redeemed_by_user_id)
```

### 5.3 Vendor side
Local merchants get a lightweight vendor console at `/my/vendor` (extend existing `creators` routing pattern) to:
- List products & deals
- Scan redemption QRs with a web camera
- View settlement reports (WCCG invoices the vendor monthly for points redeemed, vendors settle back in cash at a configured rate — e.g., 1000 WP = $10 vendor invoice)

### 5.4 Acceptance
- A listener with 5000 WP can complete a points-only checkout for a $20 merch item in under 4 interactions from the product page.
- A vendor can scan a redemption QR in < 2 s and see "Approved — $X credited" feedback.
- Orders reconcile to both the `point_events` ledger and Stripe dashboard in a nightly report.

---

## 6. Pillar 4 — Places Directory

### 6.1 Scope
The definitive local directory for the WCCG footprint (Chicago + near-south suburbs to start). Categories: **Eat & Drink, Live Music, Shops, Services, Parks & Outdoors, Family, Nightlife, Community.**

### 6.2 Features
- **Map-first landing** at `/places` — Mapbox GL (or MapLibre if licensing is tight) with clustered pins, filter chips, and a slide-up list.
- **Place profile** — hero image, hours, current open/closed state, phone, menu (if applicable), live events happening there, photo gallery, reviews, WCCG connection ("Featured on The Morning Show 2026-03-14").
- **Check-in** — geo-fenced, earns points, posts to `/my/history`. Streaks for repeat visits.
- **Lists & collections** — editorial ("WCCG's 25 Best Tacos"), user-built, host-curated.
- **Claim-your-place flow** — business owners verify ownership, become vendors, list deals, appear in the marketplace.

### 6.3 Data ingestion
- **Seed:** Licensed Foursquare/OpenStreetMap import for the footprint, filtered and de-duped.
- **Enrichment (autonomous):** The Auto-Research agent (Pillar 6) fills gaps — hours, description, top dishes, accessibility, wiki backlinks — on a rolling schedule.
- **Moderation:** Human-in-the-loop queue at `/studio/places/moderation` before agent-written changes go live.

### 6.4 Data model
```
places(id, slug, name, category, subcategory, lat, lon, address_json, phone, website,
       hours_json, price_tier, claimed_by_user_id, wiki_slug, cover_url, status)
place_photos(id, place_id, url, attribution, source)
place_reviews(id, place_id, user_id, rating smallint, body, photo_urls[], created_at)
place_check_ins(id, place_id, user_id, lat, lon, created_at, points_awarded)
place_hours(place_id, day_of_week, open, close, is_closed)
```

### 6.5 Acceptance
- 2,000+ seeded places at launch, 500+ with agent-enriched profiles above a quality threshold (see §8.4).
- Check-in roundtrip (tap → confirmation → points) < 1.5 s.
- Claimed places can update their hours in < 30 s from vendor console.

---

## 7. Pillar 5 — Living Knowledge (LLM Wiki + Auto-Research + Obsidian)

This is the most novel pillar and the one that differentiates WCCG from any other station.

### 7.1 The three layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: /wiki — public, read-only, rich UI                │  ← listeners
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Obsidian vault (git-synced Markdown)              │  ← staff, you
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Auto-Research Agent + LLM Wiki writer             │  ← agents
└─────────────────────────────────────────────────────────────┘
```

**The vault is the source of truth.** Every wiki article is a Markdown file in an Obsidian vault (`D:\wccg-obsidian\` locally, mirrored to a private GitHub repo `wccg/knowledge`). The web `/wiki` renders from that vault. The agent writes *into* the vault, gated by a review PR.

This gives you:
- Full offline editing in Obsidian with backlinks, graph view, canvases.
- Human-authored notes mixed with agent-authored ones, clearly labeled.
- Git history as the edit trail.
- A single memory substrate shared by humans **and** agents.

### 7.2 The entity catalog

Every "thing" the platform knows about gets an Obsidian note with a standardized frontmatter:

```yaml
---
id: artist/kendrick-lamar
type: artist            # artist | host | show | event | place | track | genre | topic
slug: kendrick-lamar
aliases: [K.Dot, King Kendrick]
sources:
  - url: https://...
    fetched_at: 2026-04-18T14:22:10Z
    agent: auto-research-v1
confidence: 0.92         # 0–1 agent confidence score
last_researched: 2026-04-18
needs_review: false
wiki_status: published   # draft | in_review | published | archived
---
```

The body is Markdown with wiki-links (`[[artist/andre-3000|André 3000]]`) and citation footnotes (`[^1]`). The renderer resolves links to `/wiki/<slug>` URLs and renders footnotes as source cards.

### 7.3 The Auto-Research Agent (Karpathy-inspired)

Inspired by Andrej Karpathy's "LLM OS" and deep-research agent patterns. The agent is a small, auditable program — not a mystery box.

**Architecture:**

```
scheduler ─► task_queue (Postgres) ─► research_worker (BullMQ)
                                          │
                                          ▼
                              ┌──── plan (LLM, outline) ────┐
                              ▼                              │
                        search / browse tools                │
                              │                              │
                              ▼                              │
                         extract & dedupe                    │
                              │                              │
                              ▼                              │
                       draft (LLM, cites sources)            │
                              │                              │
                              ▼                              │
                      self-critique + revise ◄──── critic LLM
                              │
                              ▼
                   write to vault as branch + PR
                              │
                              ▼
                   human review UI (/studio/wiki/queue)
                              │
                              ▼
                         merge → publish
```

**Key choices:**
- **Tool-using Claude agent** (Anthropic SDK, Sonnet 4.6 by default, Opus 4.7 for long-context syntheses). Tools: `web_search`, `web_fetch`, `vault_read`, `vault_search`, `vault_propose_edit`, `image_caption`.
- **Prompt caching on** for the system prompt, the style guide, and the current vault excerpt — this is the cost difference between "sustainable" and "bankrupt" at scale.
- **Every claim must cite a source** that was actually fetched in this run (hash-matched to the `sources/` table). No source → no claim. This is the single most important rule in the agent prompt.
- **Self-critique pass** uses a separate LLM call with the prompt: "Find every claim in this draft that is not supported by the cited sources. Output a list." The agent loops until the critic returns an empty list or the budget is exhausted.
- **Confidence score** is a calibrated average of the critic's per-claim scores. Articles below 0.7 require human review; above 0.9 can auto-merge for non-sensitive entity types (e.g., genres) but never for people.

**Trigger conditions:**
- **New entity detected** (artist first played, new place seeded, new host hired) → schedule initial research within 10 min.
- **Staleness** (entity not researched in 90 days) → nightly batch re-research.
- **On-demand** from staff in `/studio/wiki/queue` (a "research this now" button).
- **Pull-based** from the wiki reader: if a page has fewer than N paragraphs or confidence < 0.6, show a "Research this page" button that enqueues a job.

### 7.4 Obsidian integration (the memory substrate)

- **Vault path:** configurable via `WCCG_VAULT_PATH`. Dev default `D:\wccg-obsidian\`.
- **Sync:** a `vault-sync` worker uses `simple-git` to pull/push every 5 minutes; LFS for images.
- **Editing:**
  - Staff edit in Obsidian directly. Commits sync up.
  - The agent never writes to `main` — it always opens a branch `auto/<entity-slug>-<timestamp>` and a PR.
  - The web renderer serves from `main` with a 60 s stale-while-revalidate cache.
- **Backlinks & graph:** the renderer builds the backlink index at build time (or on-demand via a materialized Postgres view `vault_links(source_slug, target_slug)`).
- **Memory for agents:** agent prompts include a compressed vault summary (top-level index + the current entity's note + direct backlinks) — this *is* the long-term memory. No separate vector DB required for MVP; we use Postgres full-text + pgvector on note embeddings for retrieval.

### 7.5 The public `/wiki` surface
- **Entity page:** hero (image + canonical facts), body, "On WCCG" sidebar (last played, upcoming show, related events), sources, backlinks, "last researched" timestamp.
- **Search:** hybrid — BM25 (Postgres FTS) + semantic (pgvector). Instant results with query suggestions.
- **Feedback:** "This is wrong" button opens an issue in the knowledge repo tagged with the slug.
- **Trust signals:** confidence badge, source count, "reviewed by [human]" badge when applicable.

### 7.6 Acceptance
- Playing a track by an artist with no existing article triggers a wiki page that becomes readable (draft status) within 10 minutes.
- Every paragraph on a published page has at least one citation that resolves to an actual URL in the sources table.
- A staff edit in Obsidian appears on `/wiki` within 10 minutes (sync interval + cache).
- The critic agent rejects ≥ 95% of deliberately hallucinated claims in a held-out eval set.

---

## 8. Cross-cutting concerns

### 8.1 Auth & accounts
- Supabase Auth (already in use). Email+password, Google, Apple.
- Roles: `listener`, `creator`, `vendor`, `host`, `staff`, `admin`, `gm`. Existing routing under `/my/admin` and `/my/sales` already assumes this.
- Profiles: display name, avatar, location (coarse for geo-fencing), favorites, privacy toggles.

### 8.2 Notifications
- Web Push (VAPID), email (Resend), in-app center at `/my/notifications`.
- Event types: now-playing-favorite, points-milestone, order-status, event-reminder, new-wiki-on-watched-entity.

### 8.3 Observability
- OpenTelemetry traces (NestJS) + Sentry (web + API).
- Grafana dashboards for: concurrent listeners, minutes streamed, WP issued vs. spent, wiki pages published, agent cost per day.
- Per-agent-run log bundle stored in object storage, linked from the review UI.

### 8.4 Quality & safety gates
- **Content safety:** every agent draft runs through a moderation check before entering the review queue.
- **Legal:** sources are stored with `fetched_at`, `url`, and a content hash; robots.txt respected; wiki articles quote ≤ 10% of any single source and always link back.
- **Bias audit:** monthly sample of 50 agent drafts reviewed against an editorial rubric (tone, representation, accuracy). Results logged in the vault under `/audits/`.

### 8.5 Performance budgets
- Home LCP ≤ 2.0 s (p75, 4G).
- Player time-to-first-audio ≤ 1.5 s.
- Wiki article render ≤ 800 ms.
- API p95 ≤ 250 ms.
- Agent run p50 ≤ 90 s, p95 ≤ 5 min per entity, ≤ $0.15 per run (with caching).

### 8.6 Cost envelope (LLM agents)
- Budget: start at $500/month, cap at $2,000/month.
- Controls: per-entity-type priority queue, cache-hit-rate alarm < 70% fires an alert, nightly cost report to staff.

---

## 9. Technology choices

| Area | Choice | Reason |
|------|--------|--------|
| Web | Next.js 16, React 19, TS 5 | Already in place, App Router suits the IA. |
| UI | Tailwind + Radix primitives + custom design system in `packages/ui` | Fast to build, accessible by default. |
| API | NestJS 11 | Already in place; structured DI for agent tooling. |
| DB | Postgres via Supabase; Prisma (introspection) | Already in place. |
| Realtime | Supabase Realtime | Now-playing, check-in echoes. |
| Queue | BullMQ + Redis | Restream transcode, agent runs, vault sync. |
| Audio | HLS.js in the browser; FFmpeg in workers | Standard stack. |
| Maps | MapLibre GL + OSM tiles (self-hosted) | Cost; Mapbox as upgrade path. |
| Search | Postgres FTS + pgvector | One dependency to run; fine at this scale. |
| Agents | Anthropic SDK (Claude Sonnet 4.6 default, Opus 4.7 for synthesis) with prompt caching enabled | Quality, tool-use maturity, cost with caching. |
| Knowledge | Obsidian vault in Git (LFS for images) | Human + agent shared substrate. |
| Payments | Stripe + Stripe Connect for vendors | Standard, well-supported. |
| Media | Cloudflare R2 + Images | Cheap egress, on-the-fly transforms. |

---

## 10. Phased roadmap

### Phase A — Foundations (Weeks 1–4)
- Solidify auth, profiles, persistent player, design system tokens in `packages/ui`.
- Migrations for `streams`, `now_playing`, `point_accounts`, `point_events`, `places` core tables.
- Ship restream MVP: web player + HLS fan-out + now-playing bus.
- Ship listening ledger + minute-of-listening earning + `/my/points`.
- **Exit criteria:** a listener can create an account, play the stream, earn points, see the ledger, and navigate the app without audio dropping.

### Phase B — Economy & Places (Weeks 5–10)
- Marketplace v1: merch + tickets, cash+points checkout, Stripe live.
- Places directory v1: seeded import, map page, profile pages, check-ins.
- Vendor console v1: list deals, redeem QR.
- **Exit criteria:** a listener can earn points Monday, spend them on a concert ticket Tuesday, redeem the QR at the door Saturday.

### Phase C — Living Knowledge (Weeks 11–18)
- Obsidian vault + git-sync worker.
- `/wiki` renderer (SSR from vault, backlinks, search).
- Auto-Research agent v1 (plan → search → draft → critic → PR).
- Staff review queue at `/studio/wiki/queue`.
- Trigger integration with `now_playing` and `places` seeding.
- **Exit criteria:** 500+ published wiki articles, 70% of now-played artists have a live article within 24 h of first play, hallucination eval passes ≥ 95%.

### Phase D — Restream expansion, polish, launch (Weeks 19–24)
- Restream destinations: YouTube Live, Twitch, Discord bot.
- SSAI stub with one real geo-swap campaign.
- Mobile PWA polish (install prompts, background audio, notifications).
- Accessibility audit + remediation.
- Performance budgets hit on p75 devices.
- Marketing launch.

### Phase E+ (post-launch)
- Creator streams (user-run channels).
- Video restream.
- "Ask the wiki" conversational surface (grounded RAG chat).
- Partner API for other local stations to license the wiki + places infra.

---

## 11. Success metrics

**Listener:**
- MAU, WAU, DAU.
- Average session length (audio minutes/session).
- 30-day retention of new signups.
- Points earned per DAU per week.

**Economy:**
- Points issued ÷ points spent ratio (target 1.2–1.8 — enough inventory to spend but not a runaway).
- Marketplace GMV (cash + WP valued at $0.01/WP).
- Vendor redemption rate.

**Knowledge:**
- Published articles total.
- Articles with confidence ≥ 0.9.
- Mean time from first-play to published article.
- Wiki pageviews per session.
- Hallucination eval pass rate.

**Places:**
- Check-ins per DAU.
- Claimed-business count and % of listed.
- Review count and median quality score.

**Product health:**
- p75 LCP on home.
- Audio stall rate (stalls/hour/listener).
- Agent $/article and cache-hit-rate.

---

## 12. Open questions

1. **Obsidian vault hosting** — private GitHub vs. self-hosted Gitea? GitHub is easier; self-hosted protects IP if partners license the knowledge.
2. **Points expiration** — 12 months feels right but may need tuning once real data exists. Start 12, instrument carefully.
3. **Wiki licensing** — CC BY-SA 4.0 for user-visible content vs. proprietary for partner licensing? Likely dual-license.
4. **Vendor settlement rate** — 1000 WP = $10? Validate with 3 pilot vendors before opening the vendor program.
5. **Karpathy-style "LLM OS" depth** — how much of the agent do we expose to staff (trace viewer, prompt editor, eval runner)? Phase C could ship a minimal trace viewer; a full "agent workbench" is a Phase E item.
6. **Editorial voice** — WCCG has an existing on-air brand. The wiki needs a written style guide before the agent can reliably match tone. Owner: editorial lead, due end of Phase A.

---

## 13. Out of scope (explicit non-goals)

- Generic social network features (DMs, follow graph beyond follow-an-entity).
- A full CMS competing with WordPress — the wiki is the only long-form system.
- Rebuilding the existing admin/traffic/sales/GM portals (they are already under `/my/admin/*`; they continue as-is).
- Rebuilding the audio editor (covered by the separate PRD at [docs/PRD-audio-editor-completion.md](docs/PRD-audio-editor-completion.md)).

---

## 14. Appendix — what changes in the repo

| Area | Change |
|------|--------|
| `apps/web` | New routes: `/wiki/**`, `/places/**`, `/deals/**`, `/earn`. Refactor home to new hero player. |
| `apps/api` | New modules: `restream`, `points`, `places`, `marketplace`, `wiki`, `agents`. |
| `apps/workers` | New queues: `restream-transcode`, `vault-sync`, `auto-research`, `place-enrich`. |
| `packages/db` | Migrations per §3.4, §4.2, §5.2, §6.4, §7.2. |
| `packages/ui` | Design tokens finalized; Player, PointsChip, PlaceCard, WikiArticle, SourceCard primitives. |
| `packages/integrations` | Real Stripe, Resend, Mapbox/MapLibre, Anthropic, Shippo clients. |
| `packages/knowledge` *(new)* | Obsidian vault adapter, frontmatter parser, link resolver, agent tools. |
| New repo `wccg/knowledge` | The Obsidian vault itself. |

---

**End of PRD.** Review, mark up, or push back — then we break Phase A into tickets.
