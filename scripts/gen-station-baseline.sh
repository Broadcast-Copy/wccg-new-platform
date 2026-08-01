#!/usr/bin/env bash
# Regenerate supabase/station/migrations/00000000000000_baseline.sql -- the schema a NEW
# station database starts from.
#
# WHY A BASELINE AND NOT A MIGRATION REPLAY
# supabase/migrations/ is WCCG's applied history, not a provisioning source. Several of those
# migrations SEED WCCG (004_seed_directory_listings, 011_seed_schedule_phase_a, 014_seed_djs,
# 015_dj_roster_v2), so replaying them would hand a new station WCCG's DJs and schedule. The
# ledger has also drifted -- 132 migrations tracked by timestamp in
# supabase_migrations.schema_migrations against 114 numerically-named files in the repo.
#
# The dump deliberately includes the control-plane tables; 00000000000001_strip_control_plane
# removes them on the way in. `--exclude` only applies to data-only dumps, so filtering here is
# not an option, and dropping named tables afterwards is more reliable than parsing SQL anyway.
#
# Usage:
#   supabase login                 # interactive, once
#   ./scripts/gen-station-baseline.sh
#
# Run this again whenever a migration lands in supabase/station/migrations/, so a new station
# starts current instead of replaying a chain.
set -euo pipefail

SOURCE_REF="${SOURCE_REF:-irjiqbmoohklagdegezz}"   # the project the schema is modelled on
OUT="supabase/station/migrations/00000000000000_baseline.sql"

cd "$(dirname "$0")/.."

command -v npx >/dev/null || { echo "npx is required" >&2; exit 1; }
SB="npx --yes supabase@latest"

echo "Dumping public schema from $SOURCE_REF"
echo "(schema only -- no data; the seed is per-station and comes later)"

$SB link --project-ref "$SOURCE_REF" >/dev/null
$SB db dump --linked --schema public -f "$OUT"

lines=$(wc -l < "$OUT")
echo
echo "wrote $OUT  ($lines lines)"

# A truncated or empty dump silently produces a broken station. Refuse to leave one lying
# around looking like a valid baseline.
if [ "$lines" -lt 500 ]; then
  echo "REFUSING: that is far too short to be the full schema. Not keeping it." >&2
  rm -f "$OUT"
  exit 1
fi

for t in stations organizations profiles station_members; do
  grep -q "CREATE TABLE.*\b$t\b" "$OUT" \
    || { echo "REFUSING: baseline is missing $t. Not keeping it." >&2; rm -f "$OUT"; exit 1; }
done

echo "sanity checks passed (stations, organizations, profiles, station_members present)"
echo "next: ./scripts/provision-station.sh --help"
