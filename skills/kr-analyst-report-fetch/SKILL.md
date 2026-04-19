---
name: kr-analyst-report-fetch
description: Download the PDFs referenced by a `kr-analyst-report-discover` index and extract plain text from each via `pypdf`. Writes a dated JSON file with per-report PDF path, extracted text path, page count, and extraction success flag. Skips reports with `requiresAuth: true` or a missing `pdfUrl`. PDFs and `.txt` siblings are cached per `reportId` and are immutable, so re-runs are cheap. Requires Python 3 and `pypdf` (same dependency as `kr-stock-dart-analysis`). Do not use for IR deck downloads or non-PDF sources — this script assumes selectable-text PDFs.
---

# Korean Analyst Report Fetch + Extract

Given a `kr-analyst-report-discover` index JSON, download each report's PDF
and convert it to plain text. Feeds `kr-analyst-report-insight`, which writes
the final digest.

## When To Use

- After `kr-analyst-report-discover` has produced an index JSON for a ticker.
- When an existing discovered index has new rows you want to refresh into
  the extracted cache.

Do **not** use this skill to:

- Discover new reports — that's `kr-analyst-report-discover`.
- Produce a thesis or digest — that's `kr-analyst-report-insight`.
- Extract text from image-only PDFs — `pypdf` only returns selectable text.
  Image-heavy reports will come back with `textLength: 0`.

## Dependencies

- Node.js (stdlib only).
- Python 3 with `pypdf`. Install once:
  ```bash
  python3 -m pip install pypdf
  ```
- `kr-web-browse` (for `downloadFile`).
- Reuses the PDF text extractor from
  `skills/kr-stock-dart-analysis/scripts/extract-pdf-text.py` via
  `child_process` — do not duplicate the script.

## Pipeline

1. **Read** the input index JSON from `--input`.
2. **Plan downloads**: for each report in the index, skip if
   `requiresAuth: true` or `pdfUrl` is null. Compute cache paths:
   - PDF: `<cache-dir>/pdfs/<ticker>/<reportId>.pdf`
   - TXT: `<cache-dir>/pdfs/<ticker>/<reportId>.txt`
3. **Respect cache**: if both files exist and `--no-cache` was not passed,
   skip the download + extraction for that report.
4. **Download** each PDF via `kr-web-browse.downloadFile`. On HTTP 4xx or
   content-type mismatch (HTML instead of PDF), mark `extractionOk: false`
   with an error string and move on.
5. **Extract** plain text by invoking the Python script:
   ```bash
   python3 skills/kr-stock-dart-analysis/scripts/extract-pdf-text.py \
       --input <pdf-path> --output <txt-path>
   ```
6. **Measure**: capture `textLength` (bytes) and `pages` (from the raw
   extracted string — the Python script already paginates with `\n\n`).
7. **Cap runtime** if `--max-reports N` was passed.
8. **Write** a summary JSON to the `--output` path.

Read [references/workflow.md](references/workflow.md) for failure-mode
details and the cache layout.
Read [references/output-format.md](references/output-format.md) for the
summary JSON schema.

## Operating Rules

1. **Never rewrite or compress the extracted text.** The `.txt` file is a
   verbatim rendering of the PDF's selectable text. Downstream skills quote
   from it directly.
2. **Cache is immutable** — same `reportId` should never trigger a re-fetch
   unless `--no-cache` is set. Analyst reports are dated artifacts; their
   content does not change after publication.
3. **Respect the 1-second inter-request delay** between PDF downloads
   (enforced manually here since `downloadFile` bypasses the browse binary).
4. **Never mutate the input index JSON.** Write a new file to `--output`.
5. **Fail per report, not per run.** A single broken PDF should not stop
   the rest of the batch. Record the error in `reports[i].error` and
   continue.
6. **Do not run OCR.** If `textLength === 0`, flag the report in the
   output and let `kr-analyst-report-insight` skip its bullet extraction.

## Scripts

### fetch-reports.js

```bash
node skills/kr-analyst-report-fetch/scripts/fetch-reports.js \
  --input .tmp/analyst-report-cache/index/066970/2026-04-18.json \
  --output .tmp/analyst-report-cache/extracted/066970/2026-04-18.json
```

Optional flags: `--max-reports N` (default 0 = all), `--cache-dir PATH`,
`--no-cache`, `--verbose`, `--python3 <bin>` (override the Python
executable).
