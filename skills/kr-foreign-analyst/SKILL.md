---
name: kr-foreign-analyst
description: >-
  Collect foreign-IB research coverage (Morgan Stanley, Goldman, JPMorgan,
  Nomura, CLSA, UBS, HSBC, Macquarie, Citi, BofA, Daiwa, etc.) on KRX-listed
  companies from Korean news (연합인포맥스/한경/머니투데이/네이버 뉴스) and render it as a
  Markdown block that drops directly into the `## Street / Alternative Views`
  section of a kr-stock-analysis memo. Use ad-hoc per company while writing or
  updating a memo. Requires kr-naver-browse. Never invent a broker, rating, or
  target price — every view must link back to a dated Korean news article that
  named the broker.
---

# Korean Foreign Analyst Coverage

Given a company name (and ideally its KRX ticker), find articles in Korean
media that quote or summarize foreign investment-bank research on the stock,
extract structured broker metadata (name, rating, target price, date,
thesis snippet), and produce a Markdown block that pastes directly into
`## Street / Alternative Views`.

## When To Use

- You're writing or updating a `kr-stock-analysis` memo and want a fast
  audit of what foreign IBs are publishing on the name.
- You want to refresh the existing Street / Alternative Views block with
  the latest broker takes surfaced by Korean media.

Do **not** use this skill to:

- Produce a final thesis — synthesis belongs in the memo.
- Cite foreign IB reports as primary sources for numbers. The skill only
  reads what Korean outlets chose to quote; the actual research is
  upstream and usually behind a paywall.
- Blanket-monitor many stocks at once. Call it ad-hoc per company. For
  portfolio-wide monitoring, use `kr-portfolio-monitor`.

## Pipeline

1. **Fetch** — `scripts/fetch-analyst-coverage.js` runs up to four Naver
   News queries against the company name (`<name> 외국계`, `<name> 외국계
   리포트`, `<name> 목표주가`, OR-expansion over the IB whitelist),
   de-duplicates articles, fetches each body through `kr-naver-browse`,
   and extracts broker mentions. For each broker found, it records
   `{ broker, rating, targetPriceKrw, reportDate, articleDate, articleUrl,
   press, title, snippet, sourceQueries }`. Articles are URL-keyed in a
   global cache; discovery results are per-ticker per-day.

2. **Summarize** — `scripts/summarize-analyst-views.js` reads the coverage
   JSON and renders a Markdown block with one `` `Street view` `` bullet per
   broker view plus one `` `Bottom line` `` bullet synthesizing consensus /
   disagreement.

## Output Contract

The summarize step writes a Markdown file that looks like:

```markdown
## Street / Alternative Views

- `Street view`: Morgan Stanley (2026-04-15, Overweight, TP 95,000 KRW): 모건스탠리는 AI 수요와 마진 회복을 근거로 비중확대 의견을 유지한다. — 연합뉴스, 2026-04-16, https://n.news.naver.com/mnews/article/001/0012345678
- `Street view`: Goldman Sachs (2026-04-12, Buy, TP 102,000 KRW): HBM 점유율 상승과 파운드리 수주 회복을 근거로 매수 의견. — 한국경제, 2026-04-12, https://www.hankyung.com/...
- `Bottom line`: 외국계 뷰는 갈림 — Morgan Stanley는 Overweight; Goldman Sachs는 Buy; JPMorgan는 Neutral. TP 중앙값 95,000 KRW. Filing 확정 범위는 별도 확인 필요.
```

Reference: `references/output-format.md`, `references/ib-aliases.md`.

## Operating Rules

1. **Never invent a broker, rating, or target price.** Every record must
   trace back to a Korean news article that named the broker.
2. **Every bullet cites a dated news URL.** If no date was parseable,
   fall back to the article's publication date, not today.
3. **Deduplicate by `(broker, reportDate, targetPriceKrw)`.** Merge
   duplicates by keeping the longest snippet, earliest article date,
   and union of source queries.
4. **Scope rating/TP extraction to the paragraph around the broker
   mention.** A single article may quote multiple IBs with different
   targets — do not cross-contaminate.
5. **Truncate snippets to 240 characters** in JSON and 240 in Markdown.
   Quote verbatim; do not paraphrase.
6. **Respect the cache.** Same article URL is never re-fetched without
   `--no-cache`.
7. **Fail loud on empty coverage** by default. The harness `all` flow
   passes `--allow-empty` so small caps with genuinely no foreign-IB
   coverage do not block memo generation.
8. **Sort records by `reportDate` descending**, broker name ascending as
   tie-break.

## Invocation

```bash
# Step 1: fetch (standalone)
node skills/kr-foreign-analyst/scripts/fetch-analyst-coverage.js \
  --company "삼성전자" --ticker 005930 --output /tmp/fa.json --verbose

# Small cap, tolerate empty result
node skills/kr-foreign-analyst/scripts/fetch-analyst-coverage.js \
  --company "한미글로벌" --ticker 053690 --output /tmp/fa.json --allow-empty

# Step 2: summarize
node skills/kr-foreign-analyst/scripts/summarize-analyst-views.js \
  --input /tmp/fa.json --output /tmp/fa.md

# Via harness (chains both)
node scripts/harness.js --mode foreign --ticker 005930 --company "삼성전자"

# As part of full memo pipeline
node scripts/harness.js --mode all --ticker 005930 --company "삼성전자" --with-foreign
```

## Fail-Loud Rules

- `--company` missing → exit 1.
- `--output` missing → exit 1.
- gstack browse binary missing → exit 1 (surfaced from kr-naver-browse).
- Zero coverage records → exit 1 unless `--allow-empty`.
- Malformed `--input` JSON (summarize step) → exit 1.
