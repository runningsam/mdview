#!/usr/bin/env bash
# MDView Skill Installer
# Detects your AI agent and installs the mdview skill automatically.
# Usage: curl -sL https://mdview.code123.in/install.sh | bash

set -euo pipefail

SKILL_URL="https://mdview.code123.in/skill"
SKILL_DIR_NAME="mdview"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}📦 MDView Skill Installer${NC}"
echo ""

# --- Step 1: Download skill files to a temp location ---
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading skill files..."
curl -sL "$SKILL_URL/SKILL.md" -o "$TMP_DIR/SKILL.md"
mkdir -p "$TMP_DIR/scripts"
curl -sL "$SKILL_URL/scripts/upload.sh" -o "$TMP_DIR/scripts/upload.sh"
chmod +x "$TMP_DIR/scripts/upload.sh"

echo -e "${GREEN}✓${NC} Skill files downloaded"
echo ""

# --- Step 2: Detect agents and install ---
installed=0

install_to() {
    local dest="$1"
    local label="$2"
    mkdir -p "$dest"
    cp "$TMP_DIR/SKILL.md" "$dest/SKILL.md"
    if [ -d "$TMP_DIR/scripts" ]; then
        rm -rf "$dest/scripts" 2>/dev/null || true
        cp -r "$TMP_DIR/scripts" "$dest/"
    fi
    echo -e "  ${GREEN}✓${NC} $label → $dest"
    installed=1
}

# Claude Code
if [ -d "$HOME/.claude" ] || command -v claude &>/dev/null; then
    install_to "$HOME/.claude/skills/$SKILL_DIR_NAME" "Claude Code"
fi

# pi
if [ -d "$HOME/.pi" ] || command -v pi &>/dev/null; then
    install_to "$HOME/.pi/agent/skills/$SKILL_DIR_NAME" "pi"
fi

# Codex / OpenAI Codex
if [ -d "$HOME/.codex" ] || command -v codex &>/dev/null; then
    install_to "$HOME/.codex/skills/$SKILL_DIR_NAME" "Codex"
fi

# Cursor
if [ -d "$HOME/.cursor" ] || command -v cursor &>/dev/null; then
    install_to "$HOME/.cursor/skills/$SKILL_DIR_NAME" "Cursor"
fi

# OpenCode
if [ -d "$HOME/.opencode" ] || command -v opencode &>/dev/null; then
    install_to "$HOME/.opencode/skills/$SKILL_DIR_NAME" "OpenCode"
fi

# Generic: ~/.agents/skills/ (universal fallback)
if [ $installed -eq 0 ]; then
    install_to "$HOME/.agents/skills/$SKILL_DIR_NAME" "Generic (~/.agents/skills/)"
    echo ""
    echo -e "${YELLOW}⚠${NC}  No known AI agent detected. Skill installed to ~/.agents/skills/"
    echo "   If your agent doesn't pick it up, add this path to its skills config."
fi

echo ""
echo -e "${GREEN}✅ Done!${NC} Your AI agent can now upload markdown to MDView."
echo ""
echo "   Try saying: \"Upload README.md to MDView\""
