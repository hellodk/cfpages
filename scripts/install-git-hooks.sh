#!/usr/bin/env bash
# Point this repo at committed hooks in .githooks/ (run via npm prepare)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

git -C "$ROOT" config core.hooksPath .githooks
chmod +x "$ROOT/.githooks/pre-commit" 2>/dev/null || true
echo "Git hooks installed (.githooks/pre-commit → secret scan)"
