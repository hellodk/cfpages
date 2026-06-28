#!/usr/bin/env bash
# Run all four theme previews side-by-side for comparison.
# Usage: npm run preview:all
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ASTRO_TELEMETRY_DISABLED=1

"$ROOT/scripts/setup-theme-previews.sh"

echo "Starting theme previews..."
echo "  Preview hub:                http://127.0.0.1:4321/preview"
echo "  Legacy Jekyll Jasper v1:    http://127.0.0.1:4000"
echo "  Vanilla Jasper2 (Jekyll):   http://127.0.0.1:4324  ← jekyllt/jasper2"
echo "  Chirping Astro:             http://127.0.0.1:4321"
echo "  Jasper2 Astro (rebuild):    http://127.0.0.1:4322"
echo "  Upstream Chirping starter:  http://127.0.0.1:4323"
echo ""
echo "Press Ctrl+C to stop all servers."

# Jekyll — serve prebuilt _site from master worktree
if [ -d "$ROOT/theme-previews/jekyll-master/_site" ]; then
  (cd "$ROOT/theme-previews/jekyll-master" && npx --yes serve _site -p 4000 --no-port-switching) &
else
  echo "WARN: jekyll-master worktree missing — skipping :4000"
fi

(cd "$ROOT" && npm run dev -- --port 4321 --host 127.0.0.1) &
(cd "$ROOT/theme-previews/jasper2" && npm run dev -- --port 4322 --host 127.0.0.1) &

if [ -d "$ROOT/theme-previews/chirping-upstream" ]; then
  (cd "$ROOT/theme-previews/chirping-upstream" && npm run dev -- --port 4323 --host 127.0.0.1) &
else
  echo "WARN: chirping-upstream not scaffolded — skipping :4323"
fi

if [ -d "$ROOT/theme-previews/jasper2-hellodk/_site" ]; then
  (cd "$ROOT/theme-previews/jasper2-hellodk" && npx --yes serve _site -p 4324 --no-port-switching) &
elif [ -d "$ROOT/theme-previews/jasper2-vanilla" ]; then
  echo "WARN: jasper2-hellodk not built — serving demo on :4324. Run: npm run preview:jasper2"
  (cd "$ROOT/theme-previews/jasper2-vanilla" && npx --yes serve -p 4324 --no-port-switching) &
else
  echo "WARN: jasper2-hellodk missing — run: npm run preview:jasper2"
fi

wait
