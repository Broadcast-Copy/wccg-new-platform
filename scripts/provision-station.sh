#!/usr/bin/env bash
# Provision a NEW station database for Broadcast Copy.
#
# Tenancy model is shared control plane, isolated data: the bc_* fleet/release/billing tables
# live in ONE shared project, and every station's content lives in its OWN. See
# supabase/TENANCY.md.
#
# What this does, in order:
#   1. refuse to run against the control plane or any database that already holds content
#   2. apply supabase/station/migrations/ -- the generated baseline, then the control-plane strip
#   3. emit the per-station seed (its organization row and its one stations row)
#   4. print what still has to be done by a human
#
# Usage:
#   ./scripts/provision-station.sh \
#       --project-ref abcdefghijklmnop \
#       --station-id station_kxyz --station-name "KXYZ 99.1" \
#       --org-id org_kxyz --org-name "Example Broadcasting" \
#       --market "Raleigh, NC" --timezone America/New_York
#
#   --dry-run  print what would happen and stop
set -euo pipefail
cd "$(dirname "$0")/.."

CONTROL_REF="${CONTROL_REF:-irjiqbmoohklagdegezz}"   # never provision over this one
PROJECT_REF="" STATION_ID="" STATION_NAME="" ORG_ID="" ORG_NAME=""
MARKET="" TIMEZONE="America/New_York" DRY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --project-ref)  PROJECT_REF="$2"; shift 2 ;;
    --station-id)   STATION_ID="$2";  shift 2 ;;
    --station-name) STATION_NAME="$2";shift 2 ;;
    --org-id)       ORG_ID="$2";      shift 2 ;;
    --org-name)     ORG_NAME="$2";    shift 2 ;;
    --market)       MARKET="$2";      shift 2 ;;
    --timezone)     TIMEZONE="$2";    shift 2 ;;
    --dry-run)      DRY=1;            shift ;;
    -h|--help)      sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

for v in PROJECT_REF STATION_ID STATION_NAME ORG_ID ORG_NAME; do
  [ -n "${!v}" ] || { echo "missing --${v,,} (see --help)" | tr '_' '-' >&2; exit 1; }
done

# ------------------------------------------------------------------ guards --
# Provisioning applies a DROP-heavy migration. Pointed at the control plane it would delete the
# fleet, every release record and the tenant directory. Refuse by ref, before anything runs.
if [ "$PROJECT_REF" = "$CONTROL_REF" ]; then
  cat >&2 <<EOF
REFUSING: --project-ref is the CONTROL PLANE ($CONTROL_REF).

This script applies 00000000000001_strip_control_plane, which drops bc_devices, bc_releases,
the tenant directory and the platform audit tables. Running it here would destroy the fleet.
Provision into a NEW, EMPTY project.
EOF
  exit 1
fi

BASELINE="supabase/station/migrations/00000000000000_baseline.sql"
[ -f "$BASELINE" ] || {
  echo "no baseline at $BASELINE -- run ./scripts/gen-station-baseline.sh first" >&2; exit 1; }

SB="npx --yes supabase@latest"

cat <<EOF

  project ref : $PROJECT_REF
  station     : $STATION_ID  "$STATION_NAME"
  org         : $ORG_ID  "$ORG_NAME"
  market      : ${MARKET:-(none)}
  timezone    : $TIMEZONE
  baseline    : $BASELINE ($(wc -l < "$BASELINE") lines)

EOF
[ "$DRY" = 1 ] && { echo "--dry-run: stopping before any change."; exit 0; }

# ------------------------------------------------------------ apply schema --
# db push applies the station migration set in order: baseline, then the strip. The strip has
# its own data-driven guard (it refuses if bc_devices holds rows), so a mistargeted run is
# caught twice.
echo "==> linking $PROJECT_REF"
$SB link --project-ref "$PROJECT_REF" >/dev/null

echo "==> applying supabase/station/migrations/"
$SB db push --workdir supabase/station

# -------------------------------------------------------------- seed --------
# Written to a file rather than executed: this repo has no psql, and the two rows below are the
# station's identity -- worth a human looking at them once before they exist.
SEED="supabase/station/seed-${STATION_ID}.sql"
cat > "$SEED" <<EOF
-- Identity seed for ${STATION_NAME} (${STATION_ID}).
-- A station database holds exactly ONE organizations row and ONE stations row: its own.
-- 92 content tables have a foreign key to stations, so this must exist before any content.
insert into public.organizations (id, name)
values ('${ORG_ID}', '${ORG_NAME}')
on conflict (id) do nothing;

insert into public.stations (id, org_id, name, market, timezone, status, is_public)
values ('${STATION_ID}', '${ORG_ID}', '${STATION_NAME}',
        $( [ -n "$MARKET" ] && echo "'${MARKET}'" || echo NULL ), '${TIMEZONE}', 'active', true)
on conflict (id) do nothing;

-- Sanity: exactly one station in a station database, never more.
do \$\$
declare n int;
begin
  select count(*) into n from public.stations;
  if n <> 1 then
    raise exception 'expected exactly 1 station in a station database, found %', n;
  end if;
end \$\$;
EOF

echo "==> wrote $SEED"

cat <<EOF

Schema applied. Remaining steps, all deliberate:

  1. Apply the seed. Paste $SEED into the project's SQL editor
     (no psql in this repo), or run it with psql if you have one.

  2. Register the station in the CONTROL PLANE ($CONTROL_REF):
       insert into public.organizations (id, name) values ('$ORG_ID', '$ORG_NAME');
       insert into public.stations (id, org_id, name, market, timezone, status, is_public)
         values ('$STATION_ID','$ORG_ID','$STATION_NAME',$( [ -n "$MARKET" ] && echo "'$MARKET'" || echo NULL ),'$TIMEZONE','active',true);
       insert into public.airsuite_station_keys (station_id, key) values ('$STATION_ID', '<generate>');

  3. Deploy the apps with STATION_ID=$STATION_ID and this project's URL/keys.
     apps/api, apps/workers and apps/web all read process.env.STATION_ID; apps/web resolves it
     at BUILD time because it is a static export.

  4. Add the station's people. station_members is per-database and roles come from migration
     107 (station_admin | gm | program_director | operations | engineering | production |
     promotions | marketing | sales | traffic | staff | dj | listener).
     Engineers assigned to this station need a row here AND a control-plane account -- and
     because auth.uid() differs per database, record person -> (station, local_user_id) in the
     control plane. See "Identity" in supabase/TENANCY.md.

EOF
