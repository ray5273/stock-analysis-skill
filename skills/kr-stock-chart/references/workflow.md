# Workflow Reference

## Goal

Generate a reusable KRX chart package that downstream memo skills can ingest without rebuilding chart logic.

## Inputs To Lock

- ticker
- market when known (`KS` / `KQ`)
- company name for PNG title rendering
- output directory: `analysis-example/kr/<company>/`
- optional range override
- optional chart-bars override
- whether a rule-screen block is required

## Default Execution

1. Fetch about 2 years of daily bars with `scripts/fetch-kr-chart.js`.
2. Write `chart-data.json` into `analysis-example/kr/<company>/`.
3. Render the technical markdown and five PNG chart panels with `scripts/chart-basics.js`.
4. Save the markdown stdout as `chart-analysis.md`.
5. Save the PNGs and CSV sidecars under `analysis-example/kr/assets/`.

## Rule-Screen Extension

When the user wants explicit trend-template or leadership checks:

1. Build or reuse `.tmp/kr-rs-cache/<YYYY-MM-DD>.json` via `scripts/build-kr-universe-rs-cache.js`.
2. Run `scripts/kr-trend-rules.js --input chart-data.json --rs-cache <cache>`.
3. Save the markdown block as `trend-rules.md` and the structured JSON as `trend-rules.json` when needed.

## Artifact Expectations

- `chart-data.json` should contain enough bars for `MA200` by default.
- `chart-analysis.md` should show latest close, latest date, moving-average structure, indicator table, and prose read.
- The prose read should explicitly show the latest `MA5 / 20 / 60 / 120 / 200` price levels.
- The PNG set should include main, overlay, momentum, structure, and pattern charts.
- CSV sidecars should include structure-zone and pattern-wave exports.

## Failure Modes To Avoid

- fetching only 1 year by default and then presenting `MA200` as if it were fully stable
- rendering PNG charts without a company `name`
- changing artifact file names in a way that breaks downstream ingestion
- treating candidate wave output as a confirmed Elliott-wave call
