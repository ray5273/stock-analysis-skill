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
    echo "Validating $SKILL_NAME..."

    if [ ! -f "$SKILL_DIR/SKILL.md" ]; then
        echo "Missing required file: $SKILL_DIR/SKILL.md" >&2
        exit 1
    fi

    if [ ! -f "$SKILL_DIR/agents/openai.yaml" ]; then
        echo "Missing required file: $SKILL_DIR/agents/openai.yaml" >&2
        exit 1
    fi

    node -e '
const fs = require("fs");
const file = process.argv[1];
const text = fs.readFileSync(file, "utf8");
const pattern = /^(---)\r?\nname:\s.+\r?\ndescription:\s.+\r?\n---/s;
if (!pattern.test(text)) {
  console.error(`Invalid or missing frontmatter in ${file}`);
  process.exit(1);
}
' "$SKILL_DIR/SKILL.md"

    find "$SKILL_DIR" -type f -name "*.js" | sort | while IFS= read -r JS_FILE; do
        node --check "$JS_FILE" >/dev/null
    done
done

echo "Validation passed."
