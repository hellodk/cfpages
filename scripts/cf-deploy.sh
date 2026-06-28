#!/usr/bin/env bash
# Cloudflare Git build deploy step — Pages static + functions/
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d dist ]]; then
  echo "dist/ missing — run npm run build first" >&2
  exit 1
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is not set in the build environment." >&2
  echo "Create a token with Pages Edit — see docs/CLOUDFLARE-API-TOKEN.md" >&2
  exit 1
fi

# Wrangler caches account ID in node_modules/.cache — stale cache causes auth 10000
rm -rf node_modules/.cache/wrangler 2>/dev/null || true

# hellodk account — override via CF build env if needed
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-d78f7ab0a83aeb09e9d06ad8dc6757c3}"

BRANCH="${CF_PAGES_BRANCH:-main}"
COMMIT="${CF_PAGES_COMMIT_SHA:-}"

ARGS=(pages deploy dist --project-name=cfpages --branch="$BRANCH" --commit-dirty=true)
if [[ -n "$COMMIT" ]]; then
  ARGS+=(--commit-hash="$COMMIT")
fi

echo "Deploying to Pages (account: ${CLOUDFLARE_ACCOUNT_ID}, branch: ${BRANCH})"
exec npx wrangler "${ARGS[@]}"
