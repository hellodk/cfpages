#!/usr/bin/env bash
# Workers Builds deploy — wrangler deploy (Workers API, not Pages API)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d dist ]]; then
  echo "dist/ missing — run npm run build first" >&2
  exit 1
fi

export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-d78f7ab0a83aeb09e9d06ad8dc6757c3}"

rm -rf node_modules/.cache/wrangler .worker-build 2>/dev/null || true

echo "Compiling Pages Functions → .worker-build/"
npx wrangler pages functions build --outdir=./.worker-build

echo "Deploying Worker (account: ${CLOUDFLARE_ACCOUNT_ID}, name: cfpages)"
exec npx wrangler deploy
