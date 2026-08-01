# Tenancy: control plane vs station content

Broadcast Copy is **shared control plane, isolated data** (decided 2026-08-01).

- **Control plane** — ONE Supabase project, shared by every station. Fleet, releases, the
  tenant directory, billing. The only database that knows more than one station exists.
- **Station content** — ONE Supabase project PER STATION. Everything that station makes,
  schedules, broadcasts or accumulates.

Chosen for the isolation story: these are FCC licensees, and "your data is in your own
database" is a materially stronger promise than "our RLS is correct".

## Identity — read this before touching auth

**Identity is per-database.** Each Supabase project has its own `auth.users`, so the same human
has a *different* `auth.uid()` in every database. That is accepted, not worked around.

**You cannot make one Supabase project the JWT issuer for another.** Spiked 2026-08-01:
third-party auth supports a closed list — Clerk, Firebase Auth, Auth0, AWS Cognito, WorkOS —
with no generic-OIDC option. This is not a crypto limitation; the project already serves
`/auth/v1/.well-known/openid-configuration` (200) and an ES256 JWKS with a `kid`. There is
simply nowhere to register another Supabase project as an issuer.

> Do not confuse this with **"Custom OAuth/OIDC Providers"**, which is a different feature:
> social login where Supabase still mints its own JWT, so `auth.uid()` still differs per
> project. It does not solve cross-database identity.

**Engineers are assigned per station and get the whole station** — devices *and* software
(operator, 2026-08-01). So an engineer serving N stations needs:

- a control-plane account (fleet, installs, pair codes), and
- a `station_members` row with `role='engineering'` in **each** station database they are
  assigned to — which `is_station_staff()` already honours (migrations 106/107).

Because `auth.uid()` differs per database, **the control plane must store the mapping**
`person -> (station, local_user_id)`. Provisioning writes it; revoking deletes the row. Until
that exists, an engineer on N stations has N logins — workable at today's scale, and the reason
to script provisioning rather than do it by hand.

**When N logins becomes the pain point**, the supported fix is adopting Clerk / Auth0 / WorkOS
as ONE shared issuer configured identically on every project (WorkOS is the natural fit — B2B
SSO is exactly stations-as-customers). ~$0.00325 per third-party MAU. Real option; do not buy
it before it is needed.

## Provisioning does NOT replay migrations

`supabase/migrations/` is **WCCG's applied history, not a provisioning source.** Two reasons:

1. **It seeds WCCG.** `004_seed_directory_listings`, `011_seed_schedule_phase_a`, `014_seed_djs`,
   `015_dj_roster_v2` and others insert real WCCG data. Replaying them into station #2 would
   give that station WCCG's DJs and WCCG's schedule.
2. **The ledger already diverges.** 132 migrations are tracked in
   `supabase_migrations.schema_migrations` by timestamp (`20260327233444` … ), against 114
   numerically-named files in the repo. The repo is not a faithful replay source.

**Do not rename or move anything in `supabase/migrations/`.** It is applied history.

Instead:

```
supabase/
  migrations/        # WCCG's applied history. Frozen. Never replayed elsewhere.
  control/           # NEW migrations for the control plane, from here on
  station/           # NEW migrations for station databases, from here on
    baseline.sql     # generated schema snapshot -- what a NEW station starts from
```

`station/baseline.sql` is generated, never hand-written:

```bash
supabase db dump --schema public --data-only=false > supabase/station/baseline.sql
```

then strip the control-plane tables listed below. Regenerate whenever `station/` migrations
land, so a new station starts current rather than replaying a chain.

## The manifest

### CONTROL PLANE — shared, one database

| group | tables |
|---|---|
| Fleet | `bc_devices` `bc_device_agents` `bc_device_installs` `bc_device_peripherals` `bc_pair_codes` |
| Releases / product | `bc_releases` `bc_changelog` `bc_features` |
| Sales & onboarding | `bc_leads` `bc_org_invites` |
| Tenant directory | `organizations` `organization_members` `stations` `station_domains` `station_entitlements` |
| Billing | `platform_fees` |
| Station credentials | `airsuite_station_keys` `airsuite_station_status` |
| Platform audit | `audit_log` `impersonation_log` |

Note four of these carry `station_id` (`bc_devices`, `bc_pair_codes`, `airsuite_*`,
`station_domains`, `station_entitlements`) — having a station_id does NOT make a table content.
It is control-plane data *about* a station.

### BOTH — same schema, different data in each database

`profiles` · `user_roles` · `notification_preferences` · `push_subscriptions`

Each database has its own users, so each needs its own copy. The control plane's copy holds BC
staff and contract engineers; a station's copy holds that station's staff and listeners.

### STATION CONTENT — one database per station

Everything else with `station_id`. By cluster:

- **Broadcast ops** `shows` `show_hosts` `show_episodes` `schedule_blocks` `djs` `hosts`
  `dj_drops` `dj_slots` `dj_mixes` `dj_bookings` `dj_collections` `dj_ftp_accounts`
  `dj_ftp_log` `mcr_state` `productions` `studio_projects` `studio_recordings` `station_members`
- **Content library** `videos` `sermons` `podcast_series` `podcast_episodes`
  `podcast_subscriptions` `blog_posts` `cms_pages` `site_content` `site_navigation`
  `site_ad_placements`
- **Streaming** `streams` `stream_sources` `stream_metadata` `stream_log_entries`
  `stream_log_daily_stats` `station_now_playing` `song_history` `restream_destinations`
  `restream_events`
- **Compliance** (per-licensee by law) `eas_alerts` `eas_test_schedule` `compliance_deadlines`
  `public_file_documents`
- **Audience** `points_history` `points_ledger` `points_rules` `user_points` `user_favorites`
  `user_milestones` `user_playlists` `user_referrals` `user_bounties_claimed` `favorites`
  `hub_posts` `hub_post_likes` `hub_groups` `hub_group_members` `hub_group_messages`
  `hub_memberships` `chat_messages` `listening_history` `listening_sessions` `listening_tracks`
  `listening_locations` `session_tracks` `content_plays` `video_progress` `song_requests`
  `events` `event_registrations` `event_checkins` `event_organizers` `ticket_types`
  `newsletter_subscribers` `referral_codes` `referral_signups` `birthday_club` `reward_catalog`
  `weekly_leaderboard` `listener_of_the_week` `moderation_queue` `notifications`
  `keyword_entries` `deal_redemptions` `check_in_locations` `submissions`
  `record_pool_tracks` `record_pool_labels` `record_pool_downloads`

**Engineering gets station content too** — `streams`, `stream_sources`, `stream_metadata` and
`mcr_state` are station-side on purpose, and an engineer assigned to the station reaches them
via their `station_members` row.

### EXCLUDED from v1 — do not migrate

**Dead.** `roles` (11 rows) `permissions` (21) `role_permissions` (62) — fully populated RBAC
referenced by **no policy, no function, and no application code** (checked 2026-08-01).
Abandoned scaffolding. `user_roles` is the exception and IS live — `is_staff()` reads it.

**Built but never used, and missing `station_id` entirely.** The advertising/DSP stack
(`ad_*`, `dsp_*`, `advertiser_accounts`, `media_campaigns`, `audience_segments`), sales/CRM
(`sales_*`, `crm_clients`, `projects`, `project_tasks`), vendor/commerce (`vendor_*`, `orders`,
`order_items`, `gift_cards`, `gift_card_transactions`, `product_reviews`, `place_*`), and
`directory_listings` (72) / `wiki_entities` (66) / `entity_follows`.

These are a *station's* business, so they are content in principle — but they have no
`station_id` and are almost all empty. **Do not migrate empty tables.** Add `station_id` and
move them if and when they ship.

100 of the 165 tables are completely empty. v1 should carry the ~60 that hold real data.

## Order of work

1. ~~Spike shared JWT issuer~~ — done, it fails and is not needed. See Identity.
2. ~~Classify `roles`/`permissions`/`role_permissions`~~ — done, dead.
3. Create `control/` and `station/`; leave `migrations/` frozen.
4. Generate `station/baseline.sql` and strip the control-plane tables.
5. Script provisioning: create project -> apply baseline -> seed that station -> register in
   the control plane's `stations` -> write the `person -> (station, local_user_id)` mapping.
6. Drop the 84 `DEFAULT 'station_wccg'` columns in the `station/` set — safe once each database
   has exactly one station and provisioning sets the id explicitly.
