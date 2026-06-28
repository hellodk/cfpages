#!/usr/bin/env bash
# Cloudflare Git build deploy step — Pages static + functions/
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d dist ]]; then
  echo "dist/ missing — run npm run build first" >&2
  exit 1
fi

BRANCH="${CF_PAGES_BRANCH:-main}"
COMMIT="${CF_PAGES_COMMIT_SHA:-}"

ARGS=(pages deploy dist --project-name=cfpages --branch="$BRANCH" --commit-dirty=true)
if [[ -n "$COMMIT" ]]; then
  ARGS+=(--commit-hash="$COMMIT")
fi

echo "Deploying to Pages project cfpages (branch: $BRANCH)"
exec npx wrangler "${ARGS[@]}"
