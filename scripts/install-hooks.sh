#!/usr/bin/env bash
# Point this repo at .githooks/ (tracked) instead of .git/hooks/ (untracked).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: not inside a git repository" >&2
  exit 1
fi

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit scripts/install-hooks.sh

echo "Installed git hooks:"
echo "  core.hooksPath = .githooks"
echo "  pre-commit     → make precommit"
