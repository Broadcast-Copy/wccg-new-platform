#!/usr/bin/env bash
# Fetch the fleet report as a monitoring identity. This is what a Buzz agent runs.
#
# WHY IT AUTHENTICATES AS A REAL USER
# Supabase has two keys: the anon key (public, safe to embed, RLS applies) and
# the service-role key (bypasses RLS entirely). A reporting agent must never
# hold the second -- with it, one chat agent could read and write every future
# client's plant. So it signs in as an ordinary user whose ONLY privilege is a
# station_members row with role='monitor'. That role is affiliation, not
# management: it satisfies bc_fleet_report()'s check and nothing else. It cannot
# issue a pair code, write compliance_deadlines, or touch the FCC public file.
#
# Environment:
#   FLEET_AGENT_EMAIL     the monitor account
#   FLEET_AGENT_PASSWORD  its password
#   STATION_ID            defaults to station_wccg
#
# The anon key below is deliberately in the clear -- it ships in every browser
# bundle already and grants nothing on its own.
set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://irjiqbmoohklagdegezz.supabase.co}"
ANON_KEY="${SUPABASE_ANON_KEY:-sb_publishable_w9EytFGBM7mEvefmGhsZ9w_bXbmNjQ4}"
STATION="${STATION_ID:-station_wccg}"

: "${FLEET_AGENT_EMAIL:?set FLEET_AGENT_EMAIL}"
: "${FLEET_AGENT_PASSWORD:?set FLEET_AGENT_PASSWORD}"

TOKEN=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$FLEET_AGENT_EMAIL\",\"password\":\"$FLEET_AGENT_PASSWORD\"}" \
  | python -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))')

if [ -z "$TOKEN" ]; then
  echo "sign-in failed. If the account was just created, its email may still be unconfirmed." >&2
  exit 1
fi

# Access tokens are short-lived (~1h) by design. Fetch a fresh one per run rather
# than caching -- a monitoring poll is infrequent enough that it costs nothing,
# and a cached expired token fails in a way that reads like the fleet is down.
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/bc_fleet_report" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"p_station\":\"$STATION\"}"
