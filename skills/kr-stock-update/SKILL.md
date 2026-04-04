---
name: kr-stock-update
description: Update an existing Korean stock memo using only company-specific disclosures, IR materials, and news published after the memo date. Use when a prior `analysis-example/kr/<company>/memo.md` already exists and the user wants a dated incremental stock update instead of a fresh memo.
---

# Korean Stock Update

Use this skill when the user already has a Korean stock memo and wants follow-up analysis only for what changed after that memo was written.

## Quick Start

- Start from an existing markdown memo file, usually `analysis-example/kr/<company>/memo.md`.
- Treat disclosures, earnings, capital allocation, governance moves, and company news as time-sensitive. Verify current sources before using them.
- Use the memo's `기준일` as the minimum source date for the follow-up search.
- Deduplicate against the memo's existing `Update Log` dates and source URLs when possible.
- Update the existing memo file instead of creating a separate report by default.
- Preserve the original `기준일` and maintain a separate `최근 업데이트일`.
- If the memo does not exist yet, use `kr-stock-plan`, `kr-stock-dart-analysis`, and `kr-stock-analysis` as needed to create the initial report.

## Workflow

1. Read the baseline memo.
   Use `scripts/extract-report-baseline.js` to parse the memo date, current update status, existing update dates, and existing source URLs.
2. Gather only new information.
   Read DART filings, KRX disclosures, company IR materials, and recent company-specific news published after the memo date.
3. Filter for materiality.
   Ignore generic market chatter and summarize only changes that affect the thesis, risks, capital allocation, or near-term monitoring points.
4. Judge thesis delta.
   Separate what changed from what did not change. Do not turn every headline into a thesis change.
5. Update the memo.
   Refresh `최근 업데이트일`, add `## Update Log` if missing, and append or replace the matching dated update block using `scripts/normalize-update-log.js`.
6. Write the answer.
   Lead with what changed, what did not change, and whether the base view is stronger, weaker, or unchanged.

Read [references/workflow.md](references/workflow.md) for the detailed checklist.
Read [references/output-format.md](references/output-format.md) for the expected update-block shape.
Read [references/script-inputs.md](references/script-inputs.md) when using the bundled scripts with structured JSON inputs.

## Bundled Scripts

- Use `scripts/extract-report-baseline.js` to parse an existing markdown memo into structured baseline metadata.
- Use `scripts/normalize-update-log.js` to render a dated update block and optionally write it back into the memo file.
- Run all bundled scripts with `node`.

## Operating Rules

- Preserve the original memo body unless the new information clearly invalidates it.
- Keep the original `기준일` line and update only `최근 업데이트일`.
- Append dated updates under `## Update Log`. If the same date already exists, replace that dated block instead of duplicating it.
- Cite every material factual claim in the dated update block.
- Use exact dates for disclosures, results, investor events, and news.
- Separate verified facts from inference.
- Prefer saying `no material change` over forcing a narrative.
- If a requested update window has no material company-specific developments, add a short dated note saying so.

## Source Priority

1. DART filings, KRX disclosures, and official company IR materials
2. Exchange notices, shareholder-return disclosures, and governance pages
3. Reputable local financial media for context when primary sources do not fully explain the move

## Minimum Output Standard

- A statement of whether the base view strengthened, weakened, or stayed intact
- What happened after the memo date
- Why it matters
- What changed in the thesis
- What did not change
- Signals to watch next
- A dated source list
- An updated memo file when the workspace is writable
