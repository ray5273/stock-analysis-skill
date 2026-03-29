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
node scripts/chart-basics.js --input <path-to-json> [--png-out <path-to-png>] [--image-path <markdown-relative-path>] [--chart-bars 120]
```

Expected JSON:

```json
{
  "ticker": "005930.KS",
  "name": "Samsung Electronics",
  "bars": [
    {
      "date": "2026-03-16",
      "close": 73100,
      "open": 72300,
      "high": 73500,
      "low": 71800,
      "volume": 18234567
    }
  ]
}
```

Use it to compute:

- latest close and latest date
- 5-day, 20-day, 60-day, and 120-day simple moving averages
- Bollinger Bands
- Ichimoku lines and cloud state
- 14-period RSI
- current volume versus 20-day average volume
- 20-day breakout and breakdown reference levels
- a chart-only flow read such as bullish continuation, bearish continuation, technical rebound, pullback, or range-building
- an optional PNG chart file plus markdown image snippet

Input rules:

- `date` and `close` are required for every bar.
- `high` and `low` should be present if you want Ichimoku and breakout metrics to work properly.
- `volume` should be present if you want the volume panel and participation read.
- Provide at least 120 bars when possible so MA120 and Ichimoku can be read properly.
- When `--png-out` is used, the script writes a local PNG file and prints a markdown image link that can be pasted into a memo.
- The PNG output includes labeled price, volume, and RSI panels with readable x and y axes.

Example:

```text
node scripts/chart-basics.js \
  --input /tmp/066970-chart.json \
  --png-out analysis-example/kr/assets/엘앤에프-chart.png \
  --image-path assets/엘앤에프-chart.png
```

## `scripts/fetch-kr-chart.js`

Run:

```text
node scripts/fetch-kr-chart.js --ticker 066970 [--market kosdaq|kospi] [--range 1y] [--interval 1d] [--name "L&F"] [--output <path-to-json>]
```

Use it to fetch current KRX daily bars from Yahoo Finance and emit JSON that matches the input shape expected by `chart-basics.js`.

Rules:

- Pass a raw six-digit code such as `066970` or a fully qualified Yahoo symbol such as `066970.KQ`.
- For a raw six-digit code, the script always retries an alternate Yahoo suffix if the first one fails.
- Prefer `--range 1y --interval 1d` for the default chart section so MA120 and Ichimoku have enough history.
- Save the result to a JSON file and feed that file into `chart-basics.js`.

Example:

```text
node scripts/fetch-kr-chart.js --ticker 066970 --market kosdaq --range 1y --output /tmp/066970-chart.json
node scripts/chart-basics.js --input /tmp/066970-chart.json --png-out analysis-example/kr/assets/엘앤에프-chart.png --image-path assets/엘앤에프-chart.png
```

## `scripts/portfolio-snapshot.js`

Run:

```text
node scripts/portfolio-snapshot.js --input <path-to-json> [--output <path-to-md>]
```

Expected JSON (array of position objects):

```json
[
  {
    "ticker": "066970.KQ",
    "name": "L&F",
    "quantity": 100,
    "avgCost": 95000
  },
  {
    "ticker": "001120.KS",
    "name": "LG CNS",
    "quantity": 200,
    "avgCost": 61800
  }
]
```

Required fields per position:

- `ticker` — Yahoo Finance symbol (`066970.KQ`) or bare six-digit KRX code (`066970`). Bare codes are tried with `.KS` then `.KQ` automatically.
- `name` — Korean company name displayed in the output table.
- `quantity` — Number of shares held (integer).
- `avgCost` — Average acquisition price per share in KRW.

Optional fields per position:

- `currentPrice` — Override the fetched closing price with a known value.
- `unrealizedPnl` — Override the computed P&L with a value already known (e.g. from a broker statement).

Use it to compute:

- SMA20 and SMA20 deviation from the last 20 closing prices fetched via Yahoo Finance
- RSI14 using the Wilder method from 30 days of daily bars
- Unrealized P&L and return % per position
- A dated markdown snapshot table with one row per position
- Status flags: ⚠️ RSI 과매수 (RSI > 70), ⚠️ RSI 과매도 (RSI < 30), ⚠️ SMA20 +5%↑, ⚠️ SMA20 −5%↓, 정상

Input rules:

- Provide at least 3 positions; the script works with any count but the table is most useful with 5+.
- Use `--output` to write the snapshot to a file (e.g. `analysis-example/kr/portfolio-snapshot.md`); the script also always prints to stdout.
- When `currentPrice` is not provided, the most recent closing price from the Yahoo Finance fetch is used.

Example:

```text
node skills/kr-stock-analysis/scripts/portfolio-snapshot.js \
  --input examples/kr/portfolio-sample.json \
  --output analysis-example/kr/portfolio-snapshot.md
```

## `scripts/valuation-bands.js`

Run:

```text
node scripts/valuation-bands.js --input <path-to-json>
```

Expected JSON:

```json
{
  "ticker": "005930.KS",
  "name": "Samsung Electronics",
  "asOf": "2026-03-20",
  "historyYears": 5,
  "series": [
    { "date": "2021-03-31", "pe": 15.2, "evEbitda": 7.8, "pbr": 1.9 },
    { "date": "2021-06-30", "pe": 14.6, "evEbitda": 7.4, "pbr": 1.8 }
  ]
}
```

Use it to generate:

- a markdown summary table for P/E, EV/EBITDA, and P/B
- current, min, median, max, and current percentile for each metric
- one ASCII time-series bar chart per metric, ordered oldest to newest
- a short band summary that says whether the current multiple sits in the lower, middle, or upper part of the 3-5 year range

Input rules:

- Provide at least 3 years of history when possible and prefer 5 years.
- Use monthly or quarterly observations.
- Leave a metric blank for dates where it is not meaningful.
- Use only positive, meaningful multiples. Negative or non-sensical values should be omitted.
