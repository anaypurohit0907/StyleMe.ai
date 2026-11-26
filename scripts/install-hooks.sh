#!/usr/bin/env bash
# Install the shared-box git hooks (T-070). Run once per clone/worktree:
#   bash scripts/install-hooks.sh
set -euo pipefail
repo_root="$(git rev-parse --show-toplevel)"
chmod +x "$repo_root/.githooks/pre-push"
git -C "$repo_root" config core.hooksPath .githooks
echo "hooks installed: core.hooksPath=.githooks (pre-push release gate active)"
