#!/usr/bin/env bash
# Copy assets/ into public/assets/ so Astro can serve CSS, fonts, and covers.
# public/assets/images/ is committed; assets/images/ is local-only (see .gitignore).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/assets"

if command -v rsync >/dev/null 2>&1; then
  rsync -a "$ROOT/assets/" "$ROOT/public/assets/"
else
  # Cloudflare build image has no rsync — cp works everywhere
  cp -a "$ROOT/assets/." "$ROOT/public/assets/"
fi

echo "Synced assets/ → public/assets/"
