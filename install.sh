#!/usr/bin/env bash
# Installs clone-to-figma (command + 3 agents + test) into ~/.claude
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="${CLAUDE_HOME:-$HOME/.claude}"

mkdir -p "$DEST/commands" "$DEST/agents" "$DEST/tests/clone-to-figma"
cp "$HERE/commands/"*.md "$DEST/commands/"
cp "$HERE/agents/"*.md "$DEST/agents/"
cp "$HERE/tests/slot-rules.test.mjs" "$DEST/tests/clone-to-figma/"

node "$DEST/tests/clone-to-figma/slot-rules.test.mjs" | tail -1
echo "Done. In Claude Code: /clone-to-figma <url>"
