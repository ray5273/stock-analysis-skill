# Workflow Reference

## Goal

Turn the extracted-text JSON from `kr-analyst-report-fetch` into a
standalone Markdown digest of Korean sell-side coverage. No new data is
collected here — the digest is purely derived from the JSON and the
per-report `.txt` files the fetch step already produced.

The digest is meant to be read on its own (sell-side consensus brief) or
pasted into a `kr-stock-analysis` memo under the `Street / Sell-Side
View` section.

## Dependencies

- Node stdlib only. No npm packages, no Python.
- Reads both the extracted-text JSON (`--input`) and the per-report
  `.txt` files it points to via `reports[].textPath`.

## Pipeline

1. **Load the input JSON.** Resolve `textPath` relative to the input
   file if it is not already absolute.
2. **Consensus snapshot** — compute over reports that are in-window and
   have `targetPrice != null`:
   - TP median, mean, min, max.
   - Rating distribution — counts of `BUY / HOLD / SELL / null`.
   - Report count, most recent publish date.
3. **Broker table** — latest per broker by `publishedDate` desc,
   tie-break on `reportId` asc. Columns: broker, analyst, date, rating,
   TP, TP Δ (vs that broker's immediately prior TP in the window), and a
   1-line summary (first key-point bullet or, if extraction is empty,
   the report title).
4. **Recent reports** — take the top `--max-reports` (default 10) by
   `publishedDate` desc. For each:
   - Split the `.txt` file on blank lines and newlines.
   - Score each candidate line: +2 for `→`, +1 for a numeric token, +1
     per match against `목표주가 / 투자의견 / 실적 / 매출 / 영업이익 / 가이던스 /
     BUY / HOLD / SELL`.
   - Take the top-scored lines, up to 8, truncate each to 220 chars,
     quote verbatim. Do not rewrite.
   - Cap total bullet length at `--snippet-chars` (default 1500) by
     dropping lower-scoring trailing bullets until within budget.
   - Preserve the landing URL and source label under the bullets.
5. **Divergences**:
   - Brokers whose latest TP in the window is > 15% above or below the
     consensus median.
   - Brokers whose rating differs from the modal rating.
6. **TP trajectory** — if ≥ 6 reports have both `publishedDate` and a
   non-null `targetPrice`:
   - Bucket by calendar month (`YYYY-MM`).
   - Compute the median TP per bucket.
   - Render a two-column table plus an ASCII sparkline using the
     characters `▁▂▃▄▅▆▇█` mapped proportionally between min and max
     of the monthly medians.
7. **Source-quality footer** — counts of `extractionOk`, skipped
   (`requiresAuth`, `no PDF URL`), failed, plus the `meta.warnings`
   array carried over from the fetch step.
8. **Write** the Markdown to `--output`.

See `output-format.md` for the exact section order and header strings.

## Operating Rules

1. **Quote, don't paraphrase.** Bullets under a report must come
   verbatim from that report's `.txt`. Synthesis belongs in the memo.
2. **Never invent TPs or ratings.** If the fetch JSON had `null`, render
   `—` and flag the broker in the footer if it affects the consensus.
3. **Dates are ISO** (`YYYY-MM-DD`) everywhere.
4. **TP Δ is computed within broker.** Compare each broker's latest
   in-window TP against that broker's immediately-prior in-window TP.
   If the broker has no prior row in the window, show `—`.
5. **Determinism.** Same input JSON + same `.txt` files must produce
   byte-identical Markdown. Sort reports stably before iterating.
6. **Do not deduplicate across brokers** in the recent-reports section.
   If the same broker published twice, both rows appear there. The
   broker table deduplicates; the recent-reports section does not.
7. **Currency formatting.** Default to KRW with thousands separators
   (`₩250,000`). If `currency: "USD"` appears, render `$250.00` with
   two decimals.

## Failure Modes To Avoid

- Pulling bullets from the wrong report (bullets must come from
  `textPath` of that exact report row).
- Counting login-gated or no-PDF rows in consensus statistics.
- Silently rounding TPs (preserve the integer KRW value in the
  broker table; round only for min/max labels on the sparkline).
- Letting one broker with an extreme outlier TP skew the median (use
  median, not mean, as the consensus anchor for divergences).
- Emitting an empty digest when the input has zero reports — emit a
  digest with a single line `No analyst reports in window.` under the
  `기준일` line instead.
