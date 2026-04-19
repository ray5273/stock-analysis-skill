# Workflow Reference

## Goal

Produce a deterministic, dated JSON index of sell-side analyst reports for
a single KRX ticker over a rolling window (default 365 days). The index is
the handoff contract to `kr-analyst-report-fetch`, which downloads the PDFs
and extracts text.

## Source URL Shapes

### Hankyung Consensus (primary)

List page (company-tab search):

```
https://consensus.hankyung.com/apps.analysis/analysis.list
  ?sdate=YYYY-MM-DD
  &edate=YYYY-MM-DD
  &now_page=N
  &search_text=<company-name-urlencoded>
  &report_type=CO
```

- `report_type=CO` is the company / single-stock tab. Industry reports
  (`IN`), economy reports (`EC`), market strategy (`SM`), etc. are
  out of scope for v1.
- `search_text` accepts Korean company names. Ticker numbers alone are
  unreliable because the site indexes by company, not ISIN.
- Rows usually render as a table with columns: 제목, 증권사, 작성자,
  투자의견, 목표주가, 작성일. The PDF URL is attached to the title
  link as an `onclick` or an anchor pointing to a PDF endpoint like
  `/analysis/downpdf?report_idx=...` or directly to a PDF hosted on
  the broker's CDN.

Parsing strategy: prefer `browseLinks` (gets us the anchors and their
labels) over `browseText` for list pages because the table is
anchor-heavy. Fall back to `browseText` only to recover rating / TP
cells that aren't inside anchors.

### Naver Pay Research (fallback)

List page (search by item code):

```
https://finance.naver.com/research/company_list.naver
  ?searchType=itemCode
  &itemCode=<ticker-6digit>
  &writeFromDate=YYYY-MM-DD
  &writeToDate=YYYY-MM-DD
  &page=N
```

- Columns: 종목명, 제목, 증권사, 첨부(PDF icon + href), 작성일.
- Analyst name is usually NOT on the list page — it's inside the detail
  page or the PDF itself. Leave `analyst: null` for Naver-sourced rows.
- Target price and rating are NOT on the list page either; set
  `targetPrice: null` and `rating: null` for Naver rows unless the title
  contains an explicit marker like `[TP 상향]` or `[매수]`.

## Pagination Rules

- Hankyung: paginate `now_page=1..N` until a page returns zero new rows
  OR the earliest-date row on the page is older than the window's start
  date.
- Naver: paginate `page=1..N` until the page returns zero rows OR the
  earliest row is older than the window.
- Cap at 50 pages either way to avoid infinite loops on broken markup.

## Row → Report Mapping

For each row, produce:

```ts
{
  reportId: string;        // `${sourceSite}-${broker}-${publishedDate}-${slug(title)}`
  broker: string;          // e.g. "한국투자증권"
  analyst: string | null;  // e.g. "홍길동" — null if not on the list
  publishedDate: string;   // ISO date "YYYY-MM-DD"
  title: string;
  rating: "BUY"|"HOLD"|"SELL"|null;
  ratingRaw: string|null;  // original Korean/English token
  targetPrice: number|null;// integer KRW for Korean tickers
  currency: "KRW"|"USD";   // default KRW
  pdfUrl: string|null;     // absolute URL; null if login-gated
  landingUrl: string|null; // the list-page row's detail anchor
  sourceSite: "hankyung"|"naver";
  requiresAuth: boolean;   // true when PDF probe returned 401/403/login-wall
}
```

`reportId` is derived locally; it is not a source identifier. It must be
stable across re-runs so the `kr-analyst-report-fetch` PDF cache can be
reused.

## Auth Probing

A PDF is classified as login-gated when **any** of the following:

- HEAD (or a single-byte range GET) returns HTTP 401 or 403.
- The response `content-type` is `text/html` instead of
  `application/pdf` (the site redirected us to a login page).
- The first 1 KB of the body contains `<title>로그인` or similar
  login-wall markers.

Probing is optional (`--no-probe-auth` skips it). Without probing,
`requiresAuth` defaults to `false` and `kr-analyst-report-fetch` handles
the failure at download time.

## Dedupe

When `--source both` returns overlapping rows, dedupe by the tuple
`(broker, publishedDate, normalizedTitle)` where `normalizedTitle` is
the title with whitespace collapsed and bracketed prefixes removed
(`[NDR]`, `[TP 상향]`, etc.). Prefer Hankyung on conflict.

## Output Determinism

Sort the final `reports[]` by:

1. `publishedDate` descending.
2. `broker` ascending (Unicode order).
3. `reportId` ascending.

The `meta` block should summarize counts and note whether the fallback
source was used, so downstream digest writers can tell the user.

## Failure Modes To Avoid

- Emitting an index with zero reports when the scraper actually broke
  (markup changed). Throw instead of writing an empty file.
- Scraping analyst emails, phone numbers, or internal broker IDs. Not
  needed, not welcome.
- Hitting the site faster than one request per second.
- Skipping PDFs that returned 404 — record them with `pdfUrl: null` and
  a note in `meta.warnings`, don't drop the row.
