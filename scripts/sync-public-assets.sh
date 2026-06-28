#!/usr/bin/env bash
# Copy Jekyll-era assets into public/ so Astro can serve cover images.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/assets"
rsync -a "$ROOT/assets/" "$ROOT/public/assets/"
