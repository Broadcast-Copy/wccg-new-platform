#!/usr/bin/env bash
# Publish a release artefact to Supabase Storage and record it in bc_releases.
#
# Artefacts are NOT kept in this repo: the console zip is ~47 MB and incompressible, the
# marketing app is a static export, so committing it would add that much to git history on
# every build, permanently. Storage also means shipping a new build needs no site redeploy.
#
# Usage:
#   SUPABASE_SERVICE_ROLE_KEY=... ./scripts/publish-release.sh \
#     airsuite-console 1.0.0 /c/Users/wccg1/dev/wccg-airsuite/packaging/console/dist/AirSuiteConsole-1.0.0.zip
#
# The key is read from the environment and never written to disk or echoed. Get it from
# Supabase → Project Settings → API → service_role.
set -euo pipefail

PACKAGE="${1:?package name, e.g. airsuite-console}"
VERSION="${2:?version, e.g. 1.0.0}"
ZIP="${3:?path to the built zip}"

: "${SUPABASE_SERVICE_ROLE_KEY:?export SUPABASE_SERVICE_ROLE_KEY first}"
PROJECT_URL="${SUPABASE_URL:-https://irjiqbmoohklagdegezz.supabase.co}"
BUCKET=releases
CHANNEL="${CHANNEL:-stable}"

[ -f "$ZIP" ] || { echo "no such file: $ZIP" >&2; exit 1; }

BASENAME="$(basename "$ZIP")"
OBJECT="$PACKAGE/$BASENAME"
SIZE=$(wc -c < "$ZIP" | tr -d ' ')
SHA=$(sha256sum "$ZIP" | cut -d' ' -f1)

echo "package : $PACKAGE $VERSION ($CHANNEL)"
echo "file    : $BASENAME  ${SIZE} bytes"
echo "sha256  : $SHA"

api() { curl -sS -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" "$@"; }

# Bucket: public read, private write. 'true' here is PUBLIC READ only -- writes still require
# the service role, so nobody can replace a published artefact.
echo "--> ensuring bucket '$BUCKET'"
api -X POST "$PROJECT_URL/storage/v1/bucket" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$BUCKET\",\"name\":\"$BUCKET\",\"public\":true}" \
  -o /dev/null -w '    %{http_code}\n' || true   # 409 = already exists, which is fine

# x-upsert so re-publishing the same version replaces rather than errors.
echo "--> uploading $OBJECT"
api -X POST "$PROJECT_URL/storage/v1/object/$BUCKET/$OBJECT" \
  -H 'Content-Type: application/zip' -H 'x-upsert: true' \
  --data-binary "@$ZIP" -o /dev/null -w '    %{http_code}\n'

# The checksum file sits beside the artefact so the page can link it.
echo "--> uploading ${OBJECT%.zip}.sha256"
printf '%s  %s\n' "$SHA" "$BASENAME" | api -X POST \
  "$PROJECT_URL/storage/v1/object/$BUCKET/${OBJECT%.zip}.sha256" \
  -H 'Content-Type: text/plain' -H 'x-upsert: true' \
  --data-binary @- -o /dev/null -w '    %{http_code}\n'

URL="$PROJECT_URL/storage/v1/object/public/$BUCKET/$OBJECT"

echo "--> recording in bc_releases"
api -X POST "$PROJECT_URL/rest/v1/bc_releases" \
  -H 'Content-Type: application/json' \
  -H 'Prefer: resolution=merge-duplicates,return=minimal' \
  -d "{\"package\":\"$PACKAGE\",\"version\":\"$VERSION\",\"channel\":\"$CHANNEL\",
       \"url\":\"$URL\",\"sha256\":\"$SHA\",\"size_bytes\":$SIZE,
       \"is_published\":true,\"published_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
  -o /dev/null -w '    %{http_code}\n'

echo
echo "published: $URL"
echo "If the sha256 above differs from AIRSUITE_CONSOLE.sha256 in apps/marketing/src/lib/site.ts,"
echo "update site.ts -- a checksum that does not match the linked file is worse than none."
