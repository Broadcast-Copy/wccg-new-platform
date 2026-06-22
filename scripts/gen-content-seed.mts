/**
 * gen-content-seed.mts
 * ---------------------------------------------------------------------------
 * Generates supabase/migrations/092_seed_wccg_content.sql — an idempotent seed
 * that upserts ALL hardcoded shows, hosts, show↔host links, and check-in
 * locations from apps/web/src/data/*.ts into the DB, scoped to
 * station_id = 'station_wccg'.
 *
 * Run:  npx tsx scripts/gen-content-seed.mts
 *   or: node --experimental-strip-types scripts/gen-content-seed.mts   (Node >= 20)
 *
 * Does NOT touch the database. Only writes the .sql file.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { ALL_SHOWS, type ShowData } from "../apps/web/src/data/shows.ts";
import { ALL_HOSTS, type HostData } from "../apps/web/src/data/hosts.ts";
import { CHECK_IN_LOCATIONS, type CheckInLocation } from "../apps/web/src/data/check-in-locations.ts";

const STATION = "station_wccg";

// ─── SQL value helpers ─────────────────────────────────────────────────────

/** TS null/undefined → SQL NULL; otherwise a single-quote-escaped string literal. */
function sqlText(v: string | null | undefined): string {
  if (v === null || v === undefined) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

/** Boolean literal (defaults to provided fallback when undefined). */
function sqlBool(v: boolean | null | undefined, fallback = false): string {
  const b = v === undefined || v === null ? fallback : v;
  return b ? "true" : "false";
}

/** Number literal or NULL. */
function sqlNum(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "NULL";
  return String(v);
}

/** JSON value → '<json>'::jsonb (single-quote escaped). null/undefined → NULL. */
function sqlJson(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  const json = JSON.stringify(v);
  return `'${json.replace(/'/g, "''")}'::jsonb`;
}

/** JSON array → '<json>'::jsonb, defaulting to '[]' when missing. */
function sqlJsonArray(v: unknown[] | null | undefined): string {
  const arr = v ?? [];
  const json = JSON.stringify(arr);
  return `'${json.replace(/'/g, "''")}'::jsonb`;
}

/** Map TS streamId → DB streams.id. */
function mapStreamId(streamId: string): string {
  if (streamId === "stream_wccg") return "stream_main";
  if (streamId === "stream_mixsquad") return "stream_mixsquad";
  return streamId; // pass through anything unexpected
}

/** host_yung_joc → yung-joc */
function hostSlug(id: string): string {
  return id.replace(/^host_/, "").replace(/_/g, "-");
}

// ─── Build the SQL ─────────────────────────────────────────────────────────

const lines: string[] = [];
const skipped: string[] = [];

lines.push(
  "-- 092_seed_wccg_content — ports hardcoded shows/hosts/check-ins into the DB (station_wccg). Generated from apps/web/src/data/*.ts.",
);
lines.push("");
lines.push("begin;");
lines.push("");

// ---- ADD COLUMNs (idempotent) ----
lines.push("-- ── Additive columns (idempotent) ──────────────────────────────────────────");
lines.push("alter table public.shows add column if not exists host_names      text;");
lines.push("alter table public.shows add column if not exists tagline         text;");
lines.push("alter table public.shows add column if not exists show_image_url  text;");
lines.push("alter table public.shows add column if not exists host_image_url  text;");
lines.push("alter table public.shows add column if not exists category        text;");
lines.push("");
lines.push("alter table public.hosts add column if not exists youtube_channel text;");
lines.push("");
lines.push("alter table public.check_in_locations add column if not exists description text;");
lines.push("");

// ---- stream_mixsquad (so the mixsquad show has a valid stream_id) ----
lines.push("-- ── Stream for MixxSquadd Radio (so its show has a valid stream_id) ─────────");
lines.push(
  "insert into public.streams (id, name, slug, category, status, station_id) values\n" +
    `  ('stream_mixsquad', 'MixxSquadd', 'mixsquad', 'MIX', 'ACTIVE', '${STATION}')\n` +
    "on conflict (id) do nothing;",
);
lines.push("");

// ---- shows ----
lines.push("-- ── Shows ───────────────────────────────────────────────────────────────────");
lines.push(
  "insert into public.shows\n" +
    "  (id, name, slug, host_names, time_slot, days, description, tagline, gradient,\n" +
    "   image_url, show_image_url, host_image_url, hero_image_class, youtube, podcast_rss,\n" +
    "   segments, is_syndicated, is_active, category, stream_id, station_id)\n" +
    "values",
);

const showRows: string[] = [];
for (const s of ALL_SHOWS as ShowData[]) {
  const row =
    "  (" +
    [
      sqlText(s.id),
      sqlText(s.name),
      sqlText(s.slug),
      sqlText(s.hostNames),
      sqlText(s.timeSlot),
      sqlText(s.days),
      sqlText(s.description),
      sqlText(s.tagline),
      sqlText(s.gradient),
      sqlText(s.imageUrl),
      sqlText(s.showImageUrl),
      sqlText(s.hostImageUrl),
      sqlText(s.heroImageClass),
      sqlJson(s.youtube),
      sqlText(s.podcastRss),
      sqlJsonArray(s.segments),
      sqlBool(s.isSyndicated),
      sqlBool(s.isActive, true),
      sqlText(s.category),
      sqlText(mapStreamId(s.streamId)),
      sqlText(STATION),
    ].join(", ") +
    ")";
  showRows.push(row);
}
lines.push(showRows.join(",\n"));
lines.push(
  "on conflict (id) do update set\n" +
    "  name           = excluded.name,\n" +
    "  slug           = excluded.slug,\n" +
    "  host_names     = excluded.host_names,\n" +
    "  time_slot      = excluded.time_slot,\n" +
    "  days           = excluded.days,\n" +
    "  description    = excluded.description,\n" +
    "  tagline        = excluded.tagline,\n" +
    "  gradient       = excluded.gradient,\n" +
    "  image_url      = excluded.image_url,\n" +
    "  show_image_url = excluded.show_image_url,\n" +
    "  host_image_url = excluded.host_image_url,\n" +
    "  hero_image_class = excluded.hero_image_class,\n" +
    "  youtube        = excluded.youtube,\n" +
    "  podcast_rss    = excluded.podcast_rss,\n" +
    "  segments       = excluded.segments,\n" +
    "  is_syndicated  = excluded.is_syndicated,\n" +
    "  is_active      = excluded.is_active,\n" +
    "  category       = excluded.category,\n" +
    "  stream_id      = excluded.stream_id,\n" +
    "  station_id     = excluded.station_id;",
);
lines.push("");

// ---- hosts ----
lines.push("-- ── Hosts ───────────────────────────────────────────────────────────────────");
lines.push(
  "insert into public.hosts\n" +
    "  (id, name, slug, role, bio, avatar_url, social_links, youtube_channel,\n" +
    "   youtube_channel_id, is_syndicated, is_active, category, station_id)\n" +
    "values",
);

const hostRows: string[] = [];
for (const h of ALL_HOSTS as HostData[]) {
  const row =
    "  (" +
    [
      sqlText(h.id),
      sqlText(h.name),
      sqlText(hostSlug(h.id)),
      sqlText(h.role),
      sqlText(h.bio),
      sqlText(h.imageUrl),
      sqlJson(h.socialLinks),
      sqlText(h.youtubeChannel),
      sqlText(h.youtubeChannelId),
      sqlBool(h.isSyndicated, false),
      sqlBool(h.isActive, true),
      sqlText(h.category),
      sqlText(STATION),
    ].join(", ") +
    ")";
  hostRows.push(row);
}
lines.push(hostRows.join(",\n"));
lines.push(
  "on conflict (id) do update set\n" +
    "  name               = excluded.name,\n" +
    "  slug               = excluded.slug,\n" +
    "  role               = excluded.role,\n" +
    "  bio                = excluded.bio,\n" +
    "  avatar_url         = excluded.avatar_url,\n" +
    "  social_links       = excluded.social_links,\n" +
    "  youtube_channel    = excluded.youtube_channel,\n" +
    "  youtube_channel_id = excluded.youtube_channel_id,\n" +
    "  is_syndicated      = excluded.is_syndicated,\n" +
    "  is_active          = excluded.is_active,\n" +
    "  category           = excluded.category,\n" +
    "  station_id         = excluded.station_id;",
);
lines.push("");

// ---- show_hosts ----
lines.push("-- ── Show ↔ Host links ───────────────────────────────────────────────────────");

const hostIdSet = new Set((ALL_HOSTS as HostData[]).map((h) => h.id));
const showIdSet = new Set((ALL_SHOWS as ShowData[]).map((s) => s.id));

const shTriples: Array<{ showId: string; hostId: string; isPrimary: boolean }> = [];
for (const s of ALL_SHOWS as ShowData[]) {
  if (!showIdSet.has(s.id)) {
    // (cannot happen — derived from ALL_SHOWS — but kept for symmetry/logging)
    skipped.push(`show_hosts: unknown showId '${s.id}'`);
    continue;
  }
  s.hostIds.forEach((hostId, idx) => {
    if (!hostIdSet.has(hostId)) {
      skipped.push(`show_hosts: '${s.id}' references missing hostId '${hostId}'`);
      return;
    }
    shTriples.push({ showId: s.id, hostId, isPrimary: idx === 0 });
  });
}

let showHostsCount = 0;
if (shTriples.length > 0) {
  lines.push("insert into public.show_hosts (show_id, host_id, is_primary, station_id) values");
  const shRows = shTriples.map(
    (t) =>
      "  (" +
      [sqlText(t.showId), sqlText(t.hostId), t.isPrimary ? "true" : "false", sqlText(STATION)].join(
        ", ",
      ) +
      ")",
  );
  lines.push(shRows.join(",\n"));
  lines.push(
    "on conflict (show_id, host_id) do update set\n" +
      "  is_primary = excluded.is_primary,\n" +
      "  station_id = excluded.station_id;",
  );
  showHostsCount = shTriples.length;
} else {
  lines.push("-- (no valid show↔host links)");
}
lines.push("");

// ---- check_in_locations ----
lines.push("-- ── Check-in locations ──────────────────────────────────────────────────────");
lines.push(
  "insert into public.check_in_locations\n" +
    "  (id, name, description, address, lat, lng, points, start_date, end_date, is_active, station_id)\n" +
    "values",
);
const locRows: string[] = [];
for (const c of CHECK_IN_LOCATIONS as CheckInLocation[]) {
  const row =
    "  (" +
    [
      sqlText(c.id),
      sqlText(c.name),
      sqlText(c.description),
      sqlText(c.address),
      sqlNum(c.lat),
      sqlNum(c.lng),
      sqlNum(c.points),
      sqlText(c.startDate),
      sqlText(c.endDate),
      sqlBool(c.isActive, true),
      sqlText(STATION),
    ].join(", ") +
    ")";
  locRows.push(row);
}
lines.push(locRows.join(",\n"));
lines.push(
  "on conflict (id) do update set\n" +
    "  name        = excluded.name,\n" +
    "  description = excluded.description,\n" +
    "  address     = excluded.address,\n" +
    "  lat         = excluded.lat,\n" +
    "  lng         = excluded.lng,\n" +
    "  points      = excluded.points,\n" +
    "  start_date  = excluded.start_date,\n" +
    "  end_date    = excluded.end_date,\n" +
    "  is_active   = excluded.is_active,\n" +
    "  station_id  = excluded.station_id;",
);
lines.push("");

lines.push("commit;");
lines.push("");

// ─── Write file ────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../supabase/migrations/092_seed_wccg_content.sql");
const sql = lines.join("\n");
writeFileSync(outPath, sql, "utf8");

// ─── Report ────────────────────────────────────────────────────────────────

const lineCount = sql.split("\n").length;
console.log("Generated:", outPath);
console.log("Line count:", lineCount);
console.log("Counts:");
console.log("  streams:            1 (stream_mixsquad)");
console.log("  shows:             ", ALL_SHOWS.length);
console.log("  hosts:             ", ALL_HOSTS.length);
console.log("  show_hosts links:  ", showHostsCount);
console.log("  check_in_locations:", CHECK_IN_LOCATIONS.length);
if (skipped.length > 0) {
  console.log("\nSkipped (dangling references):");
  for (const s of skipped) console.log("  -", s);
} else {
  console.log("\nNo dangling references skipped.");
}

// Also report which hosts end up with NO show link (orphan hosts), informational.
const linkedHostIds = new Set(shTriples.map((t) => t.hostId));
const orphanHosts = (ALL_HOSTS as HostData[]).filter((h) => !linkedHostIds.has(h.id)).map((h) => h.id);
if (orphanHosts.length > 0) {
  console.log("\nHosts with no show_hosts link (still seeded into hosts table):");
  console.log("  " + orphanHosts.join(", "));
}
