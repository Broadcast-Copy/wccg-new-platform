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

# ---------------------------------------------------------------------------
# UPLOAD PATH: prefer the Supabase CLI, which uses your `supabase login` session
# and needs NO service-role key. Learned the hard way on 2026-08-01 -- three
# details, none of them documented together:
#   1. the subcommands are behind --experimental (plain `storage` shows only ls)
#   2. the remote scheme is ss:/// with THREE slashes -- ss://bucket/... fails
#      with a misleading "copy between local directories"
#   3. the SOURCE must be a native Windows path. A Git Bash /c/Users/... path is
#      not recognised as a local file and produces the same misleading error
#   4. it resolves the project from supabase/.temp/project-ref, so it must run
#      from the repo root or it reports "have you run supabase link?"
# Falls back to the REST API with a service-role key if the CLI is unavailable.
# ---------------------------------------------------------------------------
SB="npx --yes supabase@latest"
use_cli=0
if $SB projects list >/dev/null 2>&1; then use_cli=1; fi

api() { curl -sS -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" "$@"; }

# Bucket: public read, private write. 'true' here is PUBLIC READ only -- writes still require
# the service role, so nobody can replace a published artefact.
echo "--> ensuring bucket '$BUCKET'"
api -X POST "$PROJECT_URL/storage/v1/bucket" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$BUCKET\",\"name\":\"$BUCKET\",\"public\":true}" \
  -o /dev/null -w '    %{http_code}\n' || true   # 409 = already exists, which is fine

# The checksum file sits beside the artefact so the page can link it.
SIDECAR="$(dirname "$ZIP")/${BASENAME%.zip}.sha256"
printf '%s  %s\n' "$SHA" "$BASENAME" > "$SIDECAR"

if [ "$use_cli" = 1 ]; then
  # cygpath so this works whether invoked from Git Bash or elsewhere; see the
  # note above about native paths being required.
  win() { command -v cygpath >/dev/null 2>&1 && cygpath -w "$1" || printf '%s' "$1"; }
  echo "--> uploading $OBJECT (via CLI login, no service-role key)"
  $SB storage cp --experimental --linked --content-type application/zip \
    "$(win "$ZIP")" "ss:///$BUCKET/$OBJECT"
  echo "--> uploading ${OBJECT%.zip}.sha256"
  $SB storage cp --experimental --linked --content-type text/plain \
    "$(win "$SIDECAR")" "ss:///$BUCKET/${OBJECT%.zip}.sha256"
else
  : "${SUPABASE_SERVICE_ROLE_KEY:?no CLI session and no SUPABASE_SERVICE_ROLE_KEY}"
  echo "--> uploading $OBJECT (REST, service-role)"
  api -X POST "$PROJECT_URL/storage/v1/object/$BUCKET/$OBJECT" \
    -H 'Content-Type: application/zip' -H 'x-upsert: true' \
    --data-binary "@$ZIP" -o /dev/null -w '    %{http_code}\n'
  echo "--> uploading ${OBJECT%.zip}.sha256"
  api -X POST "$PROJECT_URL/storage/v1/object/$BUCKET/${OBJECT%.zip}.sha256" \
    -H 'Content-Type: text/plain' -H 'x-upsert: true' \
    --data-binary "@$SIDECAR" -o /dev/null -w '    %{http_code}\n'
fi

# Verify what actually SERVES, not what we think we uploaded. A publish that
# reports success while the public URL returns 404 -- or serves different bytes
# -- is the failure mode worth catching, and it is exactly what happened on the
# first manual upload (files landed at the bucket root, one level too high).
PUBLIC="$PROJECT_URL/storage/v1/object/public/$BUCKET/$OBJECT"
echo "--> verifying $PUBLIC"
TMP="$(mktemp)"; curl -sS -m 300 -o "$TMP" -w '    HTTP %{http_code}  %{size_download} bytes\n' "$PUBLIC"
GOT="$(sha256sum "$TMP" | cut -d' ' -f1)"; rm -f "$TMP"
if [ "$GOT" != "$SHA" ]; then
  echo "    PUBLISH FAILED: served sha256 $GOT != $SHA" >&2
  echo "    Not recording this in bc_releases. Check the object path." >&2
  exit 1
fi
echo "    checksum verified against the live URL"

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
