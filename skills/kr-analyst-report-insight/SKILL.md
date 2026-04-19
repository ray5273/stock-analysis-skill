---
name: kr-analyst-report-insight
description: Turn a `kr-analyst-report-fetch` summary into a standalone Markdown digest of Korean sell-side analyst coverage for a KRX ticker. Produces a 7-section report — consensus snapshot, broker table, recent reports with quoted key-point bullets, divergences, TP trajectory, source-quality footer — suitable as a deliverable on its own or as the `Street / Sell-Side View` input for a `kr-stock-analysis` memo. Snippets are quoted verbatim from extracted PDF text (default ~1500 chars per report) with source URLs preserved. Do not use this skill to produce a thesis — it summarizes existing analyst views, not the user's stance.
---

# Korean Analyst Report Insights

Given the extracted-text JSON from `kr-analyst-report-fetch`, produce a
standalone Markdown digest of sell-side coverage. The digest is the final
deliverable of the `kr-analyst-report-*` chain.

## When To Use

- After `kr-analyst-report-fetch` has produced an extracted-text JSON for
  a ticker.
- When the user asked for a sell-side coverage summary, TP consensus, or
  a street-view brief.

Do **not** use this skill to:

- Produce a memo thesis — belongs in `kr-stock-analysis`.
- Cite analyst bullets as primary facts — they're inference on top of
  filings. Treat them as the sell-side take, not the filing itself.
- Re-synthesize data already covered by `kr-naver-insight` (retail /
  independent views are a separate source role).

## Pipeline

1. **Read** the extracted-text JSON from `--input`.
2. **Compute consensus**:
   - TP median / mean / min / max over reports with `targetPrice != null`.
   - Rating distribution (BUY / HOLD / SELL / null).
   - Count of reports in window, most recent publish date.
   - Keep only the latest per broker for the broker table (by
     `publishedDate` desc, tie-break on `reportId`).
3. **Build broker table**: broker | analyst | date | rating | TP |
   TP Δ vs broker's prior | 1-line summary (taken from the first bullet
   pulled out of the extracted text, or the report title if extraction is
   empty).
4. **Pick recent reports**: top `--max-reports` (default 10) by
   `publishedDate` desc.
5. **For each recent report**, extract 5–8 key-point bullets:
   - Split the `.txt` file on blank lines and newlines.
   - Score candidate lines by: contains '→', contains a numeric token,
     matches `목표주가 / 투자의견 / 실적 / 매출 / 영업이익 / 가이던스 / BUY / HOLD`.
   - Take the top-scored lines up to 8, truncate each to 220 chars, quote
     verbatim. Do not rewrite.
   - Cap the total snippet length at `--snippet-chars` (default 1500).
6. **Divergences**:
   - Brokers whose TP is > 15% above or below the consensus median.
   - Brokers whose rating differs from the modal rating.
7. **TP trajectory**: if ≥ 6 dated reports with non-null TPs, bucket by
   calendar month, compute median per month, render a two-column list
   (YYYY-MM | consensus TP) and an ASCII sparkline.
8. **Source-quality footer**: extractionOk counts, skipped (auth / no PDF),
   warnings from the input `meta.warnings`.
9. **Write** the Markdown to `--output`.

Read [references/output-format.md](references/output-format.md) for the
exact section order and the ASCII sparkline rule.

## Operating Rules

1. **Quote, don't paraphrase.** Key-point bullets must be lifted verbatim
   from the extracted `.txt`. Synthesis belongs in the downstream memo.
2. **Always include landing URLs** so the memo writer can click through to
   the original report.
3. **Never invent target prices or ratings.** If the discover / extract
   index lacked them, the digest leaves the cell empty (`—`) and flags
   the broker in the source-quality footer.
4. **Dates are ISO** throughout (`YYYY-MM-DD`).
5. **TP Δ is computed within broker** (current minus the broker's
   immediately-prior TP in the window). If the broker has no prior, show
   `—`.
6. **Stay deterministic**: same input JSON produces the same Markdown.
7. **Do not deduplicate across brokers for the recent-reports section**.
   If the same broker published twice in a month, both rows should appear.
   The broker table deduplicates (latest only); the recent-reports section
   does not.

## Scripts

### summarize-reports.js

```bash
node skills/kr-analyst-report-insight/scripts/summarize-reports.js \
  --input .tmp/analyst-report-cache/extracted/066970/2026-04-18.json \
  --output analysis-example/kr/엘앤에프/analyst-report-insight.md
```

Optional flags: `--max-reports N` (default 10), `--snippet-chars N`
(default 1500), `--verbose`.
