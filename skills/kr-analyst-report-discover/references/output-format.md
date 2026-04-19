# Output Format

## File path

```
.tmp/analyst-report-cache/index/<ticker>/<YYYY-MM-DD>.json
```

`<YYYY-MM-DD>` is the discovery date in Asia/Seoul, not the report date.
One file per ticker per day.

## JSON shape

```json
{
  "company": "엘앤에프",
  "ticker": "066970",
  "discoveredAt": "2026-04-18",
  "lookbackDays": 365,
  "windowStart": "2025-04-18",
  "windowEnd": "2026-04-18",
  "source": "hankyung",
  "fallbackUsed": false,
  "reports": [
    {
      "reportId": "hankyung-한국투자증권-2026-04-10-실적-컨센-상회",
      "broker": "한국투자증권",
      "analyst": "홍길동",
      "publishedDate": "2026-04-10",
      "title": "실적 컨센 상회, 목표가 상향",
      "rating": "BUY",
      "ratingRaw": "매수",
      "targetPrice": 250000,
      "currency": "KRW",
      "pdfUrl": "https://.../xxx.pdf",
      "landingUrl": "https://consensus.hankyung.com/apps.analysis/analysis.view?report_idx=...",
      "sourceSite": "hankyung",
      "requiresAuth": false
    }
  ],
  "meta": {
    "queriesRun": 1,
    "pagesScraped": 3,
    "counts": { "total": 18, "withPdf": 17, "requiresAuth": 1 },
    "warnings": [],
    "fallbackReason": null
  }
}
```

## Required fields

- Every report MUST have: `reportId`, `broker`, `publishedDate`, `title`,
  `sourceSite`, `currency`, `requiresAuth`.
- Fields that may be `null` when the source did not disclose them:
  `analyst`, `rating`, `ratingRaw`, `targetPrice`, `pdfUrl`,
  `landingUrl`.

## Non-goals

- This file is NOT a memo. Do not include analysis text, bullet points,
  or commentary.
- This file is NOT a live consensus — the discovery date is a snapshot.
  Re-running on a later date yields a new file.
