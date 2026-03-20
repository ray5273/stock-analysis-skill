# Stock Analysis Skill

AI skills for U.S. and Korean stock analysis. Compatible with both **Codex** and **Claude Code** (Anthropic CLI).

Language docs:

- English: [README.md](README.md)
- Korean: [README-kr.md](README-kr.md)

Included skills:

- `us-stock-analysis` for U.S. stocks and U.S.-listed ETFs
- `kr-stock-analysis` for KRX-listed stocks and Korean ETFs
- `kr-analysis-update` for dated follow-up updates to an existing Korean stock memo

## How The Skills Work

Both skills are designed to avoid stale-memory analysis.

Shared behavior:

- They are invoked explicitly through `$us-stock-analysis`, `$kr-stock-analysis`, or `$kr-analysis-update` in Codex, and `/us-stock-analysis`, `/kr-stock-analysis`, or `/kr-analysis-update` in Claude Code.
- They treat prices, valuation, filings, guidance, and news as time-sensitive, so the workflow starts by verifying current sources instead of relying on memory.
- When the workspace is writable, the default deliverable is a markdown report file in `analysis-example/<market>/<company>.md`, not just a chat answer.
- The report file should stay synchronized with the final answer, with an explicit "as of" date.

### `us-stock-analysis`

Primary instructions:

- [skills/us-stock-analysis/SKILL.md](skills/us-stock-analysis/SKILL.md)
- [skills/us-stock-analysis/references/workflow.md](skills/us-stock-analysis/references/workflow.md)
- [skills/us-stock-analysis/references/output-format.md](skills/us-stock-analysis/references/output-format.md)

Current behavior:

1. Define scope first: ticker, exchange, time horizon, comparison set, and whether the request is a full memo, comparison, pre-earnings note, or post-earnings note.
2. Verify fresh inputs from primary sources, starting with SEC filings and investor relations materials, then company news and market data checks.
3. Build a thesis around business quality, financial quality, capital allocation, catalysts, and risks.
4. Apply a valuation method that fits the company instead of forcing one template across all business models.
5. Write the final output in the default memo format when appropriate: summary, business and thesis, latest results, valuation, catalysts, risks, and what would change the view.

Bundled helpers:

- `scripts/peer-valuation.js` for comparable-company valuation tables
- `scripts/etf-overlap.js` for ETF overlap analysis
- `scripts/chart-basics.js` for basic technical trend and momentum reads from provided OHLCV data

### `kr-stock-analysis`

Primary instructions:

- [skills/kr-stock-analysis/SKILL.md](skills/kr-stock-analysis/SKILL.md)
- [skills/kr-stock-analysis/references/workflow.md](skills/kr-stock-analysis/references/workflow.md)
- [skills/kr-stock-analysis/references/output-format.md](skills/kr-stock-analysis/references/output-format.md)

Current behavior:

1. Define scope first: exact ticker, market, share class, horizon, and whether the request is a memo, comparison, or event-driven read.
2. Verify fresh inputs with Korean primary sources first, especially DART filings, KRX disclosures, company IR materials, ETF sponsor documents, and then recent news.
3. Build the thesis with Korea-specific checks such as revenue mix disclosure quality, export sensitivity, treasury shares, governance, ownership structure, and shareholder return policy.
4. Assemble a current valuation snapshot, and add historical valuation bands when enough data exists.
5. Add chart context when price history is available, including a PNG chart asset for memo files under `analysis-example/kr/assets/`.
6. Write the final output in the Korean memo format: summary, business and thesis, revenue mix, latest results, valuation snapshot, valuation bands, chart and positioning, governance and structure, catalysts, risks, and what would change the view.

Bundled helpers:

- `scripts/fetch-kr-chart.js` for current KRX daily bars
- `scripts/chart-basics.js` for technical reads plus labeled PNG chart output
- `scripts/valuation-bands.js` for 3-5 year valuation band summaries
- `scripts/peer-valuation.js` for comparable-company valuation tables
- `scripts/etf-overlap.js` for ETF overlap analysis

### `kr-analysis-update`

Primary instructions:

- [skills/kr-analysis-update/SKILL.md](skills/kr-analysis-update/SKILL.md)
- [skills/kr-analysis-update/references/workflow.md](skills/kr-analysis-update/references/workflow.md)
- [skills/kr-analysis-update/references/output-format.md](skills/kr-analysis-update/references/output-format.md)

Current behavior:

1. Read an existing Korean stock memo under `analysis-example/kr/<company>.md`.
2. Use the memo's `기준일` as the start date for follow-up research.
3. Gather only company-specific disclosures, IR materials, and news published after that memo date.
4. Judge whether those developments changed the thesis, risk, or monitoring list.
5. Refresh `최근 업데이트일` and append a dated block under `## Update Log` in the same memo file.

Bundled helpers:

- `scripts/extract-report-baseline.js` for parsing memo metadata, update dates, and existing source URLs
- `scripts/normalize-update-log.js` for rendering a normalized dated update block and writing it back into the memo

## Install

### Codex

Install target: `$CODEX_HOME/skills/<skill-name>` (default: `~/.codex/skills/`)

Windows:

```powershell
.\scripts\install-skill.ps1 us-stock-analysis
.\scripts\install-all-skills.ps1
```

Linux or macOS:

```bash
bash ./scripts/install-skill.sh us-stock-analysis
bash ./scripts/install-all-skills.sh
```

Custom target:

```bash
CODEX_HOME=/tmp/codex-home bash ./scripts/install-all-skills.sh
```

### Claude Code

Install target: `$CLAUDE_HOME/skills/<skill-name>` (default: `~/.claude/skills/`)

Windows:

```powershell
.\scripts\install-claude-skill.ps1 us-stock-analysis
.\scripts\install-all-claude-skills.ps1
```

Linux or macOS:

```bash
bash ./scripts/install-claude-skill.sh us-stock-analysis
bash ./scripts/install-all-claude-skills.sh
```

Custom target:

```bash
CLAUDE_HOME=/tmp/claude-home bash ./scripts/install-all-claude-skills.sh
```

## Usage

### Codex

```text
Use $us-stock-analysis to prepare a dated investment memo for NVDA with valuation, catalysts, risks, and chart context.
```

```text
Use $kr-stock-analysis to analyze 005930.KS with DART-based evidence, valuation, governance checks, and catalysts.
```

```text
Use $kr-analysis-update to update analysis-example/kr/엘앤에프.md with company-specific disclosures, IR materials, and news after the memo date, and append a dated update block to the same file.
```

### Claude Code

```text
/us-stock-analysis prepare a dated investment memo for NVDA with valuation, catalysts, risks, and chart context.
```

```text
/kr-stock-analysis analyze 005930.KS with DART-based evidence, valuation, governance checks, and catalysts.
```

```text
/kr-analysis-update update analysis-example/kr/엘앤에프.md with company-specific disclosures, IR materials, and news after the memo date, and append a dated update block to the same file.
```

## Analysis Examples

- [KR - 엘앤에프](analysis-example/kr/엘앤에프.md)
- [KR - LG CNS](<analysis-example/kr/LG CNS.md>)
- [KR - 대양전기공업](analysis-example/kr/대양전기공업.md)

## Validation

Windows:

```powershell
.\scripts\validate-skills.ps1
```

Linux or macOS:

```bash
bash ./scripts/validate-skills.sh
```
