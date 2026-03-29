---
name: kr-stock-analysis
description: Build dated, source-backed analysis for KRX-listed companies. Use when analyzing a Korean ticker, writing a quick view, a full memo, a pre-earnings note, a post-earnings note, or a same-date pair compare for KRX-listed operating companies, holding companies, or preferred-share lines using DART, KRX, company IR materials, valuation checks, and chart context. Do not use for ETF analysis, portfolio monitoring, scope-only planning, or incremental memo updates.
---

# Korean Stock Analysis

Use this skill to write the final Korean stock memo or event note.

## Quick Start

- Treat prices, market caps, earnings, guidance, shareholder return policy, regulations, and company news as time-sensitive.
- Prefer using a scoped brief from `kr-stock-plan` and a fact pack from `kr-stock-data-pack` before drafting.
- Route the output mode early.
  - `quick view` for compact decision support
  - `full memo` for deeper initiation-style analysis
  - `pre-earnings note` or `post-earnings note` for event reads
  - `pair compare` for same-date stock comparisons
- If the workspace is writable, create or update `analysis-example/kr/<company>.md`.
- State an explicit `기준일` in the memo and keep each metric block honest about its source date.

## Workflow

1. Lock the mode.
   Confirm whether the user wants a quick view, full memo, event note, or pair compare.
2. Load prior work.
   Reuse the planning brief and data pack when available instead of re-scoping from scratch.
3. Refresh material facts.
   Verify only the latest company facts needed to support the conclusion.
4. Build the memo.
   Separate verified facts from inference and keep section boundaries clean.
5. Use the right helpers.
   Pull chart, valuation-band, and peer-comparison helpers only when they materially improve the output.
6. Write the file deliverable.
   Keep the markdown memo synchronized with the final answer.

Read [references/workflow.md](references/workflow.md) for the analysis checklist.
Read [references/kr-market-checklists.md](references/kr-market-checklists.md) when analyzing Korean growth stocks, value stocks, exporters, or holding companies.
Read [references/output-format.md](references/output-format.md) for the default memo shapes.
Read [references/script-inputs.md](references/script-inputs.md) when using the bundled scripts with structured JSON inputs.

## Bundled Scripts

- Use `scripts/peer-valuation.js` when the user provides peer metrics and you need a consistent markdown comparison table.
- Use `scripts/fetch-kr-chart.js` when you need current KRX daily bars and the user did not already provide OHLCV history.
- Use `scripts/chart-basics.js` when you need a technical read plus a labeled PNG chart that can be embedded into a markdown memo.
- Use `scripts/valuation-bands.js` when the user provides 3-5 years of historical valuation multiples and you need markdown tables plus ASCII band charts for P/E, EV/EBITDA, and P/B.
- Run all bundled scripts with `node`.

## Operating Rules

- Cite where each important factual claim came from.
- Use exact dates for disclosures, earnings, guidance, and news.
- Separate verified facts from your inference.
- Prefer ranges and scenarios over false precision.
- Say when data is missing or uncertain.
- If revenue mix, customer concentration, or a valuation metric is not disclosed cleanly, say so and explain what the current source set does and does not provide.
- Distinguish ordinary shares, preferred shares, holding companies, and operating subsidiaries when the listing structure matters.
- If you produced a full single-stock memo, keep the file deliverable synchronized with the final chat answer rather than letting the report drift.
- Route ETF work elsewhere instead of bending this skill back into mixed security coverage.

## Source Priority

1. DART filings, KRX disclosures, and official company IR materials
2. Official governance pages, shareholder-return disclosures, and exchange notices
3. Official macro or industry data when company context requires it
4. Reputable local financial media and transcripts for context

## Minimum Output Standard

- Summary judgment
- What the business does and what matters most
- Revenue mix across product or segment, geography, and customer concentration when disclosed
- Evidence from current results, balance sheet, and capital allocation
- Current valuation snapshot with price, market cap, trailing PER, forward PER, EV/EBITDA, P/B, and FCF yield
- Historical valuation bands for P/E, EV/EBITDA, and P/B over 3-5 years when the data can be assembled
- Chart and positioning context with MA5, MA20, MA60, MA120, Bollinger Bands, Ichimoku, RSI, volume regime, key levels, and a chart-only flow conclusion when price history can be assembled
- A PNG chart reference in markdown when enough price history can be fetched or assembled for a memo file
- Governance and structure checks with why they matter
- Catalysts
- Risks and disconfirming evidence
- Clear `what would change my mind` section
