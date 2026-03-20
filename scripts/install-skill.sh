#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <skill-name>" >&2
    exit 1
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
SKILL_NAME=$1
SOURCE_PATH="$REPO_ROOT/skills/$SKILL_NAME"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
TARGET_ROOT="$CODEX_HOME_DIR/skills"
TARGET_PATH="$TARGET_ROOT/$SKILL_NAME"

if [ ! -d "$SOURCE_PATH" ]; then
    echo "Skill not found: $SKILL_NAME" >&2
    exit 1
fi

mkdir -p "$TARGET_PATH"
cp -R "$SOURCE_PATH"/. "$TARGET_PATH"/

printf 'Installed %s to %s\n' "$SKILL_NAME" "$TARGET_PATH"
