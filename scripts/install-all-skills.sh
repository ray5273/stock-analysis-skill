#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
SKILLS_ROOT="$REPO_ROOT/skills"

SKILL_COUNT=$(find "$SKILLS_ROOT" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d '[:space:]')
if [ "$SKILL_COUNT" -eq 0 ]; then
    echo "No skills found under $SKILLS_ROOT" >&2
    exit 1
fi

find "$SKILLS_ROOT" -mindepth 1 -maxdepth 1 -type d | sort | while IFS= read -r SKILL_DIR; do
    SKILL_NAME=$(basename "$SKILL_DIR")
    sh "$SCRIPT_DIR/install-skill.sh" "$SKILL_NAME"
done
