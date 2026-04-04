---
name: kr-stock-analysis
description: Build dated, source-backed analysis for KRX-listed companies. Use when analyzing a Korean ticker, writing a quick view, a full memo, a pre-earnings note, a post-earnings note, or a same-date pair compare for KRX-listed operating companies, holding companies, or preferred-share lines using DART, KRX, company IR materials, valuation checks, chart context, and, for full memos, sell-side or alternative views plus company-specific follow-up research questions. Do not use for ETF analysis, portfolio monitoring, scope-only planning, or incremental memo updates.
---

# Korean Stock Analysis

Use this skill to write the final Korean stock memo or event note.

## Quick Start

- Treat prices, market caps, earnings, guidance, shareholder return policy, regulations, and company news as time-sensitive.
- Prefer using a scoped brief from `kr-stock-plan` and a fact pack from `kr-stock-data-pack` before drafting.
- When the latest filing details are central to the conclusion, strongly prefer a `kr-stock-dart-analysis` pass before drafting so segment, margin, and disclosure wording stay exact.
- Route the output mode early.
  - `quick view` for compact decision support
  - `full memo` for deeper initiation-style analysis
  - `pre-earnings note` or `post-earnings note` for event reads
  - `pair compare` for same-date stock comparisons
- If the workspace is writable, create or update `analysis-example/kr/<company>/memo.md`.
- State an explicit `기준일` in the memo and keep each metric block honest about its source date.
- For a `full memo`, add `Street / Alternative Views` before valuation and end with `Additional Research Questions` that turn the biggest evidence gaps into next-step diligence.

## Workflow

1. Lock the mode.
   Confirm whether the user wants a quick view, full memo, event note, or pair compare.
2. Load prior work.
   Reuse the planning brief, `kr-stock-dart-analysis` output, and data pack when available instead of re-scoping from scratch.
3. Refresh material facts.
   Verify the latest company facts needed to support the conclusion and anchor material numbers to primary sources.
4. Scan outside views.
   Pull sell-side notes, specialist media, or independent long-form analysis to surface market framing, disagreements, and open questions.
5. Build the memo.
   Separate verified facts from inference, keep section boundaries clean, and label what came from primary sources versus outside interpretation.
6. Surface follow-up diligence.
   Review the draft for missing disclosures, unverified assumptions, rerating conditions, and unresolved outside claims, then convert only the highest-impact gaps into company-specific research questions.
7. Use the right helpers.
   Pull chart, valuation-band, and peer-comparison helpers only when they materially improve the output.
8. Write the file deliverable.
   Keep the markdown memo synchronized with the final answer.

Read [references/workflow.md](references/workflow.md) for the analysis checklist.
Read [references/kr-market-checklists.md](references/kr-market-checklists.md) when analyzing Korean growth stocks, value stocks, exporters, or holding companies.
Read [references/output-format.md](references/output-format.md) for the default memo shapes.
Read [references/blended-source-notes.md](references/blended-source-notes.md) when you need to balance primary filings with sell-side, specialist-media, or independent views.
Read [references/script-inputs.md](references/script-inputs.md) when using the bundled scripts with structured JSON inputs.

## Bundled Scripts

- Use `scripts/peer-valuation.js` when the user provides peer metrics and you need a consistent markdown comparison table.
- Use `scripts/fetch-kr-chart.js` when you need current KRX daily bars and the user did not already provide OHLCV history.
- Use `scripts/chart-basics.js` when you need a technical read plus split PNG charts that separate the main price trend from heavier overlay indicators inside a markdown memo.
- Use `scripts/valuation-bands.js` when the user provides 3-5 years of historical valuation multiples and you need markdown tables plus ASCII band charts for P/E, EV/EBITDA, and P/B.
- Run all bundled scripts with `node`.

## Operating Rules

- Cite where each important factual claim came from.
- Use exact dates for disclosures, earnings, guidance, and news.
- Separate verified facts from your inference.
- Use primary sources to anchor core numbers, customer concentration, capital allocation facts, and governance facts.
- Use outside research to capture framing, disagreement, and thesis pressure points instead of repeating company marketing language.
- Label outside interpretation as `Street view`, `Specialist media`, `Independent view`, or `Not separately disclosed` when the distinction matters.
- Prefer ranges and scenarios over false precision.
- Say when data is missing or uncertain.
- If revenue mix, customer concentration, or a valuation metric is not disclosed cleanly, say so and explain what the current source set does and does not provide.
- Do not let one broker note, one blog post, or one media article become the sole basis for the conclusion.
- For full memos, turn material evidence gaps into concrete follow-up questions instead of leaving them implicit.
- For full memos, use `Street / Alternative Views` to show where the market view agrees, disagrees, or runs ahead of what the filing proves.
- Keep `Additional Research Questions` company-specific and avoid repeating catalysts, risks, or generic diligence prompts.
- Distinguish ordinary shares, preferred shares, holding companies, and operating subsidiaries when the listing structure matters.
- If you produced a full single-stock memo, keep the file deliverable synchronized with the final chat answer rather than letting the report drift.
- Route ETF work elsewhere instead of bending this skill back into mixed security coverage.

## Source Roles

1. Primary company sources
   DART filings, KRX disclosures, official IR decks, audit reports, governance pages, shareholder-return materials, and exchange notices. Use these to confirm material numbers and formal facts.
2. Sell-side and transcript summaries
   Brokerage notes, earnings-commentary summaries, or transcript recaps. Use these to surface what the market is debating, not to replace primary-source verification.
3. Specialist media and industry reporting
   Reputable local financial media, trade press, and specialist interviews. Use these for competitive framing, end-market context, and reported customer or industry commentary.
4. Independent long-form analysis
   Blogs, newsletters, or detailed independent writeups. Use these as idea sources and stress tests, but keep them clearly labeled and secondary to verified facts.

If a secondary source provides a number that matters to the conclusion, trace it back to a primary source when possible or mark it as unverified.

## Full Memo Minimum Output Standard

The list below applies to `full memo` outputs. Use the compact templates in `references/output-format.md` for `quick view`, `pre-earnings note`, `post-earnings note`, and `pair compare`.

- Summary judgment
- What the business does and what matters most
- Revenue mix across product or segment, geography, and customer concentration when disclosed
- Evidence from current results, balance sheet, and capital allocation
- A `Street / Alternative Views` section that captures sell-side, specialist-media, or independent takes and labels what is confirmed versus inference
- Current valuation snapshot with price, market cap, trailing PER, forward PER, EV/EBITDA, P/B, and FCF yield
- Historical valuation bands for P/E, EV/EBITDA, and P/B over 3-5 years when the data can be assembled
- Chart and positioning context with MA5, MA20, MA60, MA120, Bollinger Bands, Ichimoku, RSI, volume regime, key levels, and a chart-only flow conclusion when price history can be assembled
- A PNG chart reference in markdown when enough price history can be fetched or assembled for a memo file
- Governance and structure checks with why they matter
- Catalysts
- Risks and disconfirming evidence
- Clear `what would change my mind` section
- `Additional Research Questions` with 4-8 company-specific follow-up questions and why each matters
