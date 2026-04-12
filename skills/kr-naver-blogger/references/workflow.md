# kr-naver-blogger — Discovery Workflow

Keep the flow deterministic. The goal is a ranked candidate list, not a
crawl.

## Inputs

- `--company` (required): exact Korean company name used in search queries.
- `--ticker` (required): 6-digit KRX code used as the third search query and
  as the cache partition key.
- `--min-posts` (default 3): minimum `relevantPostCount` to qualify.
- `--max-candidates` (default 10): cap on bloggers whose PostList we actually
  visit. Keeps runtime bounded.
- `--output` (required): destination JSON path.
- `--cache-dir` (default `.tmp/naver-blog-cache`): cache root.
- `--no-cache`: force a live run even if a same-day cache exists.

## Search Queries

Three fixed queries in this order (all with `where=blog`):

1. `<company> 투자 분석`
2. `<company> 실적`
3. `<ticker>` (passed bare to Naver, which interprets numeric codes as search
   terms)

`kr-naver-browse`'s `searchNaverBlog` returns up to 10 results per query.
Deduplicate by `blogId` across the three result sets.

## Candidate Evaluation

For each unique `blogId`:

1. Call `readBlogPostList(blogId)` (up to 20 recent posts).
2. For each post, check whether the title contains the company name or the
   ticker. Count these as `relevantPostCount`.
3. Record `latestPostDate` as the most recent post date we saw — any post,
   not just relevant ones. This reflects whether the blogger is still active.

## Ranking

Sort qualified bloggers (`relevantPostCount >= min-posts`) by:

1. `relevantPostCount` descending
2. `latestPostDate` descending (lexicographic on `YYYY-MM-DD` strings works)
3. `blogId` ascending (tiebreaker, deterministic)

## Output JSON

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
      "relevantPostCount": 7,
      "latestPostDate": "2026-04-12",
      "categories": [],
      "profileSnippet": null
    }
  ],
  "meta": {
    "searchQueries": 3,
    "candidatesFound": 8,
    "qualified": 2,
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
- **All three queries returned zero results**: write an output file with an
  empty `bloggers` array and `meta.candidatesFound: 0`. Exit 0. The downstream
  skill should handle empty results gracefully.
- **PostList extraction returned empty**: skip that candidate, increment a
  counter in `meta.skipped`, continue.
