# kr-naver-blogger — Discovery Workflow

Keep the flow deterministic. The goal is a ranked candidate list, not a
crawl.

## Inputs

- `--company` (required): exact Korean company name used in search queries.
- `--ticker` (required): 6-digit KRX code used as the cache partition key.
- `--min-posts` (default 2): minimum `relevantPostCount` to qualify.
- `--max-candidates` (default 10): cap on bloggers we actually evaluate via
  per-blog search. Keeps runtime bounded.
- `--output` (required): destination JSON path.
- `--cache-dir` (default `.tmp/naver-blog-cache`): cache root.
- `--no-cache`: force a live run even if a same-day cache exists.

Query options:

- `--queries-file PATH`: pre-built query set JSON (skips auto-query build).
- `--dart-file PATH`: DART analysis markdown for product keyword extraction.
- `--context-file PATH`: existing memo/data-pack for keyword extraction.
- `--no-auto-queries`: force legacy 3-query mode (no dynamic keywords).

## Dynamic Query Building

By default, `discover-bloggers.js` calls `build-query-set.js` internally to
generate a research-driven query set instead of using static hardcoded queries.

Query sources (in priority order):

1. **Base queries** (always 2): `<company> 투자 분석`, `<company> 실적`.
2. **DART product keywords** (0–3): extracted from `--dart-file` by frequency
   analysis of Korean nouns and English acronyms in business section text.
3. **News-trend keywords** (0–5): fetched from Naver News headlines via
   `searchNaverNews`, tokenized with Korean particle stripping + stopword
   filter, ranked by 1-gram/2-gram frequency (min 3 occurrences).
4. **Context-file keywords** (0–3): from `--context-file` sections containing
   핵심 논점, 투자 포인트, 리스크, etc.

Queries are deduplicated and capped at 8 (configurable via `--max-queries`).

Fallback: if news search fails and no DART/context file is provided, adds
`<company> 주요 제품` as a weak substitute.

Use `--no-auto-queries` to force the legacy 3-query path (base + bare ticker).

## Search (candidate discovery)

`kr-naver-browse`'s `searchNaverBlog` returns up to 10 results per query.
Deduplicate by `blogId` across all result sets. Track `searchHitCount`
per blogger for observability. Sort candidates by `searchHitCount` desc and
slice to `--max-candidates`.

## Candidate Evaluation (coverage depth)

For each candidate `blogId`, hit Naver's per-blog search endpoint via
`searchWithinBlog(blogId, company)`. This returns the first page of results
(up to 10 posts) plus a pagination link count.

- `inBlogPage1Total`: posts returned on page 1. Naver matches on **body
  text**, so this includes one-off mentions.
- `relevantPostCount`: the primary signal — count of page-1 posts whose
  **title** contains the company name or ticker. Title mention is the
  quality bar; body-only hits are noise for dedicated coverage ranking.
- `inBlogPaginationPages`: number of `goPage(N)` links on page 1. Used as a
  tie-break for bloggers with the same title-match count — more pages means
  more historical coverage depth.

Do not paginate. Page 1 plus pagination-count gives enough signal for
top-N ranking, and one fetch per candidate keeps runtime predictable.

## Ranking

Sort qualified bloggers (`relevantPostCount >= min-posts`) by:

1. `relevantPostCount` descending
2. `inBlogPaginationPages` descending
3. `latestPostDate` descending (when available)
4. `blogId` ascending (deterministic tiebreaker)

## Output JSON

```json
{
  "company": "엘앤에프",
  "ticker": "066970",
  "discoveredAt": "2026-04-13",
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
  "meta": {
    "searchQueries": 7,
    "candidatesFound": 50,
    "qualified": 8,
    "querySet": {
      "queries": [
        { "text": "엘앤에프 투자 분석", "source": "base" },
        { "text": "엘앤에프 양극재", "source": "news-trend" }
      ],
      "meta": { "newsHeadlinesScanned": 26, "dartProductsExtracted": 0 }
    },
    "generatedBy": "kr-naver-blogger/discover-bloggers.js"
  }
}
```

Fields that cannot be extracted from the browse output stay `null` or `[]`.
Never fabricate names, subscriber counts, or category labels.

## Cache

Default layout:

```
.tmp/naver-blog-cache/
  bloggers/
    <ticker>/
      <YYYY-MM-DD>.json
```

The cache is per-ticker per-day. A read on the same day with the same ticker
reuses the JSON file unless `--no-cache` is set. There is no TTL cleanup —
`.tmp/` is gitignored and the user is responsible for pruning.

## Failure Modes

- **Browse binary missing**: throw immediately with the install hint. Do not
  write a partial output file.
- **All queries returned zero results**: write an output file with an
  empty `bloggers` array and `meta.candidatesFound: 0`. Exit 0. The downstream
  skill should handle empty results gracefully.
- **News search returns empty** (quiet mid-cap with no recent coverage): skip
  news-trend source. Base + DART-product queries still provide a usable set.
- **`searchWithinBlog` fails for a candidate**: log the error, record
  `relevantPostCount: 0`, continue. The candidate gets filtered out by the
  `--min-posts` floor.
