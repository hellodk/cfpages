#!/usr/bin/env bash
# Build vanilla Jasper2 with hellodk posts and serve on :4324
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JASPER="$ROOT/theme-previews/jasper2-hellodk"
export PATH="/opt/homebrew/opt/ruby@3.1/bin:$PATH"

echo "→ Syncing posts from Astro content…"
node "$ROOT/scripts/sync-posts-to-jasper2.mjs"

echo "→ Syncing site images…"
mkdir -p "$JASPER/assets/images"
rsync -a "$ROOT/assets/images/" "$JASPER/assets/images/"

# Root-relative asset paths so CSS/images work on every page
if grep -qE '^baseurl: ""$' "$JASPER/_config.yml" 2>/dev/null; then
  sed -i '' 's|^baseurl: ""|baseurl: /|' "$JASPER/_config.yml"
fi

echo "→ Building Jasper2 (Ruby $(ruby -v | cut -d' ' -f2))…"
cd "$JASPER"
bundle exec jekyll build --trace 2>&1 | tail -20

echo ""
echo "✓ Built $(find _site -name 'index.html' 2>/dev/null | wc -l | tr -d ' ') pages"
echo "  Open http://127.0.0.1:4324"
