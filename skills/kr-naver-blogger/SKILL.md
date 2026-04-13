---
name: kr-naver-blogger
description: Discover Naver bloggers who consistently cover a specific KRX-listed company. Use before drafting a full memo to identify independent long-form voices for the Street / Alternative Views section. Builds dynamic search queries from Naver News trends and optional DART product keywords, ranks candidates by in-blog search hit count and coverage depth, and writes a dated JSON file under the cache directory. Requires `kr-naver-browse`. Do not use for general sell-side coverage or broker-list discovery.
---

# Korean Naver Blogger Discovery

Find Naver bloggers who post deeply and repeatedly about a given KRX stock.
Feeds `kr-naver-insight` with a ranked candidate list. The goal is to surface
independent long-form voices — not to scrape personal data.

## When To Use

- Before writing a `full memo`, when the user wants independent viewpoints in
  the `Street / Alternative Views` section.
- Before a refresh pass, to check whether new bloggers have started covering
  a stock the user is tracking.
- As input to `kr-naver-insight`, which reads the output JSON and fetches the
  actual post bodies.

Do **not** use for:

- Sell-side broker list discovery — use DART/news skills instead.
- ETF or sector-wide coverage — bloggers cluster per stock, not per sector.
- Any task where the user does not need Naver voices specifically.

## Workflow

1. **Read the request.** Confirm company + ticker + optional `--min-posts`.
2. **Check cache.** If `.tmp/naver-blog-cache/bloggers/<ticker>/<YYYY-MM-DD>.json`
   exists for today, prefer it unless `--no-cache` is set.
3. **Build dynamic queries** via `build-query-set.js`:
   - Base: `<company> 투자 분석`, `<company> 실적`
   - DART products (if `--dart-file`): top nouns from 사업의 내용 section
   - News trends: top keywords from Naver News headline frequency analysis
   - Context (if `--context-file`): terms from 핵심 논점 / 투자 포인트 sections
   - Capped at 8 queries. Use `--no-auto-queries` for legacy 3-query mode.
4. **Search all queries** through `kr-naver-browse` `searchNaverBlog`.
5. **Collect candidate blog IDs** from all result sets.
6. **Per-blog search** each candidate via Naver's `PostSearchList.naver`
   endpoint. Count posts whose **title** contains the company name or ticker
   (`relevantPostCount`). Record pagination page count as a depth signal.
7. **Rank** by `relevantPostCount` then by `inBlogPaginationPages`.
8. **Filter** anyone below `--min-posts` (default 2).
9. **Write** a dated JSON file — the schema is documented in
   `references/workflow.md`.

## Output Contract

- Output path: `--output` (required). Typical value:
  `.tmp/naver-blog-cache/bloggers/<ticker>/<YYYY-MM-DD>.json`.
- JSON shape:

```json
{
  "company": "엘앤에프",
  "ticker": "066970",
  "discoveredAt": "2026-04-12",
  "bloggers": [
    {
      "blogId": "mooyoung_2022",
      "displayName": null,
      "blogTitle": null,
      "subscriberCount": null,
      "relevantPostCount": 6,
      "searchHitCount": 1,
      "inBlogPage1Total": 10,
      "inBlogPaginationPages": 11,
      "latestPostDate": null,
      "categories": [],
      "profileSnippet": null
    }
  ],
  "meta": { "searchQueries": 7, "candidatesFound": 50, "qualified": 8, "querySet": { "..." : "..." } }
}
```

Fields that cannot be extracted are set to `null` / `[]`, never fabricated.

## Operating Rules

1. **Never invent blogger names, subscriber counts, or blog titles.** If the
   page didn't yield it, the field stays `null`.
2. **Respect the 1 s delay** between browse requests (handled by
   `kr-naver-browse`).
3. **Cap candidates** at 10 bloggers examined per run. Quality over breadth.
4. **Never scrape personal info** — only public post metadata.
5. **Keep the output deterministic** given the same inputs: rank by
   `(relevantPostCount desc, inBlogPaginationPages desc, latestPostDate desc, blogId asc)`.
6. **Fail loud** if `browse-naver.js` cannot be required or the binary is
   missing. Do not fall back to a non-Naver source.

## Scripts

### discover-bloggers.js

```bash
node skills/kr-naver-blogger/scripts/discover-bloggers.js \
  --company "엘앤에프" --ticker 066970 \
  --output .tmp/naver-blog-cache/bloggers/066970/2026-04-13.json
```

Optional flags: `--min-posts N`, `--cache-dir path`, `--no-cache`, `--verbose`,
`--queries-file PATH`, `--dart-file PATH`, `--context-file PATH`, `--no-auto-queries`.

### build-query-set.js

Build a dynamic query set independently (useful for inspection/debugging):

```bash
node skills/kr-naver-blogger/scripts/build-query-set.js \
  --company "엘앤에프" --ticker 066970 --output /tmp/queries.json --verbose
```

Optional flags: `--dart-file PATH`, `--context-file PATH`, `--max-queries N`.
