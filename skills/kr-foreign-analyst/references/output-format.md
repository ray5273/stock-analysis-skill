# kr-foreign-analyst — Output Format

Two artifacts, both deterministic given the same input.

## 1. Coverage JSON (fetch-analyst-coverage.js)

```json
{
  "company": "삼성전자",
  "ticker": "005930",
  "fetchedAt": "2026-04-21",
  "queries": [
    "삼성전자 외국계",
    "삼성전자 외국계 리포트",
    "삼성전자 목표주가",
    "삼성전자 모건스탠리 OR 골드만 OR JP모건 OR 노무라 OR 씨티 OR UBS OR HSBC OR 맥쿼리"
  ],
  "coverage": [
    {
      "broker": "Morgan Stanley",
      "rating": "Overweight",
      "targetPriceKrw": 95000,
      "reportDate": "2026-04-15",
      "articleDate": "2026-04-16",
      "articleUrl": "https://n.news.naver.com/mnews/article/001/0012345678",
      "press": "연합뉴스",
      "title": "모건스탠리, 삼성전자 목표주가 95,000원 상향",
      "snippet": "모건스탠리는 AI 수요와 마진 회복을 근거로 비중확대 의견을 유지했다...",
      "sourceQueries": ["삼성전자 외국계", "삼성전자 목표주가"]
    }
  ],
  "meta": {
    "totalArticlesInspected": 18,
    "totalCoverageRecords": 7,
    "fromCache": 11,
    "errors": [],
    "generatedBy": "kr-foreign-analyst/fetch-analyst-coverage.js"
  }
}
```

**Field notes**:

- `broker` is the canonical English name from `scripts/lib/ib-whitelist.js`.
- `rating` is normalized to `Buy | Sell | Hold | Overweight | Underweight | Equal-weight | Outperform | Underperform | Neutral | Strong Buy`, or `null`.
- `targetPriceKrw` is an integer (KRW). `null` if no target price was parseable.
- `reportDate` is `YYYY-MM-DD`. Falls back to `articleDate` when the report date is not printed.
- `articleDate` is the Korean news article's publication date.
- `press` is one of the known Korean outlet names (`연합인포맥스`, `한국경제`, …) or `null`.
- `snippet` is verbatim from the article body, ≤240 chars, trimmed with `…` on truncation.
- `sourceQueries` lists the discovery queries that surfaced the underlying article(s). Merged across duplicates.

**Sort order**: `reportDate` descending, `broker` ascending.

**Dedup key**: `(broker, reportDate, targetPriceKrw)`.

## 2. Markdown block (summarize-analyst-views.js)

```markdown
## Street / Alternative Views

- `Street view`: Morgan Stanley (2026-04-15, Overweight, TP 95,000 KRW): 모건스탠리는 AI 수요와 마진 회복을 근거로 비중확대 의견을 유지한다. — 연합뉴스, 2026-04-16, https://n.news.naver.com/mnews/article/001/0012345678
- `Street view`: Goldman Sachs (2026-04-12, Buy, TP 102,000 KRW): HBM 점유율 상승과 파운드리 수주 회복을 근거로 매수 의견. — 한국경제, 2026-04-12, https://www.hankyung.com/article/...
- `Bottom line`: 외국계 뷰는 갈림 — Morgan Stanley는 Overweight; Goldman Sachs는 Buy; JPMorgan는 Neutral. TP 중앙값 95,000 KRW. Filing 확정 범위는 별도 확인 필요.
```

**Bullet shape**: `` - `Street view`: <Broker>(<meta>): <snippet> — <source>``

- `<meta>` = `<reportDate>, <Rating>, TP <NNN,NNN KRW>` — each piece is optional; absent fields are dropped.
- `<source>` = `<press>, <articleDate>, <url>`.

**Bottom line** is deterministic:

- If single record: `확인된 외국계 뷰는 <broker>, <rating> 의견, TP … 한 건.`
- If ratings disagree: `외국계 뷰는 갈림 — <broker_list>는 <rating>; … TP 중앙값 ….`
- If ratings agree: `외국계 컨센서스는 <rating>, TP 중앙값 … (N개 커버리지).`
- Always ends with ` Filing 확정 범위는 별도 확인 필요.`

**Empty coverage** renders a single bullet: `외국계 커버리지가 Korean 뉴스에서 확인되지 않음 (기준일 <fetchedAt>). 직접 검색 필요.` so the downstream kr-stock-analysis quality gate (`required-sections`) stays green while explicitly flagging the gap.

**Pasting into a memo**: the default `--heading-level 2` emits `## Street / Alternative Views`. Use `--heading-level 0` to omit the heading when you want to append into an existing section.
