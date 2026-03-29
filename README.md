# Stock, Portfolio, And Sector Analysis Skill

AI skills for U.S. and Korean stock analysis, KRX portfolio monitoring, and Korea-focused sector research. Compatible with both **Codex** and **Claude Code** (Anthropic CLI).

Language docs:

- English: [README.md](README.md)
- Korean: [README-kr.md](README-kr.md)

Included skills:

- `us-stock-analysis` for U.S. stocks and U.S.-listed ETFs
- `kr-stock-plan` for scoping Korean stock research into an execution-ready brief
- `kr-stock-data-pack` for gathering structured company fact packs before drafting
- `kr-stock-analysis` for Korean stock quick views, full memos, event notes, and pair compares
- `kr-stock-update` for dated follow-up updates to an existing Korean stock memo
- `kr-portfolio-monitor` for multi-position KRX portfolio snapshots via Kiwoom REST API or Yahoo fallback
- `kr-sector-plan` for scoping Korea sector research into an execution-ready brief
- `kr-sector-data-pack` for gathering structured sector fact packs before drafting
- `kr-sector-analysis` for Korea sector quick briefs and full reports
- `kr-sector-compare` for same-date Korea sector comparisons
- `kr-sector-audit` for findings-first review of an existing Korea sector memo
- `kr-sector-update` for dated incremental updates to an existing Korea sector memo

## How The Skills Work

These skills are designed to avoid stale-memory analysis.

Shared behavior:

- They are invoked explicitly through their skill names in Codex and Claude Code.
- Stock and portfolio skills treat prices, valuation, filings, guidance, portfolio positions, and news as time-sensitive, so the workflow starts by verifying current sources instead of relying on memory.
- Korea sector skills treat market metrics, policy changes, regulations, company exposure, and industry news as time-sensitive and keep source dates visible.
- When the workspace is writable, the default deliverable is a markdown report file in `analysis-example/<market>/<company>.md` or `analysis-example/kr-sector/<sector>.md`, not just a chat answer.
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

### Korean Stock Skills

Primary instructions:

- [skills/kr-stock-plan/SKILL.md](skills/kr-stock-plan/SKILL.md)
- [skills/kr-stock-data-pack/SKILL.md](skills/kr-stock-data-pack/SKILL.md)
- [skills/kr-stock-analysis/SKILL.md](skills/kr-stock-analysis/SKILL.md)
- [skills/kr-stock-update/SKILL.md](skills/kr-stock-update/SKILL.md)

Current behavior:

1. `kr-stock-plan` converts a vague Korean stock request into a clear security definition, output mode, and research brief.
2. `kr-stock-data-pack` collects dated price context, filings, results, governance facts, valuation inputs, and chart inputs before drafting.
3. `kr-stock-analysis` writes the final output as a `quick view`, `full memo`, `pre-earnings note`, `post-earnings note`, or `pair compare` for KRX-listed companies.
4. `kr-stock-update` preserves the original memo date, refreshes `최근 업데이트일`, and appends or replaces dated follow-up blocks under `## Update Log`.

Bundled helpers:

- `scripts/fetch-kr-chart.js` for current KRX daily bars
- `scripts/chart-basics.js` for technical reads plus labeled PNG chart output
- `scripts/valuation-bands.js` for 3-5 year valuation band summaries
- `scripts/peer-valuation.js` for comparable-company valuation tables
- `skills/kr-stock-update/scripts/extract-report-baseline.js` for parsing memo metadata, update dates, and existing source URLs
- `skills/kr-stock-update/scripts/normalize-update-log.js` for rendering a normalized dated update block and writing it back into the memo

### `kr-portfolio-monitor`

Primary instructions:

- [skills/kr-portfolio-monitor/SKILL.md](skills/kr-portfolio-monitor/SKILL.md)
- [skills/kr-portfolio-monitor/references/workflow.md](skills/kr-portfolio-monitor/references/workflow.md)
- [skills/kr-portfolio-monitor/references/output-format.md](skills/kr-portfolio-monitor/references/output-format.md)
- [skills/kr-portfolio-monitor/references/mcp-setup.md](skills/kr-portfolio-monitor/references/mcp-setup.md)

Current behavior:

1. Check `kiwoom-mcp` connectivity first, then retrieve account balance, live prices, and 30-day daily bars in one pass.
2. Restrict live coverage to domestic KRX holdings supported by Kiwoom REST API. Overseas stocks are out of scope for this skill and must not be implied as covered.
3. Compute SMA20 deviation and RSI14 per holding, flag stretched positions, and summarize total unrealized P&L.
4. Write the rolling snapshot to `analysis-example/kr/portfolio-snapshot.md` when the workspace is writable.
5. If live MCP access is unavailable, fall back to `portfolio-snapshot.js` with manual KRX holdings JSON and Yahoo Finance market data.

Bundled helpers:

- `skills/kr-stock-analysis/scripts/portfolio-snapshot.js` for KRX portfolio snapshots from manual JSON input
- `scripts/test-kiwoom-token.js` for checking Kiwoom OAuth token issuance from `.env.kiwoom`
- `scripts/run-kiwoom-mcp.js` for launching `kiwoom-mcp` locally with repo-managed environment variables

### Korea Sector Skills

Primary instructions:

- [skills/kr-sector-plan/SKILL.md](skills/kr-sector-plan/SKILL.md)
- [skills/kr-sector-data-pack/SKILL.md](skills/kr-sector-data-pack/SKILL.md)
- [skills/kr-sector-analysis/SKILL.md](skills/kr-sector-analysis/SKILL.md)
- [skills/kr-sector-compare/SKILL.md](skills/kr-sector-compare/SKILL.md)
- [skills/kr-sector-audit/SKILL.md](skills/kr-sector-audit/SKILL.md)
- [skills/kr-sector-update/SKILL.md](skills/kr-sector-update/SKILL.md)

Current behavior:

1. `kr-sector-plan` converts a vague Korea sector request into a clear scope, output mode, and section outline.
2. `kr-sector-data-pack` collects dated market metrics, policy events, regulation changes, value-chain facts, and representative public-company references.
3. `kr-sector-analysis` writes either a `quick brief` or a `full report` under `analysis-example/kr-sector/<sector>.md`.
4. `kr-sector-compare` keeps cross-sector comparisons on a same-date basis and ranks the setup only when the evidence supports it.
5. `kr-sector-audit` reviews an existing memo with findings first, prioritizing source, date, and logic integrity over style comments.
6. `kr-sector-update` preserves the original memo date, refreshes `최근 업데이트일`, and appends or replaces a dated block under `## Update Log`.

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
Use $kr-stock-plan to scope 064400.KS into a clear Korean stock research brief with ticker, share class, horizon, output mode, and key questions.
```

```text
Use $kr-stock-data-pack to gather a dated company fact pack for LG CNS with price context, filings, latest results, governance facts, valuation inputs, and chart inputs.
```

```text
Use $kr-stock-analysis to analyze 005930.KS with DART-based evidence, valuation, governance checks, catalysts, and chart context.
```

```text
Use $kr-stock-update to update analysis-example/kr/엘앤에프.md with company-specific disclosures, IR materials, and news after the memo date, and append a dated update block to the same file.
```

```text
Use $kr-portfolio-monitor to scan current Kiwoom-supported KRX holdings, compute SMA20 deviation and RSI14, and write the result to analysis-example/kr/portfolio-snapshot.md.
```

```text
Use $kr-sector-plan to scope a Korea data center sector report into a clean research brief with boundaries, key questions, and the right output mode.
```

```text
Use $kr-sector-data-pack to gather a Korea-focused fact pack for the waste-battery sector with dated policy events, market metrics, and representative listed companies.
```

```text
Use $kr-sector-analysis to write a Korea security-operations market report with market definition, drivers, constraints, value chain, regulation, company map, and source-dated facts.
```

```text
Use $kr-sector-compare to compare Korean robotics and smart-factory sectors on a same-date basis and explain which setup has the cleaner listed exposure.
```

```text
Use $kr-sector-audit to review analysis-example/kr-sector/국내 데이터센터.md for unsupported market claims, stale dates, and listed-exposure overreach.
```

```text
Use $kr-sector-update to update analysis-example/kr-sector/국내 데이터센터.md with policy, regulation, and company developments after the memo date, and append a dated update block.
```

### Claude Code

```text
/us-stock-analysis prepare a dated investment memo for NVDA with valuation, catalysts, risks, and chart context.
```

```text
/kr-stock-plan scope 064400.KS into a clear Korean stock research brief with ticker, share class, horizon, output mode, and key questions.
```

```text
/kr-stock-data-pack gather a dated company fact pack for LG CNS with price context, filings, latest results, governance facts, valuation inputs, and chart inputs.
```

```text
/kr-stock-analysis analyze 005930.KS with DART-based evidence, valuation, governance checks, catalysts, and chart context.
```

```text
/kr-stock-update update analysis-example/kr/엘앤에프.md with company-specific disclosures, IR materials, and news after the memo date, and append a dated update block to the same file.
```

```text
/kr-portfolio-monitor scan current Kiwoom-supported KRX holdings, compute SMA20 deviation and RSI14, and write the result to analysis-example/kr/portfolio-snapshot.md.
```

```text
/kr-sector-plan scope a Korea data center sector report into a clean research brief with boundaries, key questions, and the right output mode.
```

```text
/kr-sector-data-pack gather a Korea-focused fact pack for the waste-battery sector with dated policy events, market metrics, and representative listed companies.
```

```text
/kr-sector-analysis write a Korea security-operations market report with market definition, drivers, constraints, value chain, regulation, company map, and source-dated facts.
```

```text
/kr-sector-compare compare Korean robotics and smart-factory sectors on a same-date basis and explain which setup has the cleaner listed exposure.
```

```text
/kr-sector-audit review analysis-example/kr-sector/국내 데이터센터.md for unsupported market claims, stale dates, and listed-exposure overreach.
```

```text
/kr-sector-update update analysis-example/kr-sector/국내 데이터센터.md with policy, regulation, and company developments after the memo date, and append a dated update block.
```

## Analysis Examples

- [KR - Portfolio Snapshot](analysis-example/kr/portfolio-snapshot.md)
- [KR - 엘앤에프](analysis-example/kr/엘앤에프.md)
- [KR - LG CNS Research Brief](<analysis-example/kr/LG CNS-리서치브리프.md>)
- [KR - LG CNS](<analysis-example/kr/LG CNS.md>)
- [KR - 대양전기공업](analysis-example/kr/대양전기공업.md)
- [KR Sector - 국내 데이터센터](analysis-example/kr-sector/국내%20데이터센터.md)
- [KR Sector - 국내 데이터센터 리서치 브리프](analysis-example/kr-sector/국내%20데이터센터-리서치브리프.md)
- [KR Sector - 국내 IT SI 서비스](analysis-example/kr-sector/국내%20IT%20SI%20서비스.md)
- [KR Sector - 국내 IT SI 서비스 리서치 브리프](analysis-example/kr-sector/국내%20IT%20SI%20서비스-리서치브리프.md)

## Validation

Windows:

```powershell
.\scripts\validate-skills.ps1
```

Linux or macOS:

```bash
bash ./scripts/validate-skills.sh
```
