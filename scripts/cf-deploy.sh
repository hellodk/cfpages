#!/usr/bin/env bash
# Cloudflare Git build deploy step — Pages static + functions/
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d dist ]]; then
  echo "dist/ missing — run npm run build first" >&2
  exit 1
fi

# Pages project (includes functions/api/*). Prefer over plain wrangler deploy.
exec npx wrangler pages deploy dist \
  --project-name=cfpages \
  --commit-dirty=true
