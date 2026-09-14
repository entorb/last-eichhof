#!/bin/sh

# exit upon error
set -e

# ensure we are in the root dir
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR/.."

# 0. prek pre-commit
prek autoupdate

pnpm self-update
pnpm up --latest
pnpm exec biome migrate --write

sh ./scripts/run_checks.sh

echo "update DONE, not yet deployed"
