---
name: kr-dart-analysis
description: Extract structured, source-mapped evidence from Korean DART filings for a KRX-listed company. Use when the user needs precise filing-grounded summaries of quarterly or semiannual results, revenue and operating profit detail, segment differences, customer concentration, geography mix, capex, related-party disclosures, single-sales or supply-contract disclosure lists, or management-stated reasons before writing a broader stock memo. Do not use for ETF analysis, portfolio monitoring, broad sector reports, or a final investment memo unless the user explicitly wants filing-only analysis.
---

# Korean DART Analysis

Use this skill to turn Korean DART filings into a precise, reusable evidence pack before broader interpretation.

<!-- KR_DART_COVERAGE_SUMMARY_RULE -->

## Language

- Default to Korean for all user-facing output, headings, notes, and summaries unless the user explicitly asks for English.
- Keep official company names, filing names, ticker symbols, accounting labels, and quoted disclosure text exactly as disclosed when precision matters.
- Do not mix English section headings into the final artifact by default. English may appear only inside source titles, tickers, or unavoidable original names.

## Quick Start

- Start from the exact security, target period, and filing type before reading numbers.
- Prefer the latest DART filing and its attached consolidated financial statements, notes, and business sections.
- Determine `consolidated` versus `separate` and `cumulative` versus `standalone quarter` before quoting any result.
- If the filing discloses only cumulative quarterly or half-year figures, derive the standalone quarter by subtracting the prior cumulative filing and label it clearly as `derived from cumulative filing`.
- If the user asks only for `수주계약건` or `단일판매ㆍ공급계약` lists, switch into a disclosure-list mode and gather every relevant notice with original date, latest amendment status, counterparty, amount, sales ratio, and contract period.
- If the user asks `2027년까지 얼마`, `2028년까지 얼마`, or a similar remaining-contract question, produce a `계약 종료시점 분포`, a short `커버리지 요약`, and a full `누적 계약 커버리지` table from the latest effective contract state, while clearly noting that this is not the same as official unrecognized backlog unless the filing discloses backlog directly.
- Keep a source map for each material fact: document title, filing date, section or table label, and whether the number is directly disclosed or derived.
- If the workspace is writable and the user wants a reusable artifact, write the result to `analysis-example/kr/<company>/dart-analysis.md`.
- For `수주계약건만`, `단일판매ㆍ공급계약만`, or similar requests, use the fixed Korean contract-list format from `references/output-format.md` unless the user explicitly asks for a different shape.
- If the user asks for `수주잔고 대비 매출`, `백로그 커버리지`, or similar backlog-coverage metrics, calculate them only on a like-for-like basis and label them as a derived coverage read rather than a formally disclosed KPI unless the company discloses the metric directly.
- If the user asks for both `수주잔고` and `계약 만기 분포`, use an integrated backlog mode that combines the official backlog table, contract-disclosure list, maturity buckets, and coverage metrics in one Korean artifact.

## Workflow

1. Lock the filing scope.
   Confirm the company, ticker, report type, period, and whether the user wants a broad filing read, results summary, segment comparison, customer concentration check, contract list, or another filing-specific slice.
2. Build the filing set.
   Gather the target DART filing, the prior comparable filing needed for quarter-only derivations, and any attached audit or review reports that clarify disclosure gaps.
3. Determine the measurement basis.
   Decide which tables are consolidated versus separate and which values are cumulative versus quarter-only before extracting or deriving any metric.
4. Extract the results block.
   Pull revenue, operating profit, net profit, margins, and the company's explicitly stated reasons for change.
5. Extract mix and structure disclosures.
   Pull segment, geography, customer concentration, order backlog, capex, related-party, contract-disclosure, and other relevant blocks only when the filing actually discloses them.
6. Compare against prior periods.
   Summarize what changed versus the previous quarter, previous half, or previous year using the same accounting basis.
7. Separate disclosure from inference.
   Keep management wording, filing facts, and your derived comparisons distinct.
8. Hand off cleanly.
   Deliver a filing-grounded pack that `kr-stock-data-pack` or `kr-stock-analysis` can consume without re-reading the full filing.

Read [references/workflow.md](references/workflow.md) for the filing-extraction checklist.
Read [references/output-format.md](references/output-format.md) for the default evidence-pack shape.

## Operating Rules

- Never present a derived standalone quarter as if the filing disclosed it directly.
- Default to consolidated figures. If only separate figures are available for a block, say that explicitly.
- Use the filing's exact period labels. Do not flatten `3Q cumulative`, `half-year cumulative`, and `annual` into one generic period.
- If a mix split, segment profit, customer concentration figure, or backlog figure is not separately disclosed in the filing set, write `not separately disclosed` instead of guessing.
- Use the company's stated reasons for growth or margin change only when the filing or attached official earnings material says them explicitly.
- If IR material adds color but DART is silent or less specific, anchor the number to DART and label the extra explanation as official IR commentary.
- If DART and IR differ, prefer the filing for formal numbers and note the mismatch.
- Keep restatements, accounting basis changes, and scope changes visible when they affect comparability.
- Use the latest annual audit report for customer concentration or segment-note detail when the current quarterly or half-year filing does not repeat it, but label the date mismatch.
- When a result is only meaningful after subtracting prior cumulative figures, show the calculation path briefly.
- When listing contract disclosures, keep original notices, amendment notices, and termination or correction notices distinguishable instead of collapsing them into one unlabeled row.
- When the request is contract-only, use the exact section order and column order defined in `references/output-format.md`.
- Never present contract-period distribution as if it were formal remaining revenue or accounting backlog unless the filing explicitly says so.
- Never present `백로그 커버리지` as guaranteed future revenue or margin. It is only a ratio between disclosed backlog and same-basis revenue.

## Source Priority

1. DART filing tables and footnotes
   Use these for formal numbers, segment disclosures, geography mix, customer concentration, related-party transactions, and accounting basis.
2. Attached audit or review reports
   Use these when they clarify note detail, customer concentration, or accounting treatment not repeated elsewhere.
3. Official earnings-release or IR deck material
   Use these for management explanations or presentation tables, but do not let them override filing numbers.
4. KRX disclosures
   Use these for event timing, shareholder-return actions, exchange-level notices, and `단일판매ㆍ공급계약체결` style contract disclosures linked to the period.

If a number matters to the conclusion, keep the filing citation visible. If you cannot trace a material number back to the filing set, mark it as outside the filing scope.

## Minimum Output Standard

- Filing scope with exact document names and dates
- Results summary with revenue, operating profit, net profit, growth, and margin basis
- Standalone quarter derivation notes when needed
- Segment or business-unit differences when disclosed
- Geography, customer concentration, backlog, capex, or related-party blocks when disclosed and relevant
- Contract-disclosure lists when the user requested `수주계약건` or a filing-only contract screen
- Filing-stated reasons for change
- Clear `not separately disclosed` notes for missing but important items
- A source map another analyst can audit quickly

## Handoff Guidance

- Use `kr-stock-data-pack` after this when the downstream work still needs valuation, chart, governance, or outside-view inputs.
- Use `kr-stock-analysis` after this when the user wants a final thesis, valuation view, catalysts, risks, and conclusion.
- If the user's request is mainly `what does the latest filing actually say`, keep the answer in filing-analysis mode and stop short of a full investment memo.
