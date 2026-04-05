# Script Inputs

## `scripts/extract-pdf-text.py`

Install dependency first when needed:

```text
python -m pip install pypdf
```

Run:

```text
python skills/kr-stock-dart-analysis/scripts/extract-pdf-text.py --input "[삼성전자]사업보고서(2026.03.10).pdf" --output analysis-example/kr/삼성전자/사업보고서-2025.txt
```

Use this when the source filing is a local PDF and you want a plain-text export before running section extraction and coverage verification.

## `scripts/extract-dart-sections.js`

Run:

```text
node skills/kr-stock-dart-analysis/scripts/extract-dart-sections.js --input <dart-text.txt> --output <sections.json>
```

Use this when you have a plain-text or markdown export of a DART filing and need a section index before doing note-level extraction.

Output highlights:

- `toc[]`: expected section titles detected from headings
- `sections[]`: parsed section bodies with `contentLength`, `tableCount`, and `numericBlockCount`

## `scripts/verify-dart-coverage.js`

Run:

```text
node skills/kr-stock-dart-analysis/scripts/verify-dart-coverage.js --input <sections.json> --output <coverage.json>
```

Use this after section extraction to verify whether the filing TOC was fully covered.

Status labels:

- `parsed`
- `partial`
- `missing`
- `needs_review`

## `scripts/build-dart-reference.js`

Run:

```text
node skills/kr-stock-dart-analysis/scripts/build-dart-reference.js --sections <sections.json> --coverage <coverage.json> --output <dart-reference.md> --cache-out <dart-cache.json> --company "LG CNS" --ticker 064400.KS --filing-title "사업보고서 (2025.12)" --filing-date 2026-03-16 --as-of 2026-04-05
```

Use this to generate a reusable reference digest and machine-readable cache after section parsing and coverage verification.

Outputs:

- `dart-reference.md`: analyst-readable digest
- `dart-cache.json`: dated coverage metadata for later updates
