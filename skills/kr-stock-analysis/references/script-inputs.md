# Script Inputs

## `scripts/peer-valuation.js`

Run:

```text
node scripts/peer-valuation.js --input <path-to-json>
```

Expected JSON:

```json
{
  "subject": "LG CNS",
  "metrics": ["PER", "EV/EBITDA", "P/B"],
  "peers": [
    {
      "name": "삼성SDS",
      "values": {
        "PER": "16.6x",
        "EV/EBITDA": "8.8x",
        "P/B": "1.3x"
      }
    }
  ]
}
```

## `scripts/fetch-kr-chart.js`

Run:

```text
node scripts/fetch-kr-chart.js --ticker 064400 --market KS --range 1y --interval 1d
```

Use this when you need roughly one year of KRX daily bars before a chart read.

## `scripts/chart-basics.js`

Run:

```text
node scripts/chart-basics.js --input <path-to-json> [--png-out <path-to-png>] [--image-path <markdown-image-path>]
```

When `--png-out` is set, the script writes the main trend chart to that exact path and writes a sibling overlay image to the same base name with `-overlay` before the extension. The markdown output references both images.

Expected input:

```json
{
  "symbol": "064400.KS",
  "bars": [
    {
      "date": "2026-03-20",
      "open": 68000,
      "high": 69000,
      "low": 67000,
      "close": 67600,
      "volume": 658000
    }
  ]
}
```

## `scripts/valuation-bands.js`

Run:

```text
node scripts/valuation-bands.js --input <path-to-json>
```

Expected JSON:

```json
{
  "currency": "KRW",
  "series": {
    "pe": [
      { "date": "2023-12-31", "value": 12.1 },
      { "date": "2024-12-31", "value": 14.8 }
    ],
    "evEbitda": [
      { "date": "2023-12-31", "value": 7.9 },
      { "date": "2024-12-31", "value": 8.6 }
    ],
    "pb": [
      { "date": "2023-12-31", "value": 1.5 },
      { "date": "2024-12-31", "value": 2.1 }
    ]
  }
}
```

Use this when the user already gathered 3-5 years of valuation history and needs a consistent markdown summary plus ASCII band view.
