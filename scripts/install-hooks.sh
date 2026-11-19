#!/usr/bin/env bash
# Point git at the versioned hooks in scripts/hooks, so every clone gets the
# same pre-commit secret scan. Run once after cloning:  ./scripts/install-hooks.sh
set -euo pipefail
cd "$(dirname "$0")/.."
chmod +x scripts/hooks/*
git config core.hooksPath scripts/hooks
echo "Git hooks installed from scripts/hooks (pre-commit: gitleaks secret scan)."
