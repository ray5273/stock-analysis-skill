#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
SKILLS_ROOT="$REPO_ROOT/skills"
TMP_BASE="$REPO_ROOT/.tmp"
mkdir -p "$TMP_BASE"
TMP_ROOT=$(mktemp -d "$TMP_BASE/stock-skill-validate.XXXXXX")
SECTOR_SKILLS="kr-sector-plan kr-sector-data-pack kr-sector-analysis kr-sector-compare kr-sector-audit kr-sector-update"

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

    case " $SECTOR_SKILLS " in
        *" $SKILL_NAME "*)
            if [ ! -f "$SKILL_DIR/references/workflow.md" ]; then
                echo "Missing required sector reference file: $SKILL_DIR/references/workflow.md" >&2
                exit 1
            fi
            if [ ! -f "$SKILL_DIR/references/output-format.md" ]; then
                echo "Missing required sector reference file: $SKILL_DIR/references/output-format.md" >&2
                exit 1
            fi
            ;;
    esac

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

    if [ "$SKILL_NAME" = "kr-stock-update" ]; then
        BASELINE_SCRIPT="$SKILL_DIR/scripts/extract-report-baseline.js"
        NORMALIZE_SCRIPT="$SKILL_DIR/scripts/normalize-update-log.js"
        REPORT_SAMPLE="$REPO_ROOT/analysis-example/kr/LG CNS.md"
        UPDATE_JSON="$TMP_ROOT/kr-stock-update.json"
        UPDATE_JSON_REPLACE="$TMP_ROOT/kr-stock-update-replace.json"
        UPDATED_REPORT="$TMP_ROOT/kr-stock-update.md"
        BASELINE_OUT="$TMP_ROOT/kr-stock-update-baseline.json"

        node "$BASELINE_SCRIPT" --input "$REPORT_SAMPLE" --output "$BASELINE_OUT" >/dev/null
        if ! grep -q '"memoDate": "2026-03-20"' "$BASELINE_OUT"; then
            echo "Baseline parser did not capture the memo date." >&2
            exit 1
        fi

        cat > "$UPDATE_JSON" <<'EOF'
{
  "date": "2026-03-27",
  "whatHappened": [
    "No material company-specific update found after the memo date."
  ],
  "whyItMatters": [
    "The original memo remains the operative baseline."
  ],
  "whatChangedInThesis": [
    "No material thesis change."
  ],
  "whatDidNotChange": [
    "The base view and risk framing remain intact."
  ],
  "signalsToWatchNext": [
    "Watch the next earnings release or capital-allocation event."
  ],
  "sources": [
    {
      "label": "Validation placeholder source",
      "url": "https://example.com/placeholder",
      "date": "2026-03-27"
    }
  ]
}
EOF

        cat > "$UPDATE_JSON_REPLACE" <<'EOF'
{
  "date": "2026-03-27",
  "whatHappened": [
    "Replacement update for the same date."
  ],
  "whyItMatters": [
    "This validates same-date replacement behavior."
  ],
  "whatChangedInThesis": [
    "No material thesis change."
  ],
  "whatDidNotChange": [
    "The base view and risk framing remain intact."
  ],
  "signalsToWatchNext": [
    "Watch the next earnings release or capital-allocation event."
  ],
  "sources": [
    {
      "label": "Validation replacement source",
      "url": "https://example.com/replacement",
      "date": "2026-03-27"
    }
  ]
}
EOF

        node "$NORMALIZE_SCRIPT" --input "$UPDATE_JSON" >/dev/null
        cp "$REPORT_SAMPLE" "$UPDATED_REPORT"
        node "$NORMALIZE_SCRIPT" --input "$UPDATE_JSON" --report "$UPDATED_REPORT" >/dev/null
        node "$NORMALIZE_SCRIPT" --input "$UPDATE_JSON_REPLACE" --report "$UPDATED_REPORT" >/dev/null

        if [ "$(grep -c '^### 2026-03-27 Update$' "$UPDATED_REPORT")" -ne 1 ]; then
            echo "Expected exactly one dated update block after replacement." >&2
            exit 1
        fi
        if ! grep -q '^최근 업데이트일: 2026-03-27$' "$UPDATED_REPORT"; then
            echo "Expected 최근 업데이트일 to be inserted or refreshed." >&2
            exit 1
        fi
        if ! grep -q 'Replacement update for the same date\.' "$UPDATED_REPORT"; then
            echo "Expected replacement content to exist in updated report." >&2
            exit 1
        fi
        if grep -q 'Validation placeholder source' "$UPDATED_REPORT"; then
            echo "Expected previous same-date content to be replaced, not duplicated." >&2
            exit 1
        fi
    fi
done

SECTOR_EXAMPLE_ROOT="$REPO_ROOT/analysis-example/kr-sector"
if [ ! -d "$SECTOR_EXAMPLE_ROOT" ]; then
    echo "Missing sector analysis example directory: $SECTOR_EXAMPLE_ROOT" >&2
    exit 1
fi

STOCK_PLAN_EXAMPLE_COUNT=$(find "$REPO_ROOT/analysis-example/kr" -maxdepth 1 -type f -name "LG CNS-*.md" | wc -l | tr -d '[:space:]')
if [ "$STOCK_PLAN_EXAMPLE_COUNT" -lt 1 ]; then
    echo "Missing stock planning example file under analysis-example/kr matching LG CNS-*.md" >&2
    exit 1
fi

SECTOR_EXAMPLE_COUNT=$(find "$SECTOR_EXAMPLE_ROOT" -maxdepth 1 -type f -name "*.md" | wc -l | tr -d '[:space:]')
if [ "$SECTOR_EXAMPLE_COUNT" -lt 2 ]; then
    echo "Expected at least two sector example markdown files under $SECTOR_EXAMPLE_ROOT" >&2
    exit 1
fi

echo "Validation passed."
