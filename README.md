# Stock, Portfolio, And Sector Analysis Skill

AI skills for U.S. and Korean stock analysis, KRX portfolio monitoring, and Korea-focused sector research. Compatible with both **Codex** and **Claude Code** (Anthropic CLI).

Language docs:

- English: [README.md](README.md)
- Korean: [README-kr.md](README-kr.md)

Included skills:

Korean stock workflow shorthand: `kr-stock-plan -> kr-stock-dart-analysis -> kr-stock-data-pack -> kr-stock-analysis`

Suggested handoff prompt:

```text
Use $kr-stock-plan to scope a Korean stock request first, route through $kr-stock-dart-analysis when filing precision matters, then build the dated fact base with $kr-stock-data-pack, and finish with $kr-stock-analysis.
```

Concrete example:

```text
Use $kr-stock-plan to scope LG CNS into a 12-24 month full memo. If the latest filing basis, segment detail, backlog, or contract disclosures are important, use $kr-stock-dart-analysis next. Then use $kr-stock-data-pack to assemble dated price, governance, valuation, chart, and outside-view inputs, and finish with $kr-stock-analysis for the final memo.
```

- `us-stock-analysis` for U.S. stocks and U.S.-listed ETFs
- `kr-stock-plan` for scoping Korean stock research into an execution-ready brief
- `kr-stock-dart-analysis` for precise DART filing extraction before broader Korean stock interpretation
- `kr-stock-data-pack` for gathering structured company fact packs before drafting, including optional outside-view inputs
- `kr-stock-analysis` for Korean stock quick views, full memos, event notes, pair compares, street or alternative views in full memos, and follow-up research questions
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
- [skills/kr-stock-dart-analysis/SKILL.md](skills/kr-stock-dart-analysis/SKILL.md)
- [skills/kr-stock-data-pack/SKILL.md](skills/kr-stock-data-pack/SKILL.md)
- [skills/kr-stock-analysis/SKILL.md](skills/kr-stock-analysis/SKILL.md)
- [skills/kr-stock-analysis/references/blended-source-notes.md](skills/kr-stock-analysis/references/blended-source-notes.md)
- [skills/kr-stock-update/SKILL.md](skills/kr-stock-update/SKILL.md)

Current behavior:

1. `kr-stock-plan` converts a vague Korean stock request into a clear security definition, output mode, key questions, and a recommended workflow.
2. `kr-stock-dart-analysis` acts as the filing-precision stage when the work depends on exact DART-backed result, segment, customer, backlog, contract, or disclosure wording detail, with visible source mapping and standalone-quarter derivation notes when the filing is cumulative.
3. `kr-stock-data-pack` collects dated price context, filings, results, governance facts, valuation inputs, chart inputs, and optional outside-view inputs before drafting.
4. `kr-stock-analysis` writes the final output as a `quick view`, `full memo`, `pre-earnings note`, `post-earnings note`, or `pair compare` for KRX-listed companies, and full memos now add a `Street / Alternative Views` section before valuation and end with company-specific follow-up research questions tied to current evidence gaps.
5. `kr-stock-update` preserves the original memo date, refreshes `최근 업데이트일`, and appends or replaces dated follow-up blocks under `## Update Log`.
6. `kr-stock-analysis` chart output now defaults to a split view so price action is easier to read: one main PNG for `OHLC candlesticks + close line + MA5/20/60/120 + volume`, plus one overlay PNG for `Bollinger + Ichimoku + RSI14`.

Recommended pipeline:

```text
kr-stock-plan
  -> lock security, mode, and must-answer questions
  -> if filing precision matters: kr-stock-dart-analysis
  -> kr-stock-data-pack
  -> kr-stock-analysis
```

Routing guide:

- Start with `kr-stock-plan` when the request is still ambiguous on ticker, share class, horizon, compare mode, or deliverable shape.
- Insert `kr-stock-dart-analysis` when the conclusion depends on exact DART wording, standalone-quarter derivation, segment detail, customer concentration, backlog, or contract disclosures.
- Use `kr-stock-data-pack` to assemble the dated fact base around price, governance, valuation, chart, and outside-view inputs.
- Finish with `kr-stock-analysis` for the final memo, event note, quick view, or pair compare.

Bundled helpers:

- `scripts/fetch-kr-chart.js` for current KRX daily bars
- `scripts/chart-basics.js` for technical reads plus split PNG chart output that separates the main trend view from heavier overlays
- `scripts/chart-basics.js` now draws KR main charts with candlesticks, a close line, and a current-price guide, and uses Korean chart labels when a Hangul-capable local font is available
- `scripts/chart-basics.js` writes the requested `--png-out` path as the main trend chart and writes a sibling `*-overlay.png` file for the heavier indicator view
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

Example research brief:

- [analysis-example/kr-sector/국내 대기업집단 IT서비스사 지배구조-리서치브리프.md](analysis-example/kr-sector/국내%20대기업집단%20IT서비스사%20지배구조-리서치브리프.md)

Example data pack:

- [analysis-example/kr-sector/국내 대기업집단 IT서비스사 지배구조-data-pack.md](analysis-example/kr-sector/국내%20대기업집단%20IT서비스사%20지배구조-data-pack.md)

Example full report:

- [analysis-example/kr-sector/국내 대기업집단 IT서비스사 지배구조.md](analysis-example/kr-sector/국내%20대기업집단%20IT서비스사%20지배구조.md)

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
Use $kr-stock-dart-analysis to extract a filing-grounded summary for LG CNS covering the latest quarterly or half-year revenue, operating profit, segment differences, customer concentration, and any standalone-quarter derivations needed from cumulative DART figures.
```

```text
Use $kr-stock-dart-analysis to check a Korean company's disclosed order backlog, compare it with same-basis annual revenue, and report backlog coverage in Korean with clear source mapping and a note that the ratio is derived rather than a formally disclosed KPI.
```

```text
Use $kr-stock-dart-analysis to list all disclosed single-sales or supply contracts for a Korean company over the last 12 months, keeping original notices, amendments, counterparties, amounts, sales ratios, contract periods, and latest status visible row by row.
```

```text
Use $kr-stock-dart-analysis to list all disclosed single-sales or supply contracts for a Korean company and add a maturity table showing how much current effective contract amount ends by 2027, by 2028, and by each later year, clearly labeled as contract-period coverage rather than formal backlog unless the filing discloses backlog.
```

```text
Use $kr-stock-data-pack to gather a dated company fact pack for LG CNS with price context, filings, latest results, governance facts, valuation inputs, chart inputs, and outside-view inputs from sell-side or specialist media.
```

```text
Use $kr-stock-analysis to analyze 005930.KS with DART-based evidence, street or alternative views, valuation, governance checks, catalysts, chart context, and follow-up research questions.
```

```text
Use $kr-stock-update to update analysis-example/kr/엘앤에프/memo.md with company-specific disclosures, IR materials, and news after the memo date, and append a dated update block to the same file.
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
/kr-stock-dart-analysis extract a filing-grounded summary for LG CNS covering the latest quarterly or half-year revenue, operating profit, segment differences, customer concentration, and any standalone-quarter derivations needed from cumulative DART figures.
```

```text
/kr-stock-dart-analysis list all disclosed single-sales or supply contracts for a Korean company over the last 12 months, keeping original notices, amendments, counterparties, amounts, sales ratios, contract periods, and latest status visible row by row.
```

```text
/kr-stock-dart-analysis list all disclosed single-sales or supply contracts for a Korean company and add a maturity table showing how much current effective contract amount ends by 2027, by 2028, and by each later year, clearly labeled as contract-period coverage rather than formal backlog unless the filing discloses backlog.
```

```text
/kr-stock-data-pack gather a dated company fact pack for LG CNS with price context, filings, latest results, governance facts, valuation inputs, chart inputs, and outside-view inputs from sell-side or specialist media.
```

```text
/kr-stock-analysis analyze 005930.KS with DART-based evidence, street or alternative views, valuation, governance checks, catalysts, chart context, and follow-up research questions.
```

```text
/kr-stock-update update analysis-example/kr/엘앤에프/memo.md with company-specific disclosures, IR materials, and news after the memo date, and append a dated update block to the same file.
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
- [KR - 엘앤에프](<analysis-example/kr/엘앤에프/memo.md>)
- [KR - LG CNS Research Brief](<analysis-example/kr/LG CNS/리서치브리프.md>)
- [KR - LG CNS DART 분석](<analysis-example/kr/LG CNS/dart-analysis.md>)
- [KR - LG CNS 수주 통합 분석](<analysis-example/kr/LG CNS/수주통합분석.md>)
- [KR - LG CNS](<analysis-example/kr/LG CNS/memo.md>)
- [KR - LG전자 DART 분석](<analysis-example/kr/LG전자/dart-analysis.md>)
- [KR - 두산에너빌리티 DART 분석](<analysis-example/kr/두산에너빌리티/dart-analysis.md>)
- [KR - 두산에너빌리티 수주 통합 분석](<analysis-example/kr/두산에너빌리티/수주통합분석.md>)
- [KR - 한전KPS 수주계약 리스트](<analysis-example/kr/한전KPS/수주계약리스트.md>)
- [KR - 한미글로벌 수주계약 리스트](<analysis-example/kr/한미글로벌/수주계약리스트.md>)
- [KR - 대양전기공업](<analysis-example/kr/대양전기공업/memo.md>)
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
