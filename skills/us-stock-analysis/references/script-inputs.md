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
  "marketCapLabel": "$B",
  "companies": [
    {
      "ticker": "MSFT",
      "name": "Microsoft",
      "price": 420.15,
      "marketCapB": 3120,
      "pe": 34.2,
      "evEbitda": 24.8,
      "fcfYield": 2.9,
      "ps": 13.1,
      "revenueGrowth": 15.4,
      "grossMargin": 69.4,
      "opMargin": 44.6
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
  "ticker": "VOO",
  "name": "Vanguard S&P 500 ETF",
  "holdings": [
    { "symbol": "AAPL", "weight": 7.1 },
    { "symbol": "MSFT", "weight": 6.4 }
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
  "ticker": "NVDA",
  "name": "NVIDIA",
  "bars": [
    {
      "date": "2026-03-16",
      "open": 118.5,
      "high": 121.2,
      "low": 117.8,
      "close": 120.4,
      "volume": 31234567
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
