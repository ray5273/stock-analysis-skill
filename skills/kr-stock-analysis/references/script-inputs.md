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
node scripts/fetch-kr-chart.js --ticker 064400 --market KS --range 1y --interval 1d --name "LG전자"
```

Use this when you need roughly one year of KRX daily bars before a chart read.
If the JSON will be used to render PNG charts, `--name` is effectively required because `chart-basics.js` now fails PNG rendering when the company name is missing from the input.

## `scripts/chart-basics.js`

Run:

```text
node scripts/chart-basics.js --input <path-to-json> [--png-out <path-to-png>] [--image-path <markdown-image-path>]
```

When `--png-out` is set, the script writes the main trend chart to that exact path and writes sibling overlay and momentum images to the same base name with `-overlay` and `-momentum` before the extension. The momentum chart includes `MACD`, `signal`, `histogram`, and `ADX/DMI`, and the markdown output references all three images.
When `--png-out` is set, the input JSON must include a non-empty `name` field so the company name is printed at the top of all PNG charts.

Expected input:

```json
{
  "symbol": "064400.KS",
  "name": "LG전자",
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

Note: the actual sample at `examples/kr-stock-analysis/valuation-band-sample.json` and the code use a **flat array** format:

```json
{
  "ticker": "005930.KS",
  "name": "Samsung Electronics",
  "asOf": "2026-03-20",
  "historyYears": 5,
  "series": [
    { "date": "2021-03-31", "pe": 13.4, "evEbitda": 6.5, "pbr": 1.6 }
  ]
}
```

## `scripts/valuation-chart.js`

Run:

```text
node scripts/valuation-chart.js --input <path-to-json> --png-out <path-to-png> [--image-path <markdown-image-path>] [--width 1200] [--height 800]
```

Generates time-series PNG charts for P/E, P/B, and EV/EBITDA valuation bands. Each chart shows the historical line, min/max shaded band, and median dashed line.

When `--png-out` is set, the script writes separate PNG files with suffixes `-per`, `-pbr`, and `-evEbitda` before the extension. The markdown output references all generated images.

Period policy: defaults to 5 years. If data spans less than 5 years but at least 3 years, charts are generated with the actual period shown in the title. If less than 3 years, the metric's chart is skipped.

Expected input: same flat-array JSON format as `valuation-bands.js` (see above). The `name` field is required for PNG title rendering.
