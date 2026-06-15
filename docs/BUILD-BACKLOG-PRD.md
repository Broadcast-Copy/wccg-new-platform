# WCCG 104.5 FM — Build Backlog PRD (loop-driven)

This is the working backlog for finishing the platform. It is written to be
consumed by an autonomous `/loop`: each iteration picks the top **☐ TODO +
AUTONOMOUS** item, builds it end-to-end, ships it, checks it off, and moves on.

## How the loop operates (read every iteration)

1. Pick the **highest-priority** item that is `☐ TODO` **and** tagged `[AUTO]`.
   Skip anything `⛔ BLOCKED` or `[USER]` (those need the owner — surface them, don't attempt).
2. Implement it fully against its **Acceptance** criteria.
3. **Build** (`cd apps/web && npm run build`), fix any errors, then **commit**
   + **push to `main`**, **watch the GitHub Actions deploy to green**, and
   **verify live** on https://app.wccg1045fm.com.
4. Mark the item `☑ DONE` with a one-line note + commit SHA. Append anything new you discover.
5. If an item turns out to need a decision/credential/dashboard action, flip it
   to `⛔ BLOCKED`, write the exact question, and skip to the next.
6. Stop when no `☐ TODO [AUTO]` items remain; summarize shipped vs. blocked.

## Platform rules (non-negotiable — the build fails or breaks otherwise)

- **No API server.** All data access is Supabase-direct from the browser. supabase-js never throws — always check `{ error }`.
- **RLS on every new table.** Public-insert tables use a narrow `with check`; private reads gate on `public.is_staff()` / owner.
- **Static export** (`output: 'export'`): client pages only; dynamic routes use the `_placeholder` + `usePathname()` pattern.
- **react-hooks/set-state-in-effect** is enforced: setState only in async callbacks behind a `let active = true` guard, never in the effect body. **Strict TS + strict ESLint** — no unused imports/vars (the build fails).
- **Migrations:** apply live via MCP `apply_migration`, then mirror to a numbered file in `supabase/migrations/` (next number after 073).
- **Temp edge functions** with hardcoded secrets get **deleted via the dashboard after use** (note it for the owner — no MCP delete exists).
- **Deploy monitor:** poll GitHub Actions for the pushed `head_sha`; runs take ~10–13 min, cancel-in-progress is on (a superseded run shows `cancelled`, which is fine).
- Match surrounding code style; reference `apps/web/src/components/djs/dj-booking-form.tsx` and `…/my/admin/dj-bookings/page.tsx` as recent, on-pattern examples.

---

## P0 — Instant sermon-sync watcher (core DONE 2026-06-15 — small follow-ups remain)

### ☑ DONE — Gmail-API instant sermon watcher is LIVE
`scripts/gmail-watcher.py` (OAuth: gmail.readonly + gmail.send + drive.readonly) under Cloud project `wccg-gmail-watcher` (published to production, Desktop client, `token.json` authorized). Installed as the **"WCCG Gmail Watcher"** Windows scheduled task (at-logon, `pythonw`, auto-restart) — runs 24/7 headless, **independent of the Claude app**. Baseline-seeded, polling every 20s. Sermons (pmb1/lcc1/gpn1/dvp1/thm1) now auto-download the instant they email in → Sunday folder + `M:/JBMusic/DJB_520xx`, self-email biggleem. Runbook: `scripts/GMAIL-WATCHER-RUNBOOK.md`. (OAuth quirk for the record: the sandboxed browser can't reach localhost, so the auth code was delivered to the local `run_local_server` via `curl` from the shell.)

### ☑ DONE W1 — Hand sermons off from the hourly task to the watcher
_Done 2026-06-15: hourly `wccg-email-mix-sermon-watch` SKILL.md section D flipped to "watcher-owned — SKIP all 5 sermon senders" (download details kept as manual fallback). No double-download/double-email; DJ-mix + dj-drops handling unchanged._
The hourly `wccg-email-mix-sermon-watch` SKILL.md still downloads sermons too — now redundant with the daemon (double-work / double-email risk). Edit that SKILL.md so the 5 sermon senders are marked **watcher-owned (skip)**, and the hourly task keeps only the DJ-mix senders + the `sync-dj-drops.py` portal sweep as backstop. **Acceptance:** the hourly task no longer re-downloads sermons; DJ-mix handling unchanged.

### ☑ DONE W2 — Record the watcher in memory
_Done 2026-06-15: `wccg-email-mix-sermon-pipeline` memory updated with the gmail-watcher daemon (Windows task, OAuth scopes, config dir), the curl-the-code-from-shell trick, and "sermons now instant/headless; hourly task = DJ-mix backstop only."_
Update the `wccg-email-mix-sermon-pipeline` memory: the gmail-watcher daemon (Windows task + OAuth scopes + config dir `C:\Users\wccg1\.wccg-gmail-watcher`), the curl-the-code-from-shell trick, and that sermons are now instant/headless (hourly task = DJ-mix backstop only). **Acceptance:** memory reflects current reality; no contradictory stale notes.

## P1 — Finish the DJ booking loop (just shipped the core)

### ☑ DONE B1 — Email staff when a new booking request arrives
_Done 2026-06-15: migration **074_booking_notification** (`trg_notify_on_booking`, AFTER INSERT WHEN status='pending' → pg_net POST) + **`notify-booking`** edge function (deployed v1, verify_jwt=false, re-fetches booking w/ service role, Resend-emails the station). Verified live: INSERT fires the function (pg_net 200); UPDATE does NOT fire (no new http_response). ⚠️ **Email won't actually send until `RESEND_API_KEY` is set as a project secret** — it's currently NOT visible to edge functions (the function returned `{"ok":false,"reason":"RESEND_API_KEY not set"}`). This also affects notify-admin-on-drop + notify-sync. Owner action — see U4. Committed in this push._
- **Why:** bookings currently land silently in `dj_bookings`; staff only see them if they open the admin console.
- **Scope:** DB trigger on `dj_bookings` INSERT → call an edge function that Resend-emails a summary (DJ, event, date, contact) to the station. Reuse the `notify-admin-on-drop` pattern (Resend key already in that function) or extend `notify-sync`. Resend is test-mode → recipient must be `wccg1045fm@gmail.com` until a domain is verified (see U4).
- **Acceptance:** inserting a `dj_bookings` row (test it with `set role anon` insert, then delete) fires one email; no email on status updates. Mirror any migration to repo.
- **Files:** new edge function or `notify-sync` action; migration for the trigger; `supabase/migrations/074_*.sql`.

### ☐ TODO [AUTO] B2 — DJ sees their own incoming bookings in the DJ portal
- **Why:** a DJ should see who's trying to book them without admin access.
- **Scope:** add an RLS SELECT policy so a DJ reads `dj_bookings` where `dj_id` maps to their `user_id` (join `djs`). Add a "Booking Requests" section to `/my/dj` listing their pending/confirmed requests (read-only; status is staff-managed). Contacts visible to the DJ themselves.
- **Acceptance:** signed in as a DJ, `/my/dj` shows that DJ's bookings and no one else's (verify RLS with a second identity). Empty state when none.
- **Files:** migration (RLS policy), `app/(main)/my/dj/page.tsx`.

## P2 — Real stubs to finish

### ☐ TODO [AUTO] S1 — Settings → Change Password
- **Why:** `app/(main)/my/settings/page.tsx` (~L806) shows "Change Password — Coming soon", but `app/(main)/my/settings/security/page.tsx` already has a working `handleChangePassword` behind a "Coming Soon" badge.
- **Scope:** wire the working flow (Supabase `auth.updateUser({ password })`), remove the "Coming Soon" badge/labels, link the settings card to the security page. Keep the min-length + confirm checks already present.
- **Acceptance:** a signed-in user can change their password and is told success/failure honestly.
- **Files:** `my/settings/page.tsx`, `my/settings/security/page.tsx`.

### ☐ TODO [AUTO] S2 — Sermon archive: hide future-dated broadcasts from the public until air date
- **Why:** Lewis Chapel (lcc1) is filed a week early; a future-dated sermon shows on the church's Podcasts tab before it airs.
- **Scope:** in `components/shows/sermon-archive.tsx`, filter rows to `air_date <= today` for the public view (staff/owner may still see upcoming). Keep newest-first.
- **Acceptance:** a sermon with `air_date` in the future does not render for an anonymous visitor; it appears on/after its air date.
- **Files:** `components/shows/sermon-archive.tsx` (compute "today" locally — see `lib/broadcast-week.ts`, don't use UTC slicing).

### ☐ TODO [AUTO] S3 — Mixshow archive "Latest air date" chip should never show a future date
- **Why:** DJs occasionally upload future-dated files; the hero chip can read a date that hasn't happened.
- **Scope:** cap `latestAirDate` in `components/mixshow-archive/mixshow-archive.tsx` to `<= today` (still allow the week grid to show upcoming).
- **Acceptance:** the "Latest air date" chip reflects the newest *aired* mix, not a future-dated upload.

## P3 — Enhancements (do after P1/P2)

### ☐ TODO [AUTO] E1 — "Book this DJ" entry point from the Mixshow Archive
- **Scope:** on the Mix Squad DJ card in `mixshow-archive.tsx`, add a small "Book" link to `/djs/<slug>` (the Booking tab). Low risk, high discoverability.

### ☐ TODO [AUTO] E2 — Admin DJ Bookings: pending-count badge on the admin dashboard card
- **Scope:** the admin dashboard card for DJ Bookings shows a count of `pending` requests (one lightweight count query). Keep it cheap.

### ☐ TODO [AUTO] E3 — DJ profiles: surface a Spotify/SoundCloud/social link row when present
- **Scope:** if `profiles_public` has social handles, render an icon row in the DJ hero. (Check the column set first; skip if no social columns exist — convert to BLOCKED asking whether to add them.)

---

## ⛔ BLOCKED — need the owner (loop: surface, do NOT attempt)

- **[USER] U1 — thm1 (The Encouraging Moment / Dr. Tony Haire) sermon source.** No email sender found; the hourly watch can't fetch it. Need: which address/service delivers it weekly (or a YouTube channel to pull from).
- **[USER] U2 — Bios for the 6 DJs not on the legacy site:** DJ Corleone, DJ Crisco, DJ Drop, DJ KVNG, DJ VI. Need bio text (or approval to draft from public info).
- **[USER] U3 — Mt. Pisgah image + confirmed Gospel Caravan hours** for Progressive vs. any other church (Mt. Pisgah was removed; Progressive holds the 1–2 PM hour pending confirmation).
- **[USER] U4a — ⚠️ `RESEND_API_KEY` is NOT set as an Edge Functions secret** (discovered 2026-06-15: `notify-booking` returned `RESEND_API_KEY not set`). Until it's set (Dashboard → Edge Functions → Secrets), notify-booking / notify-admin-on-drop / notify-sync all silently skip their emails. Set this FIRST.
- **[USER] U4 — Verify a domain at resend.com/domains** so booking/sync emails can go to biggleem@gmail.com (or a personal address) instead of only wccg1045fm@gmail.com; then set `SYNC_NOTIFY_EMAIL` + `NOTIFY_FROM`.
- **[USER] U5 — Delete the temporary `mint-sermon-upload` edge function** (dashboard → Edge Functions). Its work (sermon archive, Tony Neal R&B, DJ bios) is done.
- **[USER] U6 — Supabase leaked-password protection** (dashboard auth setting) and **VAPID private key** for web push.
- **[USER] U7 — 2FA / Two-Factor Auth** in settings: needs a decision on approach (Supabase MFA TOTP) before build — flag for go-ahead, then it can become `[AUTO]`.

---

## Already shipped (context — don't redo)

DJ Mix Squad profiles (hero, bios×28, mix player, social feed, booking tab) · DJ booking system (form + admin console, migration 073) · Watch wall (rows, ordering, Latest+Most Watched, portrait filtering, dedupe) · Sermon archive on church Podcasts tabs (590 files) · Mixshows week grid + two-pane archive · hourly email-mix-sermon watch task with `notify-sync` emails · menu cleanup (Mixshows/Members removed) · Mt. Pisgah removal / Progressive MBC · **instant Gmail-API sermon watcher — OAuth + Windows scheduled task, live 2026-06-15** · sermon sync emails switched to Gmail self-send to biggleem (was Resend test box) · pmb1 air-time corrected to 1 PM · lcc1 download method documented (Gmail attachment via Drive viewer).
