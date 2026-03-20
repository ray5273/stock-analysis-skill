---
name: kr-stock-analysis
description: Build dated, source-backed analysis for KRX-listed companies and Korean ETFs. Use when Codex needs to analyze a Korean ticker, compare Korean stocks, prepare a pre-earnings or post-earnings memo, assess valuation, summarize an investment thesis, review catalysts and risks, or add Korea-specific checks for governance, holding-company discounts, export sensitivity, shareholder returns, ETF structure, peer valuation, or chart analysis using DART, KRX, company IR materials, and recent news.
---

# Korean Stock Analysis

Use this skill to produce equity research style analysis for Korean stocks and Korean ETFs without relying on stale memory.

## Quick Start

- Treat prices, market caps, earnings, guidance, shareholder return policy, regulations, and news as time-sensitive. Verify them with current sources before using them.
- Prefer primary sources first: DART filings, KRX disclosures, company IR pages, earnings presentations, ETF fact sheets, and official macro data.
- Pin the scope before analyzing: ticker, market, share class, analysis horizon, comparison set, and desired output type.
- State an explicit "as of" date in the final answer.

## Workflow

1. Define the task.
   Capture the security, market, user goal, time horizon, and whether the user wants a quick view, a deep memo, a comparison, or an event-driven read.
2. Gather verified facts.
   Read current price context, recent DART and KRX disclosures, the latest earnings materials, and any recent company-specific news needed for the question.
3. Build the thesis.
   Explain what drives the business, why the market may be underpricing or overpricing it, and which metrics matter most for this business model.
4. Stress test the idea.
   Check balance sheet strength, cash generation, capex load, governance, treasury shares, cross-holdings, export sensitivity, and plausible bear cases.
5. Value the security.
   Use simple, defensible valuation methods that fit the business. Do not force a DCF when the inputs are too weak.
6. Write the answer.
   Lead with the conclusion, then show evidence, valuation, catalysts, risks, and what would change the view.

Read [references/workflow.md](references/workflow.md) for the detailed checklist.
Read [references/kr-market-checklists.md](references/kr-market-checklists.md) when analyzing KRX growth stocks, value stocks, exporters, holding companies, or Korean ETFs.
Read [references/output-format.md](references/output-format.md) for answer templates.
Read [references/script-inputs.md](references/script-inputs.md) when using the bundled scripts with structured JSON inputs.

## Bundled Scripts

- Use `scripts/peer-valuation.js` when the user provides peer metrics and you need a consistent markdown comparison table.
- Use `scripts/etf-overlap.js` when the user provides two ETF holdings files and you need weighted overlap, common names, and top overlaps.
- Use `scripts/chart-basics.js` when the user provides OHLCV price history and you need a basic technical read on trend, momentum, and volume regime.
- Run all bundled scripts with `node`.

## Operating Rules

- Cite where each important factual claim came from.
- Use exact dates for disclosures, earnings, guidance, and news.
- Separate verified facts from your inference.
- Prefer ranges and scenarios over false precision.
- Say when data is missing or uncertain.
- Distinguish ordinary shares, preferred shares, holding companies, and operating subsidiaries when the listing structure matters.

## Source Priority

1. DART filings, KRX disclosures, and official company IR materials
2. ETF sponsor documents and KRX ETF disclosures
3. Official macro or industry data
4. Reputable local financial media and transcripts for context

## Minimum Output Standard

- Summary judgment
- What the business does and what matters most
- Evidence from current results, balance sheet, and capital allocation
- Valuation view with at least one comparable metric
- Catalysts
- Risks and disconfirming evidence
- Clear "what would change my mind" section
