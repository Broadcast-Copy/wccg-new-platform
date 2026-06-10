# Supabase Migration Lineage — WCCG Platform

Project: `irjiqbmoohklagdegezz` (Supabase Postgres). The browser talks to Supabase
directly; RLS is the security boundary. **This folder is the single source of truth
for schema history.**

Last reconciled against the live `supabase_migrations.schema_migrations` table on
**2026-06-09** (76 live rows at that time).

## The dual lineage (read this first)

This project has two migration histories that only partially overlap:

1. **Live lineage** — `supabase_migrations.schema_migrations` in the production DB.
   Rows are keyed by a timestamp `version` (e.g. `20260328155250`) and a free-form
   `name`. Early platform work (late March 2026) was applied directly via the
   Supabase dashboard SQL editor and via MCP `apply_migration`, **before** this
   repo's numbered file convention existed. Those early live migrations have no
   `NNN_` prefix in their names (`initial_schema`, `podcasts`, `advertising`, ...).
2. **Repo lineage** — the numbered `NNN_*.sql` files in this folder (`001`–`064`).
   Some were applied live under their numbered name (e.g. live `013_dj_portal_schema`),
   some were applied live under just the suffix (e.g. live `session_tracks` =
   `044_session_tracks.sql`), and a few were **never applied at all** (see
   "Repo files with no live counterpart" below).

To close the gap, every live migration that has **no** numbered repo file has been
exported verbatim from `schema_migrations.statements` into [`_live/`](./_live/) as
`<version>_<name>.sql`. The `_live/` folder is an **archive of already-applied
history** — never re-apply anything in it. It is kept separate so it cannot be
confused with the numbered local lineage.

Caveat: the live `statements` column stores the SQL as the apply tool recorded it —
leading comment headers were sometimes stripped (verified for `vendor_creator_tables`
vs `009_vendor_creator_tables.sql`: identical bodies, header comments removed).

## Mapping: live migration -> repo file

| Live version | Live name | Repo file / export |
|---|---|---|
| 20260327233444 | vendor_creator_tables | `009_vendor_creator_tables.sql` (same body; applied out of numeric order, *before* initial_schema) |
| 20260328155250 | initial_schema | `_live/20260328155250_initial_schema.sql` |
| 20260328160140 | seed_data | `_live/20260328160140_seed_data.sql` |
| 20260328160222 | podcasts | `_live/20260328160222_podcasts.sql` |
| 20260328160253 | advertising | `_live/20260328160253_advertising.sql` |
| 20260328160405 | expand_favorites_follows | `_live/20260328160405_expand_favorites_follows.sql` |
| 20260328160439 | cms_admin_content | `_live/20260328160439_cms_admin_content.sql` |
| 20260328160459 | super_admin_impersonation | `_live/20260328160459_super_admin_impersonation.sql` |
| 20260328160532 | user_types_employee | `_live/20260328160532_user_types_employee.sql` |
| 20260328160547 | streaming_analytics | `_live/20260328160547_streaming_analytics.sql` |
| 20260328160641 | directory_listings | `001_directory_listings.sql` |
| 20260328160657 | dj_mixes | `002_dj_mixes.sql` |
| 20260328160710 | host_enhancements | `003_host_enhancements.sql` |
| 20260328161008 | seed_directory_listings | `004_seed_directory_listings.sql` |
| 20260328161027 | song_history | `005_song_history.sql` |
| 20260328161102 | user_data_tables | `006_user_data_tables.sql` |
| 20260328161128 | user_sync | `007_user_sync.sql` |
| 20260328161206 | engagement_features | `008_engagement_features.sql` |
| 20260328190833 | gift_cards_and_media_enhancements | `_live/20260328190833_gift_cards_and_media_enhancements.sql` |
| 20260328213951 | hub_posts_and_likes | `_live/20260328213951_hub_posts_and_likes.sql` |
| 20260329011518 | orders_payouts_shipping_fees_verification | `_live/20260329011518_orders_payouts_shipping_fees_verification.sql` |
| 20260329025153 | product_reviews | `_live/20260329025153_product_reviews.sql` |
| 20260329131218 | hub_memberships | `_live/20260329131218_hub_memberships.sql` |
| 20260331012628 | dsp_ad_platform | `_live/20260331012628_dsp_ad_platform.sql` |
| 20260331014943 | nice_to_haves | `_live/20260331014943_nice_to_haves.sql` |
| 20260331140849 | studio_projects_table | `_live/20260331140849_studio_projects_table.sql` |
| 20260513120345 | 013_dj_portal_schema | `013_dj_portal_schema.sql` |
| 20260513120439 | 015_dj_roster_v2 | `015_dj_roster_v2.sql` |
| 20260513120520 | 016_record_pool | `016_record_pool.sql` |
| 20260513124720 | 017_master_control_eas | `017_master_control_eas.sql` |
| 20260513125846 | 018_rls_policies | `018_rls_policies.sql` |
| 20260513130002 | 018b_rls_followup | `_live/20260513130002_018b_rls_followup.sql` (no numbered repo file was ever created) |
| 20260513130305 | 019_restream | `019_restream.sql` |
| 20260513182457 | 020_analytics_views | `020_analytics_views.sql` |
| 20260602193409 | 021_dj_upload_client_policies | `_live/20260602193409_021_dj_upload_client_policies.sql` (repo number 021 was skipped) |
| 20260602210656 | 023_videos | `023_videos.sql` |
| 20260602211434 | 024_production_mixshow_access | `024_production_mixshow_access.sql` |
| 20260602212044 | 025_public_dj_mix_archive | `025_public_dj_mix_archive.sql` |
| 20260602212153 | 026_djs_admin_manage | `026_djs_admin_manage.sql` |
| 20260602213943 | 027_crm_projects | `027_crm_projects.sql` |
| 20260602215058 | 029_security_rls_hardening | `029_security_rls_hardening.sql` |
| 20260602215317 | 030_crm_storage_role_helpers | `030_crm_storage_role_helpers.sql` |
| 20260602220201 | 031_tighten_email_campaigns_and_trigger_grants | `031_tighten_email_campaigns_and_trigger_grants.sql` |
| 20260602230709 | 032_rls_for_rebuilt_flows | `032_rls_for_rebuilt_flows.sql` |
| 20260602231157 | 033_redeem_reward_rpc | `033_redeem_reward_rpc.sql` |
| 20260602233010 | 034_profiles_public_view_pii | `034_profiles_public_view_pii.sql` |
| 20260602234626 | 035_image_gen_and_hyperframes | `035_image_gen_and_hyperframes.sql` |
| 20260603002941 | 036_dj_collections_taxonomy | `036_dj_collections_taxonomy.sql` |
| 20260603004124 | 037_dj_mixes_host_id_nullable | `037_dj_mixes_host_id_nullable.sql` |
| 20260603004544 | 038_video_parental_controls | `038_video_parental_controls.sql` |
| 20260603011510 | 039_points_integrity_fairness | `039_points_integrity_fairness.sql` |
| 20260603012457 | 040_video_progress_and_program | `040_video_progress_and_program.sql` |
| 20260603015625 | 041_hub_groups | `041_hub_groups.sql` |
| 20260603021602 | 042_direct_messages | `042_direct_messages.sql` |
| 20260603025338 | 043_geo_listening_rewards | `043_geo_listening_rewards.sql` |
| 20260603095244 | session_tracks | `044_session_tracks.sql` |
| 20260603154131 | media_manager_state | `045_media_manager_state.sql` |
| 20260605192432 | internal_creators | `046_internal_creators.sql` |
| 20260605193616 | profile_username_bio | `047_profile_username_bio.sql` |
| 20260605194906 | follows | `048_follows.sql` |
| 20260605200341 | avatars_bucket | `049_avatars_bucket.sql` |
| 20260605210006 | staff_drop_on_behalf | `050_staff_drop_on_behalf.sql` |
| 20260606104054 | newsletter_subscribers | `051_newsletter_subscribers.sql` |
| 20260606104055 | entity_follows | `052_entity_follows.sql` |
| 20260606104059 | notification_producers | `053_notification_producers.sql` |
| 20260606105242 | points_leaderboard | `054_points_leaderboard.sql` |
| 20260606114053 | place_reviews_checkins | `055_place_reviews_checkins.sql` |
| 20260606122901 | notify_on_post_like | `056_notify_on_post_like.sql` |
| 20260606174552 | wiki_entities | `057_wiki_entities.sql` |
| 20260606191014 | backfill_profile_names | `058_backfill_profile_names.sql` |
| 20260606191648 | backfill_profile_avatars | `059_backfill_profile_avatars.sql` |
| 20260606201444 | more_notification_producers | `060_more_notification_producers.sql` |
| 20260606201729 | reseed_videos_cron | `061_reseed_videos_cron.sql` |
| 20260606202002 | notify_video_recency_guard | `062_notify_video_recency_guard.sql` |
| 20260606214936 | hub_group_messages | `063_hub_group_messages.sql` |
| 20260606220824 | event_reminders | `064_event_reminders.sql` |

Totals: 76 live rows = 57 matched to numbered repo files + 19 exported to `_live/`.

## Repo files with NO live counterpart

These five files exist in the repo but have no row in `schema_migrations`.
**Do not delete them** — but note they fall into two very different groups
(verified against the live DB on 2026-06-09):

### Applied live by other means (effects verified in the DB)

| Repo file | Status |
|---|---|
| `014_seed_djs.sql` | DJ roster data exists live (`djs` has 34 rows; slots assigned). Seeded via SQL editor and later superseded/extended by `015_dj_roster_v2.sql`. |
| `022_drop_email_notification.sql` | Applied live via SQL editor (the file says so). `trg_notify_admin_on_drop` trigger exists on `dj_drops`; pairs with the `notify-admin-on-drop` edge function. |

### Never applied anywhere (unapplied drafts — schema does NOT exist live)

| Repo file | Evidence |
|---|---|
| `010_phase_a_engagement.sql` | Its unique table `points_daily_caps` does not exist live. (`push_subscriptions` and `newsletter_subscribers` exist, but were created later by the live `nice_to_haves` and `051_newsletter_subscribers` migrations, not by this file.) |
| `011_seed_schedule_phase_a.sql` | References a `streams.stream_url` column that does not exist live (it would fail if run). Live `schedule_blocks` still contains the 26 placeholder rows from the live `seed_data` migration ("Gospel Morning", "Midday Praise", ...), not this file's schedule. |
| `012_phase_b_c_schema.sql` | None of its unique tables exist live: `place_check_ins`, `products`, `product_variants`, `redemptions`, `wiki_sources`, `wiki_links`, `wiki_watchers`, `agent_runs`, `agent_jobs` are all absent. (`place_reviews` and `wiki_entities` exist, but were created later — with different definitions — by `055_place_reviews_checkins.sql` and `057_wiki_entities.sql`.) |

Treat `010`/`011`/`012` as historical drafts. If any of that functionality is wanted,
write a **new** numbered migration; do not apply these files as-is (011 is broken
against the live schema, and 012 overlaps with 055/057).

## Numbering quirks

- **`021` and `028` do not exist as repo files.** `021_dj_upload_client_policies`
  exists live only (exported to `_live/`); `028` was skipped in both lineages.
- **`018b_rls_followup`** exists live only, applied between `018` and `019`
  (exported to `_live/`).
- **`009_vendor_creator_tables.sql`** was applied live *before* `initial_schema`
  (live version `20260327233444`), i.e. out of numeric order. Content matches.
- Live `name` values are inconsistent about the `NNN_` prefix: `013`–`043` were
  recorded with the prefix, `044`+ and the pre-`013` era without it. Match by
  suffix when reconciling.

## Going-forward rule

**Every live schema change MUST land in this folder, with the repo as the source
of truth:**

1. Write the SQL as the next numbered file here first: `NNN_short_name.sql`
   (next free number; do not reuse skipped numbers `021`/`028`).
2. Apply it live via MCP `apply_migration` with `name` set to the **same**
   `NNN_short_name` so the live lineage and repo lineage stay 1:1.
3. Never apply schema changes through the dashboard SQL editor or raw
   `execute_sql` — those bypass `schema_migrations` and recreate this drift.
4. Never edit or re-apply anything under `_live/`; it is a read-only archive of
   history that predates this rule.
