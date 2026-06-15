# WCCG 104.5 FM — Micro-Network, Sales Portal & Points PRD (loop-driven)

The platform's **internal user micro-network** (role-based hub feeds + follows + reels),
the **sales portal**, and the **points/rewards** system — specced for autonomous
completion by `/loop`. Same operating model as `BUILD-BACKLOG-PRD.md`.

State as of 2026-06-15 (from a full audit):
- **Feed** (`hub_posts`/`hub_post_likes`, `components/social/hub-feed.tsx`): text + likes + *linked* media (YouTube/URLs) work; **no file upload, no post-media bucket** — images/videos/PDFs can't be shared, only linked.
- **Sales** (`/my/sales/**`, `/advertise/portal/**`): staff CRM (`crm_clients`) is real; the sales **dashboard is localStorage + mock seed**, advertiser portal is mostly **mock UI**, `production_orders` has a table but no UI, **no end-to-end lead→quote→order→invoice flow**.
- **Points** (`user_points`, `points_history`, `reward_catalog`, `points_rules`; `/my/points`, `/rewards`): earn→balance→redeem works, leaderboard live; but **localStorage-primary** (balances can drift), earning is **hardcoded not rules-driven**, **no reward/rules admin UI**.

## How the loop operates (read every iteration)
1. Pick the highest-priority `☐ TODO [AUTO]` item (order P1→P2→P3).
2. Implement fully against its **Acceptance**, following the Platform rules below.
3. DB work: `apply_migration` via Supabase MCP → mirror to the next numbered file in `supabase/migrations/` (next after 075).
4. Frontend: `cd apps/web && npm run build`, fix all errors. Batch frontend items into shared build+deploy where sensible.
5. Commit + push to `main`, watch the GitHub Actions deploy to green (head_sha poll via `git credential` token, ~10-13 min, cancel-in-progress is fine), verify live on https://app.wccg1045fm.com.
6. Mark `☑ DONE` with a one-line note + commit SHA; append discoveries. Flip to `⛔ BLOCKED` with the exact question if an item needs a decision/credential, and skip.
7. Stop when no `☐ TODO [AUTO]` remain; summarize shipped vs. blocked.

## Platform rules (non-negotiable)
- **No API server** — Supabase-direct from the browser; supabase-js never throws (check `{ error }`).
- **RLS on every new table.** Public-insert tables use a narrow `with check`; private reads gate on `public.is_staff()` / owner via `djs.user_id`/`auth.uid()`. Use `(select auth.uid())` in policies (initplan perf).
- **Static export** (`output: 'export'`): client pages only; dynamic routes use `_placeholder` + `usePathname()`.
- **Strict TS + ESLint** (no unused imports/vars); `react-hooks/set-state-in-effect` — setState only in async callbacks behind a `let active = true` guard.
- Match surrounding style. On-pattern references: storage upload `app/(main)/my/dj/page.tsx`; RLS owner pattern `migrations/075`; edge-fn + trigger `notify-booking` + `074`; staff console `my/admin/dj-bookings/page.tsx`.

---

## P1 — Micro-network: share images / videos / PDFs in the feed

### ☑ DONE M1 — Post-media storage bucket + schema
_Done 2026-06-15: migration **076_post_media** — public `post-media` bucket + 4 storage RLS policies (public read; owner-folder `<uid>/` insert/update/delete) + `hub_posts.media_type` (image|video|pdf) and `media_paths text[]`. Verified live (cols present, bucket public, 4 policies). Backend-only; mirror committed next push._
- **Why:** the composer can't attach files; `hub_posts.media_url` is unsettable and there's no bucket.
- **Scope:** migration: create a **public** `post-media` storage bucket; RLS — authenticated users INSERT to their own `auth.uid()/...` folder, public READ, owner DELETE. Add columns to `hub_posts`: `media_type text` (check in image|video|pdf|null) and `media_paths text[]` (support up to ~4 attachments; keep `media_url` working for legacy/links).
- **Acceptance:** an authenticated user can upload to `post-media/<uid>/...`; a second user cannot write there; rows store media_type + paths. Mirror migration to repo.
- **Files:** `supabase/migrations/076_post_media.sql`.

### ☑ DONE M2 — Composer upload (images/videos/PDFs)
_Done 2026-06-15: hub-feed composer now has an Attach button + hidden file input (accept image/*,video/*,application/pdf, ≤4 files, ≤100MB video / ≤25MB else), file chips with image previews + remove, uploads each to `post-media/<uid>/<ts>/...`, inserts hub_posts with media_paths[] + coarse media_type (video>image>pdf), and allows posting with files even when text is empty. Honest error surfacing. Batched with M3._
- **Why:** users need to attach files when posting.
- **Scope:** in `components/social/hub-feed.tsx`, add a file picker + drag-drop to the composer accepting `image/*,video/*,application/pdf` (cap count + size, e.g. ≤4 files, video ≤100 MB). Upload to `post-media/<uid>/<postdraft>/...` via supabase storage, then insert the `hub_posts` row with `media_type` + `media_paths`. Show thumbnails/preview + remove-before-post. Keep existing link/YouTube behavior.
- **Acceptance:** a user attaches an image, a video, and a PDF, posts, and the row persists with the files in the bucket; errors are surfaced honestly; no PII/security regressions.
- **Files:** `components/social/hub-feed.tsx` (+ a small upload helper if needed).

### ☑ DONE M3 — Render attached media in the feed + reels
_Done 2026-06-15: feed renders each `media_paths` entry by inferred kind — images (grid, lazy), `<video controls>`, and PDF download cards — via getPublicUrl. `hub-reels.tsx` now also merges community video posts (hub_posts media_type='video') into the reel column, mapped to the reel shape, with likes routed through `hub_post_toggle_like` for post-reels. Build passes._
- **Scope:** render `media_paths` by `media_type` — images in a responsive grid/lightbox, `<video controls>` for video, and a PDF as an inline card (icon + filename + open/download via public URL). Update `hub-reels.tsx` to include video posts. Lazy-load; getPublicUrl (no signing).
- **Acceptance:** image/video/PDF posts display correctly in the feed (and video in reels), on mobile + desktop.
- **Files:** `components/social/hub-feed.tsx`, `components/social/hub-reels.tsx`.

---

## P2 — End-to-end sales portal (sell airtime, sponsorships, production, DJ/events)

### ☑ DONE SP1 — Sales data model + seed catalog
_Done 2026-06-15: migration **077_sales_portal** — `sales_products` (rate card) + `sales_deals` + `sales_deal_items`, staff-only RLS (`(select public.is_staff())` for initplan perf), FK-covering + status indexes, `updated_at` trigger; seeded **16 products (4 per category)**. Applied live + verified (16 rows, RLS on all 3 tables, 3 policies). File mirrored to repo._
- **Why:** there's no unified products/deals model; the dashboard is localStorage/mock.
- **Scope:** migration creating:
  - `sales_products` — id, category (check in `ad_spot`|`sponsorship`|`production`|`dj_event`), name, description, unit (e.g. spot, week, month, package, hour, event), unit_price numeric, is_active, created_at. (This is the **rate card**.)
  - `sales_deals` — id, client_id → `crm_clients`, associate_id → auth user, title, status (check in `lead`|`quoted`|`won`|`lost`|`invoiced`|`paid`), notes, subtotal numeric, created_at, updated_at.
  - `sales_deal_items` — id, deal_id → sales_deals (cascade), product_id → sales_products (set null), description, qty int, unit_price numeric, line_total numeric.
  - RLS: SELECT/INSERT/UPDATE for `public.is_staff()` (sales/admin); no public access. Indexes on deal status + client.
  - Seed ~3–4 starter `sales_products` per category (12–16 rows) so the portal isn't empty.
- **Acceptance:** tables + RLS live; staff can read; anon cannot; seed catalog present across all 4 categories. Mirror migration.
- **Files:** `supabase/migrations/077_sales_portal.sql`.

### ☑ DONE SP2 — Sales dashboard → Supabase-direct (kill localStorage/mock)
_Done 2026-06-15: `/my/sales/page.tsx` rewritten Supabase-direct — Overview stats (open deals, won revenue, clients, pending invoices) computed from `sales_deals` + `crm_clients`; Recent Deals table from real deals; Clients tab now reads real `crm_clients` (search + per-client open/total deal counts + new-deal link). All `loadOrSeed`/`SEED_*` localStorage + mock removed; honest loading/empty states. Batched deploy with SP3._
- **Why:** `/my/sales/page.tsx` runs on `loadOrSeed()` localStorage + `SEED_*` mock data.
- **Scope:** rewrite the dashboard to read real data: pipeline counts by status, monthly revenue (sum of won/invoiced/paid deals), client count (`crm_clients`), pending invoices — all from Supabase. Remove the seed/localStorage path. Keep the existing visual layout/warm header.
- **Acceptance:** dashboard stats reflect real `sales_deals`/`crm_clients`; no localStorage seed; empty states are honest.
- **Files:** `app/(main)/my/sales/page.tsx` (+ remove/retire its seed module).

### ☑ DONE SP3 — Deal builder + pipeline
_Done 2026-06-15: `/my/sales/deals/page.tsx` — kanban pipeline by status (lead→quoted→won→invoiced→paid + lost, with per-column count + sum) + modal deal builder: pick or create a `crm_client` inline, add line items from the rate-card catalog (category-grouped picker prefills description + unit_price; qty/price editable; Custom line supported), live `line_total` + deal subtotal, status select, notes; associate = `auth.uid()`. Supabase-direct CRUD — create/update (edit re-writes items), cascade delete. Reads `?id`/`?client` from the URL (dashboard deep-links). Batched build+deploy with SP2 + the 077 mirror + the Mix Squad hero._
- **Scope:** a deals pipeline page (list/kanban by status) + a deal editor: pick/create a `crm_client`, add line items from the `sales_products` catalog (choose product → qty → unit_price defaults from catalog, editable), auto-compute line_total + deal subtotal, set status. Associate = current user. Supabase-direct CRUD with RLS.
- **Acceptance:** an associate creates a deal for a client, adds mixed line items (an airtime package + a sponsorship + a production service + a DJ/event), totals compute, status advances lead→quoted→won; persists + reloads correctly.
- **Files:** `app/(main)/my/sales/deals/page.tsx` (+ editor component); link from the dashboard.

### ☑ DONE SP4 — Quote/proposal view + invoice generation
_Done 2026-06-15: migration **078_sales_invoices** — `sales_invoices` + snapshotted `sales_invoice_items` (immutable record), sequence-based `INV-YYYY-####` numbers, staff RLS + portal-client read via `crm_clients.portal_user_id`. `/my/sales/invoices` rewritten Supabase-direct — generate an invoice from a won deal (snapshots line items, advances deal→invoiced), mark-paid (flips invoice + deal→paid); all localStorage/mock removed. New `/my/sales/quote` printable doc (`?deal=` quote / `?invoice=` invoice) with print-only CSS + station branding; deal editor links to it. `/advertise/portal/invoices` rewritten to show the client's REAL `sales_invoices` (read-only, printable) via the portal-client RLS — replaced the dsp-campaign synthetic invoices + mock fallback + local-only paid toggle. Emailing stays ⛔ on RESEND_API_KEY. Build green._
- **Scope:** a printable quote/proposal view for a deal (client + line items + totals + station branding). On `won`→`invoiced`, generate an invoice (reuse line items; invoice number, issue/due date, status unpaid|paid) — replace the **mock** `/advertise/portal/invoices` + `/my/sales/invoices` with real data; allow mark-paid (→ deal `paid`). Store invoices in a table (extend SP1 migration or a new `078_sales_invoices.sql`).
- **Acceptance:** a won deal produces an invoice with correct line items + total; invoice list reads real data; mark-paid flips deal + invoice status; printable quote renders.
- **Files:** migration for invoices; `app/(main)/my/sales/invoices/page.tsx`, quote/proposal view, retire mock invoice data.

### ☑ DONE SP5 — Rate-card admin
_Done 2026-06-15: `/my/sales/rate-card` — staff CRUD over `sales_products`, grouped by category. Add/edit (category, name, description, unit, unit_price), activate/deactivate (deactivated products drop out of the deal-builder catalog, which filters `is_active`). Supabase-direct, staff-RLS gated; the dashboard "Rate Card" quick action links here. No migration (uses the 077 table). Build green; shipped with SP4's deploy batch._
- **Scope:** a page for sales/admin to manage `sales_products` (add/edit/deactivate, set unit_price) — the rate card behind the deal builder. Supabase-direct, staff-gated.
- **Acceptance:** staff add/edit a product + price; it appears in the deal builder catalog; non-staff can't access.
- **Files:** `app/(main)/my/sales/rate-card/page.tsx`.

---

## P3 — Points/rewards: make it work end-to-end (server-authoritative)

### ☐ TODO [AUTO] PT1 — Server-authoritative `award_points` RPC
- **Why:** earning is localStorage-primary → balances drift; not trustworthy.
- **Scope:** a `SECURITY DEFINER` RPC `award_points(p_amount int, p_reason text, p_description text)` that atomically inserts `points_history` + upserts `user_points.balance` for `auth.uid()`, with per-reason cooldown/threshold honored from `points_rules` where applicable. Client uses the RPC as the source of truth; localStorage becomes a display cache only (reconcile from server on load).
- **Acceptance:** earning an event writes a `points_history` row + updates `user_points` server-side; refreshing in another browser shows the same balance; redeem (existing `redeem_reward`) still works against the server balance.
- **Files:** `supabase/migrations/079_award_points_rpc.sql`; `lib/points-storage.ts`/`points-sync.ts`/`hooks/use-listening-points.ts`.

### ☐ TODO [AUTO] PT2 — Rules-driven earning + seed rules
- **Scope:** drive earn amounts from `points_rules` (trigger_type, points_amount, threshold, cooldown_minutes) instead of hardcoded constants; seed the active rules (listening-minute, daily-streak, event-checkin, signup-bonus, purchase). The `award_points` RPC (PT1) reads the rule for the trigger.
- **Acceptance:** changing a rule's `points_amount` changes what users earn (no code change); seeded rules cover the existing earn triggers.
- **Files:** `supabase/migrations/080_seed_points_rules.sql`; earn call sites.

### ☐ TODO [AUTO] PT3 — Reward + rules admin UI
- **Scope:** a staff page to CRUD `reward_catalog` (name, description, image, points_cost, stock, category, active) and view/edit `points_rules`. Replace any hardcoded "arcade" demo fallback with real catalog rows.
- **Acceptance:** staff add a reward → it appears on `/rewards`; staff edit a points rule → earning reflects it; non-staff can't access the admin page.
- **Files:** `app/(main)/my/admin/points/page.tsx`; `components/rewards/*` (drop demo fallback).

---

## ✅ Done
- **Streaming → Stream** main-nav rename — `layout.tsx` (commit d415d55, deployed 2026-06-15).

## ⛔ BLOCKED / owner decisions (loop: surface, do NOT attempt)
- **[USER] RESEND_API_KEY** — set it (Supabase → Edge Functions → Secrets) so any sales **invoice/quote emails** (and the booking/drop/sync emails) actually send. SP4 emailing is optional until then.
- **[USER] Invoice PDFs / payment processing** — does SP4 need real PDF export and/or online payment (Stripe)? Default: on-screen printable quote + manual mark-paid (no payment gateway) unless you say otherwise.
- **[USER] Tiering** — points tiers/levels (bronze/silver/gold + perks)? Not in scope unless requested.
- Carry-overs from `BUILD-BACKLOG-PRD.md`: U1–U7, E3 (DJ social columns).
