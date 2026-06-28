#!/usr/bin/env bash
# Run layout B (feed) and layout C (grid) side-by-side for comparison.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ASTRO_TELEMETRY_DISABLED=1

bash "$ROOT/scripts/sync-public-assets.sh"

echo "Starting layout comparison servers…"
echo "  Layout B (feed + thumbnails):  http://127.0.0.1:4325/"
echo "  Layout C (card grid):          http://127.0.0.1:4326/"
echo ""
echo "Press Ctrl+C to stop both."

(cd "$ROOT" && HOME_LAYOUT=feed npm run dev -- --port 4325 --host 127.0.0.1) &
(cd "$ROOT" && HOME_LAYOUT=grid npm run dev -- --port 4326 --host 127.0.0.1) &

wait
