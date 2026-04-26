---
name: kr-analyst-report-discover
description: >-
  Discover recent sell-side analyst reports for a KRX-listed company from
  Hankyung Consensus (primary) and Naver Pay Research (fallback). Default
  lookback is 365 days. Returns a dated JSON index with broker, analyst, date,
  title, rating, target price, landing URL, and direct PDF URL per report.
  Reports behind login walls are kept in the index with `requiresAuth: true`
  and skipped by downstream `kr-analyst-report-fetch`. Requires
  `kr-web-browse` (which in turn reuses `kr-naver-browse`'s gstack binary). Do
  not use for generic news articles, IR decks, or non-Korean broker reports.
---

# Korean Analyst Report Discovery

Find sell-side broker reports for a given KRX ticker, extract structured
metadata per report (broker, analyst, date, rating, target price, PDF URL),
and write a dated JSON file for downstream `kr-analyst-report-fetch` to
consume.

## When To Use

- User asks about street consensus / target prices / broker coverage for a
  KRX stock (증권사 리포트, 컨센서스, 애널리스트 TP).
- Before writing a `full memo` or `pre-earnings note` where sell-side
  framing is relevant.
- Before a `post-earnings note` where consensus-vs-print matters.

Do **not** use this skill to:

- Fetch generic financial news or company IR decks.
- Discover non-Korean broker coverage.
- Produce a thesis — that belongs downstream in `kr-stock-analysis`.

## Source Policy

1. **Hankyung Consensus** (`consensus.hankyung.com`) is the primary source.
   Richer metadata (analyst name, target-price deltas, broker list) and the
   direct PDF links are usually unauthenticated.
2. **Naver Pay Research** (`finance.naver.com/research/company_list.naver`)
   is the fallback when Hankyung returns an empty list or fails.
3. Login-gated reports stay in the index with `pdfUrl: null`,
   `requiresAuth: true`, and are counted but not downloaded downstream.

## Workflow

1. **Parse inputs.** Require `--company` and `--ticker`. Default
   `--lookback-days 365`, `--source hankyung` (other values: `naver`,
   `both`), `--max-reports 0` (unlimited).
2. **Check cache.** If
   `.tmp/analyst-report-cache/index/<ticker>/<YYYY-MM-DD>.json` exists for
   today, prefer it unless `--no-cache`.
3. **Compute window.** `endDate = today`, `startDate = today - lookbackDays`.
4. **Scrape primary source** via `lib/hankyung.js`:
   - Build list URL with the date window and ticker/company as filters.
   - Paginate by `now_page=1..N` until no new rows appear or the earliest
     row crosses `startDate`.
   - Parse each row into `{reportId, broker, analyst, publishedDate, title,
     rating, targetPrice, currency, pdfUrl, landingUrl}`.
   - Probe PDF URLs with a HEAD-like `downloadFile` trial (or a cheap
     `browseText`) to detect login walls; set `requiresAuth: true` where
     appropriate.
5. **Fallback to Naver Pay Research** via `lib/naver-research.js` if the
   primary returned zero usable rows OR the caller passed `--source naver`.
   When `--source both`, run both and dedupe by `(broker, publishedDate,
   title)`.
6. **Deduplicate** by `(broker, publishedDate, title)`. When two sources
   disagree on target price, prefer Hankyung (closer to the original
   filing).
7. **Filter by window.** Drop any row older than `startDate`.
8. **Sort** by `publishedDate` descending, then by broker ascending.
9. **Write** a dated JSON file to the `--output` path.

Read [references/workflow.md](references/workflow.md) for source-specific
URL shapes and row-parsing rules.
Read [references/output-format.md](references/output-format.md) for the JSON
schema.

## Operating Rules

1. **Never invent a target price, rating, or analyst name.** If the row
   didn't yield it, the field is `null`.
2. **Currencies**: assume `KRW` for KOSPI/KOSDAQ tickers. If the row
   explicitly shows `USD`, set `currency: "USD"` and keep the numeric TP
   as-is.
3. **Target prices** are normalized to integer KRW when the source uses
   원 units. Strip commas and currency symbols before parsing.
4. **Rating normalization**: map Korean ratings to canonical English
   tokens: `매수/BUY → BUY`, `시장수익률/Market Perform → HOLD`,
   `비중확대/OVERWEIGHT → BUY`, `중립/Neutral → HOLD`,
   `매도/SELL → SELL`. Preserve the original string under `ratingRaw`.
5. **Respect a 1-second inter-request delay** (enforced by
   `kr-web-browse`).
6. **Never scrape analyst emails, phone numbers, or affiliated-firm
   internal IDs** — just the public metadata.
7. **Keep the output deterministic**: same inputs, same list. Rank by
   `(publishedDate desc, broker asc, reportId asc)`.
8. **Fail loud** if neither source returns any rows and no cache exists.
   Do not silently produce an empty index.

## Scripts

### discover-reports.js

```bash
node skills/kr-analyst-report-discover/scripts/discover-reports.js \
  --company "엘앤에프" --ticker 066970 \
  --lookback-days 365 \
  --output .tmp/analyst-report-cache/index/066970/2026-04-18.json
```

Optional flags: `--source hankyung|naver|both` (default `hankyung`),
`--max-reports N` (default 0 = unlimited), `--cache-dir PATH`, `--no-cache`,
`--verbose`, `--no-probe-auth` (skip the per-PDF auth probe for speed).
