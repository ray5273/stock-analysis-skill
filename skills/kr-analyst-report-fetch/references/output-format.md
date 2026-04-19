# Output Format

## File path

```
.tmp/analyst-report-cache/extracted/<ticker>/<YYYY-MM-DD>.json
```

`<YYYY-MM-DD>` is the extraction date in Asia/Seoul (usually the same day
as the discover index). One file per ticker per day.

## JSON shape

```json
{
  "company": "엘앤에프",
  "ticker": "066970",
  "discoveredAt": "2026-04-18",
  "fetchedAt": "2026-04-18",
  "indexPath": ".tmp/analyst-report-cache/index/066970/2026-04-18.json",
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
      "sourceSite": "hankyung",
      "landingUrl": "https://...",
      "pdfUrl": "https://.../xxx.pdf",
      "textPath": ".tmp/analyst-report-cache/text/066970/hankyung-....txt",
      "pages": 12,
      "textLength": 18432,
      "extractionOk": true,
      "error": null
    }
  ],
  "meta": {
    "attempted": 18,
    "downloaded": 17,
    "extracted": 17,
    "skippedAuth": 1,
    "failed": 0,
    "fromCache": 5,
    "warnings": []
  }
}
```

## Field semantics

- Every report row from the input index is preserved in the output. Rows
  that were skipped (`requiresAuth`, missing `pdfUrl`) still appear with
  `extractionOk: false` and a descriptive `error`.
- PDF bytes are never persisted. Each report is downloaded into a
  scratch tempdir, extracted, and the PDF is deleted. Only `textPath`
  (the `.txt` extraction) is cached — that's what the digest step
  reads.
- `pages` is the count of non-empty pages returned by `pypdf`, computed
  by splitting the extracted text on `\n\n` (the extractor's page
  separator).
- `textLength` is the byte length of the `.txt` file in UTF-8.
- `error` is `null` on success; on failure it carries a short, stable
  string so downstream digest generation can match against known error
  categories (see `references/workflow.md`).
