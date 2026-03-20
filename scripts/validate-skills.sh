#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
SKILLS_ROOT="$REPO_ROOT/skills"
TMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/stock-skill-validate.XXXXXX")

cleanup() {
    rm -rf "$TMP_ROOT"
}

trap cleanup EXIT INT TERM

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
        echo "Warning: $SKILL_DIR/agents/openai.yaml not found (required for Codex, not needed for Claude Code)"
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

    if [ "$SKILL_NAME" = "kr-stock-analysis" ]; then
        CHART_SAMPLE="$REPO_ROOT/examples/kr-stock-analysis/chart-sample.json"
        CHART_SCRIPT="$SKILL_DIR/scripts/chart-basics.js"
        FETCH_SCRIPT="$SKILL_DIR/scripts/fetch-kr-chart.js"
        CHART_OUT="$TMP_ROOT/$SKILL_NAME-chart.png"

        node "$CHART_SCRIPT" --input "$CHART_SAMPLE" --png-out "$CHART_OUT" --image-path "chart.png" >/dev/null
        if [ ! -s "$CHART_OUT" ]; then
            echo "Expected chart PNG was not created: $CHART_OUT" >&2
            exit 1
        fi

        node "$FETCH_SCRIPT" --help >/dev/null
    fi
done

echo "Validation passed."
