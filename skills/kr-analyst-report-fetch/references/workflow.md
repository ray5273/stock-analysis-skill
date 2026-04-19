# Workflow Reference

## Goal

Turn a `kr-analyst-report-discover` index into per-report plain-text
extracts, ready for the digest step. No synthesis, no rewriting — text
is stored verbatim. PDFs themselves are not persisted.

## Dependency Map

- **Node**: `require("../../kr-web-browse/scripts/browse-web.js")` for
  `downloadFile`.
- **Python**: `python3` with `pypdf`. The extractor is shared with
  `kr-stock-dart-analysis` and lives at
  `skills/kr-stock-dart-analysis/scripts/extract-pdf-text.py`. We invoke it
  via `child_process.execFileSync` rather than duplicating the code.
- **Cache layout**:
  ```
  <cache-dir>/
    text/
      <ticker>/
        <reportId>.txt    # pypdf plain-text extraction (only persisted artifact)
    extracted/
      <ticker>/
        <YYYY-MM-DD>.json # dated summary (this skill's output)
  ```
  PDFs are downloaded into an OS tempdir, extracted, and deleted. If you
  have an older cache with `<cache-dir>/pdfs/`, it is safe to
  `rm -rf .tmp/analyst-report-cache/pdfs/` — nothing reads from it
  anymore.

## Selection Rules

A report row is downloaded when ALL of the following are true:

- `pdfUrl` is a non-empty string.
- `requiresAuth` is `false`.
- The cache does not already have the `.txt`, OR `--no-cache` was passed.

Otherwise, the report is carried into the summary JSON with
`extractionOk: false` and a reason in `error`:

| Reason | `error` value |
|---|---|
| `pdfUrl === null` | `"no PDF URL in index"` |
| `requiresAuth === true` | `"login-gated per discover index"` |
| Download 4xx/5xx | `"download HTTP <status>"` |
| Content-type HTML | `"content-type text/html — probable login wall"` |
| Extraction throws | `"extract-pdf-text.py failed: <message>"` |
| Extractor returned `""` | `"pypdf returned empty — likely image-only PDF"` |

## Rate Limiting

- Enforce a 1000ms delay between successive downloads. This is separate
  from the `kr-web-browse` internal delay because `downloadFile` does not
  go through the headless browser.
- Do not parallelize downloads. The target sites are small, and some
  reports come from broker CDNs that rate-limit more aggressively than
  the portal itself.

## Idempotency

- Two runs on the same discover index should produce the same extracted
  JSON (order of `reports[]` preserved from input, per-report fields
  identical).
- A partial run (interrupted) is safe to resume: the cache files are the
  ground truth; next run sees them and skips.

## What Not To Do

- Do NOT parse the PDF text here. That belongs in
  `kr-analyst-report-insight` — we want a clean seam so a parser change
  does not force re-downloads.
- Do NOT rewrite the discover index. Write the summary to a new file.
- Do NOT attempt OCR. Image-only PDFs are flagged and skipped by the
  digest step.
- Do NOT store the text inline inside the summary JSON. It's large,
  encoding-fragile, and the file path is better for grep-based quoting
  downstream.
