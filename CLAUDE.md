# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This repository provides AI skills for producing dated, source-backed equity research analysis for Korean (KRX) and U.S. markets. Skills work with both **Codex** (`$CODEX_HOME/skills/`, default `~/.codex/skills/`) and **Claude Code** (`$CLAUDE_HOME/skills/`, default `~/.claude/skills/`).

## Commands

**Validate skills (checks SKILL.md format, JS syntax, chart generation; warns if openai.yaml missing):**
```bash
bash ./scripts/validate-skills.sh        # Linux/macOS
.\scripts\validate-skills.ps1            # Windows PowerShell
```

**Install a single skill (Codex):**
```bash
bash ./scripts/install-skill.sh kr-stock-analysis
bash ./scripts/install-skill.sh kr-stock-update
bash ./scripts/install-skill.sh kr-portfolio-monitor
bash ./scripts/install-skill.sh us-stock-analysis
```

**Install all skills (Codex):**
```bash
bash ./scripts/install-all-skills.sh
```

**Install a single skill (Claude Code):**
```bash
bash ./scripts/install-claude-skill.sh kr-stock-analysis
bash ./scripts/install-claude-skill.sh kr-stock-update
bash ./scripts/install-claude-skill.sh kr-portfolio-monitor
bash ./scripts/install-claude-skill.sh us-stock-analysis
```

**Install all skills (Claude Code):**
```bash
bash ./scripts/install-all-claude-skills.sh
```

**Run a bundled script directly (Node.js, no npm install needed):**
```bash
node skills/kr-stock-analysis/scripts/chart-basics.js --input examples/kr/chart-sample.json --png-out chart.png
node skills/kr-stock-analysis/scripts/peer-valuation.js --input examples/kr/peer-sample.json
node skills/kr-stock-analysis/scripts/fetch-kr-chart.js --ticker 066970 --range 3mo
node skills/kr-stock-analysis/scripts/portfolio-snapshot.js --input examples/kr/portfolio-sample.json
```

## Architecture

### Skill Structure

Each skill under `skills/<name>/` follows this layout:
- `SKILL.md` — frontmatter (`name:`, `description:`) + full skill prompt (workflow, rules, source hierarchy, output spec)
- `agents/openai.yaml` — Codex agent interface config (`display_name`, `short_description`, `allow_implicit_invocation`)
- `scripts/` — Node.js analysis scripts (no external npm dependencies; pure Node stdlib)
- `references/` — Reference docs loaded as context: `workflow.md`, `output-format.md`, `script-inputs.md`, plus market-specific checklists

### Bundled Scripts

All scripts accept JSON via `--input` and output Markdown or PNG. They use only Node stdlib (fs, https, path, zlib, Intl).

| Script | Purpose |
|---|---|
| `peer-valuation.js` | Markdown comparison table from peer metrics JSON |
| `etf-overlap.js` | Weighted overlap % between two ETF holdings JSON files |
| `chart-basics.js` | Technical summary (SMA20/50, RSI14, volume) + PNG chart from OHLCV JSON |
| `fetch-kr-chart.js` | Fetch KRX OHLCV from Yahoo Finance → JSON for chart-basics (kr only) |
| `valuation-bands.js` | ASCII valuation band charts from historical P/E, EV/EBITDA, P/B JSON (kr only) |
| `extract-report-baseline.js` | Parse an existing KR memo into baseline metadata for follow-up updates |
| `normalize-update-log.js` | Render or append a dated update block to an existing KR memo |
| `portfolio-snapshot.js` | SMA20 deviation + RSI14 snapshot table across multiple KRX positions from JSON (kr only, MCP fallback) |

Input JSON schemas are documented in `references/script-inputs.md` with sample files under `examples/<market>/`.

### Skill Prompt Design

`SKILL.md` is the authoritative skill definition. It encodes:
1. A 6-step workflow (define scope → gather data → build snapshot → stress-test → value → write)
2. Source priority hierarchy (primary filings first, news last)
3. Operating rules (cite sources, exact dates, separate facts from inference)
4. Minimum output standard (mandatory sections every memo must include)
5. Market-specific checklists (governance structures, KRX vs. SEC filing conventions)

### Analysis Examples

`analysis-example/<market>/<company>.md` are live example memos that demonstrate expected skill output. Per `AGENTS.md`: refresh prices/metrics/dates before committing, synchronize embedded PNG charts with the markdown, and use primary sources only. These examples drive the expected output shape — update them when skill output format changes.

## Key Constraints

- **SKILL.md frontmatter is required**: must open and close with `---` and contain `name:` and `description:` fields. Validation will fail otherwise.
- **No npm packages**: all scripts must work with `node` alone. Do not add `require()` calls for non-stdlib modules.
- **Korean tickers**: `fetch-kr-chart.js` accepts bare numeric codes (e.g. `066970`) or explicit `.KS`/`.KQ` suffixes; it retries with `.KS` then `.KQ` automatically.
- **Cross-platform scripts**: every `.sh` script must have a `.ps1` counterpart in `scripts/`. CI tests all three platforms (Ubuntu, macOS, Windows).
