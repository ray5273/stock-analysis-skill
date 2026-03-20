# Script Inputs

## `scripts/extract-report-baseline.js`

Run:

```text
node scripts/extract-report-baseline.js --input analysis-example/kr/엘앤에프.md
```

This script reads an existing markdown memo and emits a JSON baseline with:

- title
- company name
- memo date from `기준일`
- recent update date from `최근 업데이트일` when present
- existing update dates
- existing source URLs
- a short summary excerpt
- an inferred ticker when it can be discovered from source links

## `scripts/normalize-update-log.js`

Run:

```text
node scripts/normalize-update-log.js --input update.json
node scripts/normalize-update-log.js --input update.json --report analysis-example/kr/엘앤에프.md
```

Expected JSON:

```json
{
  "date": "2026-03-27",
  "whatHappened": [
    "The company reported a new shareholder return policy."
  ],
  "whyItMatters": [
    "This improves capital allocation credibility."
  ],
  "whatChangedInThesis": [
    "The downside from treasury-share overhang is lower than before."
  ],
  "whatDidNotChange": [
    "End-market demand uncertainty remains the bigger driver."
  ],
  "signalsToWatchNext": [
    "Whether the cancellation is executed rather than only announced."
  ],
  "sources": [
    {
      "label": "DART treasury-share cancellation filing",
      "url": "https://example.com/filing",
      "date": "2026-03-27"
    }
  ]
}
```

Behavior:

- Without `--report`, the script prints a normalized markdown block.
- With `--report`, the script updates the target memo in place:
  - refreshes or inserts `최근 업데이트일`
  - creates `## Update Log` if missing
  - replaces the same-date update block if it already exists
  - otherwise appends a new dated block
