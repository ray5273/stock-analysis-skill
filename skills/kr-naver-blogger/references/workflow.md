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

Discovery runs three passes and accumulates every hit into one blogId→entry
map before evaluation.

### Pass 1 — Keyword search

`kr-naver-browse`'s `searchNaverBlog` returns up to 10 results per query.
Deduplicate by `blogId` across all result sets. Track `searchHitCount`
per blogger for observability. Keyword-only candidates are sorted by
`searchHitCount` desc and sliced to `--max-candidates`.

### Pass 2 — Related-query nickname anchor

Naver's blog search page surfaces "연관검색어" (related queries) for the
company. The most famous bloggers show up there as `<company> <nickname>`
patterns (e.g. `엘앤에프 무영`, `엘앤에프형`, `엘앤에프 문벵이`) because
fans search `<company> <blogger>` to find the blogger's latest take.

`fetchRelatedQueries(company)` scrapes that block, then
`extractNicknameQueries` routes each tail into one of three buckets:

1. **Drop** — tails in `NICKNAME_BLOCKLIST` (generic stock-watching words
   like `주가`, `전망`, `배당`, `실적`, `차트`, `시세`, ...). These are
   "what people search ABOUT the company" and carry zero blogger signal;
   firing them as searches would bring in unrelated noise.
2. **Event-query** — tails in `EVENT_VOCABULARY` (corporate-action words
   like `주주총회`, `주총`, `무상증자`, `코스피 이전`, `상장`, `합병`, ...).
   The query is still fired as a `searchNaverBlog` call because real
   dedicated coverers write event-driven posts ("알테오젠 주주총회 참관기"),
   but hits are tagged `source: "keyword"` and land in the keyword pool.
   **Event hits do NOT get `nicknameHitCount`, `nicknameAnchors`, or
   anchor-bypass status.** Without this split, 알테오젠 surfaced 17 false
   anchors because 4 of its 10 related queries were event words.
3. **Nickname** — everything else (real blogger aliases like `무영`,
   `문벵이`, and single-char suffix tails like `엘앤에프형` where bloggers
   self-identify). Fired as `searchNaverBlog`; hits bump
   `nicknameHitCount` and push the nickname onto `nicknameAnchors`.

Sibling-ticker tails (`한화 오션`, `SK 하이닉스`, ...) are dropped before
bucket assignment to prevent cross-ticker contamination.

### Pass 3 — Roundup-post body mining

Some dedicated coverers never win on keyword search because their own
titles are topic-specific (e.g. `naburo` writes Tesla-supply-chain posts,
not posts titled "엘앤에프 분석"). They surface via **other bloggers'
roundup posts** — "3인 3색 엘앤에프 관련 블로거 활용법(무영, 강비호,
문벹이)" style posts that list multiple nicknames and link to each
blogger's profile.

`isRoundupTitle` detects such titles via "N인 N색" clusters, explicit
`블로거` / `블로그 추천` references, and bracketed/quoted lists with 2+
separators. The script fetches up to 3 roundup posts' full page text via
`browseText` (not `readBlogPost`, which truncates) and calls
`extractBlogIdRefs` to scan for `blog.naver.com/<blogId>` URLs. Every
referenced blogId is injected into the candidate map with
`roundupMentioned: true` and `roundupSources: [<sourceBlogId>]`.

### Candidate selection

The evaluation list is the union of:

1. Keyword-only candidates ranked by `searchHitCount` desc, capped at
   `--max-candidates`.
2. **All** anchored candidates (nickname hit OR roundup mention),
   uncapped. Anchored entries are rare enough (≤ ~10 per company) that
   uncapping is safe, and the cap is what caused the Phase 2 recall
   failure.

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

## Title Quality Filters

Not all title matches are equal. Two patterns are filtered before counting:

- **Trading / chart titles** — generic TA vocabulary (`차트`, `매매`, `급등주`,
  `관심주`, `시황`, `오늘의`, `단타`, `지지선`...). These stamp the company
  name on TA content that isn't real coverage.
- **Listicle titles** — multi-stock roundup posts where the target company is
  one of many tagged names. Detected via separator density, sector-tag count,
  and target-company position.

Per-candidate fields:

- `dedicatedPostCount` — title matches that are neither trading nor listicle.
  Primary ranking signal.
- `tradingTitleCount`, `listicleTitleCount` — observability counters.
- `isTradingBlog` — set when 50%+ of the blog's entire page-1 post list is
  TA-flavored. Trading-shop bloggers are excluded from the qualified list
  regardless of dedicated count.

Pass `--no-quality-filter` to disable both filters for regression testing.

## Blog-Level Quality Filter (deep mode)

Post-level title filters are not enough for `--deep` mode. A career blog or
news aggregator can still slip in with one or two tech-flavored titles. To
catch these, deep mode fetches each candidate's general recent timeline via
`readBlogPostList(blogId, {max: 20})` (unfiltered by any query) and measures:

- `stockPostRatio` — fraction of recent posts whose titles match any
  stock/investing vocabulary (`isStockRelatedTitle`). Real analyst blogs sit
  at 0.7+; news aggregators that mix tickers with politics/entertainment sit
  around 0.4; career/lifestyle blogs sit near 0. Deep-mode cutoff is `0.5` —
  below that the blog is excluded regardless of its `deepTechPostCount`.

This is the only blog-level gate. An earlier draft added `companyFocusRatio`
(fraction of recent posts mentioning the target company) but recent-20 posts
don't reliably include historical coverage: a bona-fide coverer who wrote
about the company last month scores 0 today. The signal is also fragile for
long company names (bloggers rarely type `삼성바이오로직스` in full).

Pass `--no-blog-filter` to disable the gate for regression testing.
`stockPostRatio` and `generalPostCount` are written to the output JSON
regardless of mode for observability.

## Staleness Filter

A blog may have dozens of title-matched posts about the target company and
still be useless — if all of them are more than a year old, the blogger has
stopped covering this ticker. The staleness filter catches dormant coverers
regardless of mode (normal or `--deep`).

`searchWithinBlog` returns a `date` field per post in `YYYY-MM-DD` form.
Dates are not present in Naver's anchor-list output; the function does a
second `browse text` fetch against the same PostSearchList URL and merges
dates parsed from the text rendering (title line followed by a
`YYYY/MM/DD HH:MM` line) into the posts by title match, with a prefix
fallback for titles containing the ` → ` arrow the anchor parser uses as a
delimiter.

For each candidate we compute on the **company-matched** posts
(`titleMatches`):

- `datedPostCount` — posts whose `date` parsed successfully.
- `staleCoverageRatio` — fraction of dated posts older than 365 days.
- `latestRelevantPostDate` — most recent `date` among title-matched posts.

A blogger is excluded when `datedPostCount >= 3` AND
`staleCoverageRatio >= 0.8`. The `>= 3` floor is a guardrail against false
positives from bloggers whose date tokens failed to parse — we don't want a
single dated post to decide a blogger's fate. The 0.8 cutoff leaves room
for active bloggers who occasionally re-share old analysis.

`--no-blog-filter` disables this gate alongside `stockPostRatio`.
`staleCoverageRatio`, `datedPostCount`, and `latestRelevantPostDate` are
always written to the output JSON for observability. `latestPostDate` is an
alias for `latestRelevantPostDate` kept for schema compatibility.

A related filter runs in `build-query-set.js`: news headlines with 4+ listicle
separators are dropped before tokenization, and generic sector labels
(`광통신`, `반도체`, `바이오`, `조선`...) are stopworded out of the frequency
counter so they don't seed queries. Specific product terms (`양극재`, `HBM`,
`SMR`) remain eligible.

## Qualification

A blogger is qualified when:

- `isTradingBlog === false` — trading-shop exclusion applies to everyone,
  including anchored candidates. A trading shop whose name happens to
  appear in a roundup post is still a trading shop.
- AND one of:
  - `dedicatedPostCount >= --min-posts`, OR
  - **anchored** — `nicknameHitCount >= 1` OR `roundupMentioned === true`.
    Anchored bloggers bypass the min-posts floor because the anchor itself
    is the quality signal. (They do NOT bypass the trading filter.)

## Ranking

Sort qualified bloggers by:

1. **Anchored status** descending — anchored (nickname/roundup) outranks
   keyword-only. The anchor is the trust signal; depth is the tiebreak.
2. `dedicatedPostCount` descending
3. `relevantPostCount` descending (observability tiebreak)
4. `inBlogPaginationPages` descending
5. `latestPostDate` descending (when available)
6. `blogId` ascending (deterministic tiebreaker)

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
      "dedicatedPostCount": 5,
      "tradingTitleCount": 0,
      "listicleTitleCount": 1,
      "isTradingBlog": false,
      "searchHitCount": 1,
      "nicknameHitCount": 4,
      "nicknameAnchors": ["무영"],
      "roundupMentioned": true,
      "roundupSources": ["bosbos2"],
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
      "meta": { "newsHeadlinesScanned": 26, "newsListicleDropped": 4, "dartProductsExtracted": 0 }
    },
    "relatedQueries": [
      { "text": "엘앤에프 무영", "nickname": "무영", "wholeQuery": false },
      { "text": "엘앤에프형", "nickname": "형", "wholeQuery": false }
    ],
    "nicknameQueries": [
      { "text": "엘앤에프 무영", "nickname": "무영", "hits": 10 }
    ],
    "nicknameAnchoredCount": 9,
    "roundupFetched": [
      {
        "sourceBlogId": "bosbos2",
        "logNo": "224125884833",
        "title": "3인 3색 엘앤에프 관련 블로거 활용법(무영, 강비호, 문벵이)",
        "refs": ["mooyoung_2022", "naburo", "shmoon305"]
      }
    ],
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
