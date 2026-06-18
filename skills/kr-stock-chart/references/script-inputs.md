# Script Inputs

## Default Skill Inputs

At minimum, the skill should work from:

- `ticker`
- `company`
- `output dir`

Optional:

- `range` default `2y`
- `chart-bars` default `120`
- `with-rule-screen`

## `scripts/fetch-kr-chart.js`

Run:

```text
node scripts/fetch-kr-chart.js --ticker 064400 --market KS --range 2y --interval 1d --name "LG전자"
```

Use this when you need roughly 2 years of KRX daily bars before a chart read so `MA200` and 52-week checks are stable by default.

If the JSON will be used to render PNG charts, `--name` is effectively required because `chart-basics.js` fails PNG rendering when the company name is missing from the input.

## `scripts/chart-basics.js`

Run:

```text
node scripts/chart-basics.js --input <path-to-json> [--png-out <path-to-png>] [--image-path <markdown-image-path>] [--chart-bars 120]
```

When `--png-out` is set, the script writes the main trend chart to that exact path and writes sibling overlay, momentum, structure, and pattern images to the same base name with `-overlay`, `-momentum`, `-structure`, and `-pattern` before the extension.

The main trend chart includes `MA5`, `MA20`, `MA60`, `MA120`, and `MA200` on top of OHLC candles and volume, with latest price labels drawn next to each moving-average line. The markdown output includes:

- latest date and close
- a `## Moving Averages on Latest Date` table with latest `MA5 / 20 / 60 / 120 / 200` price levels
- technical prose read
- five image references when PNG output is enabled

Alongside the structure PNG the script writes `<base>-chart-structure-zones.csv` with columns `type,zone_low,zone_high,center_price,touch_count,last_touch_date,score,status`.

Alongside the pattern PNG it writes `<base>-chart-pattern-waves.csv` with candidate/confidence rows; confidence below `0.55` stays in CSV only.

## `scripts/build-kr-universe-rs-cache.js`

Run:

```text
node scripts/build-kr-universe-rs-cache.js --date 2026-04-11
```

Use this when a chart package needs an integrated `KOSPI + KOSDAQ` relative-strength percentile cache for `Minervini Trend Template` or the Korean leadership score.

## `scripts/kr-trend-rules.js`

Run:

```text
node scripts/kr-trend-rules.js --input <path-to-chart-json> --rs-cache .tmp/kr-rs-cache/2026-04-11.json [--json-out rules.json]
```

Use this after `fetch-kr-chart.js` and `build-kr-universe-rs-cache.js` when the chart package needs a `### Rule Screen` block.
