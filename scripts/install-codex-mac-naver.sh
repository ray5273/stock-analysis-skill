#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

for SKILL_NAME in kr-naver-browse kr-naver-blogger kr-naver-insight; do
    SKILL_INSTALL_FORCE_CODEX_MAC=1 sh "$SCRIPT_DIR/install-skill.sh" "$SKILL_NAME"
done
