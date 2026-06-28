#!/usr/bin/env bash
# Fix asset paths for static theme previews (they expect /jasper2/ or /jasper/ base paths).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Vanilla jekyllt/jasper2 gh-pages expects /jasper2/*
if [ -d "$ROOT/theme-previews/jasper2-vanilla" ]; then
  ln -sfn . "$ROOT/theme-previews/jasper2-vanilla/jasper2"
fi

# Legacy hellodk jekyll _site expects /jasper/*
if [ -d "$ROOT/theme-previews/jekyll-master/_site" ]; then
  ln -sfn . "$ROOT/theme-previews/jekyll-master/_site/jasper"
  if [ -d "$ROOT/theme-previews/jekyll-master/assets" ]; then
    rsync -a "$ROOT/theme-previews/jekyll-master/assets/" "$ROOT/theme-previews/jekyll-master/_site/assets/"
  fi
fi

echo "Preview path symlinks OK"
