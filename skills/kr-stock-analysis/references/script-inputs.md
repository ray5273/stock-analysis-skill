# Script Inputs

## `scripts/peer-valuation.js`

Run:

```text
node scripts/peer-valuation.js --input <path-to-json> [--sort pe|evEbitda|fcfYield|ps|revenueGrowth] [--descending]
```

Expected JSON:

```json
{
  "asOf": "2026-03-20",
  "marketCapLabel": "KRW tn",
  "companies": [
    {
      "ticker": "005930.KS",
      "name": "Samsung Electronics",
      "price": 73400,
      "marketCapB": 438.0,
      "pe": 16.2,
      "evEbitda": 8.4,
      "fcfYield": 4.8,
      "ps": 1.8,
      "revenueGrowth": 11.3,
      "grossMargin": 38.4,
      "opMargin": 16.7
    }
  ]
}
```

Use it to generate a normalized markdown table and quick median summary.
Keep `marketCapLabel` consistent with the unit used in the peer set.

## `scripts/etf-overlap.js`

Run:

```text
node scripts/etf-overlap.js --left <left-json> --right <right-json> [--top 10]
```

Expected JSON for each ETF:

```json
{
  "ticker": "069500.KS",
  "name": "KODEX 200",
  "holdings": [
    { "symbol": "005930.KS", "weight": 21.4 },
    { "symbol": "000660.KS", "weight": 11.2 }
  ]
}
```

Use it to compute:

- weighted overlap using the minimum weight in each common holding
- total common names
- left-only and right-only counts
- top overlapping positions

## `scripts/chart-basics.js`

Run:

```text
node scripts/chart-basics.js --input <path-to-json>
```

Expected JSON:

```json
{
  "ticker": "005930.KS",
  "name": "Samsung Electronics",
  "bars": [
    {
      "date": "2026-03-16",
      "open": 72300,
      "high": 73500,
      "low": 71800,
      "close": 73100,
      "volume": 18234567
    }
  ]
}
```

Use it to compute:

- latest close and latest date
- 20-day and 50-day simple moving averages
- 14-period RSI
- current volume versus 20-day average volume
- 20-day breakout and breakdown reference levels
- a simple bullish, bearish, or mixed trend classification

Provide at least 20 bars for the 20-day metrics and 50 bars for the 50-day average.
