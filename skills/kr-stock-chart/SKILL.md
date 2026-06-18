---
name: kr-stock-chart
description: Generate KRX stock chart artifacts from daily OHLCV data. Use when the user wants chart-only output for a Korean stock, or when another Korean stock skill needs reusable chart artifacts such as `chart-data.json`, `chart-analysis.md`, five PNG chart panels, structure-zone CSV, pattern-wave CSV, or rule-screen output. Do not use for the final narrative memo itself.
---

# Korean Stock Chart

Use this skill to own the KRX chart pipeline end to end.

This skill is the single source of truth for Korean stock chart generation. Other Korean stock skills should consume its artifacts instead of re-implementing the fetch, render, or rule-screen steps themselves.

## Quick Start

- Treat prices and chart-derived levels as time-sensitive.
- Default fetch policy is about 2 years of KRX daily bars so `MA200`, 52-week checks, and rule-screen inputs are stable by default.
- If the workspace is writable, write chart artifacts under `analysis-example/kr/<company>/` and chart images under `analysis-example/kr/assets/`.
- Require the exact ticker, company name, and output directory before rendering PNG charts.
- If the user wants only the chart package, stop here and return the chart artifacts. If a downstream memo is expected, let `kr-stock-data-pack` or `kr-stock-analysis` ingest the artifacts after this skill runs.

## Workflow

1. Lock the security target.
   Confirm the KRX ticker, market, and company name that should appear in the PNG title.
2. Fetch the OHLCV base.
   Use `scripts/fetch-kr-chart.js` to pull about 2 years of daily bars unless the user explicitly asked for a different range or already supplied clean OHLCV data.
3. Render the chart package.
   Use `scripts/chart-basics.js` to produce the markdown technical read plus the five PNG chart panels and the structure / pattern CSV sidecars.
4. Add rule-screen outputs when requested.
   If the user asked for `Minervini Trend Template`, Korean leadership score, or explicit rule screening, build or reuse the same-date RS cache with `scripts/build-kr-universe-rs-cache.js` and then run `scripts/kr-trend-rules.js`.
5. Persist standard artifacts.
   Keep the JSON, markdown, PNG, and CSV outputs in their standard locations so downstream skills can ingest them without extra path translation.
6. Return a compact summary.
   Report the output paths plus the few technical findings that matter most.

Read [references/workflow.md](references/workflow.md) for the execution checklist.
Read [references/output-format.md](references/output-format.md) for the standard artifact contract.
Read [references/script-inputs.md](references/script-inputs.md) for the supported script arguments.

## Standard Artifacts

For company `<company>` under `analysis-example/kr/<company>/`:

- `chart-data.json`
- `chart-analysis.md`
- `trend-rules.md` and `trend-rules.json` when rule-screen output is requested

For chart images under `analysis-example/kr/assets/`:

- `<company>-chart.png`
- `<company>-chart-overlay.png`
- `<company>-chart-momentum.png`
- `<company>-chart-structure.png`
- `<company>-chart-pattern.png`
- `<company>-chart-structure-zones.csv`
- `<company>-chart-pattern-waves.csv`

## Bundled Scripts

- Use `scripts/fetch-kr-chart.js` when you need current KRX daily bars and the user did not already provide OHLCV history.
- Use `scripts/chart-basics.js` when you need a technical read plus five-part PNG charts. The main chart includes `MA5`, `MA20`, `MA60`, `MA120`, `MA200`, candlesticks, close line, volume, and latest price labels for each moving average. The markdown read explicitly prints the latest `MA5 / 20 / 60 / 120 / 200` price levels.
- Use `scripts/build-kr-universe-rs-cache.js` when the chart package needs an integrated KOSPI+KOSDAQ RS percentile cache for same-date rule checks.
- Use `scripts/kr-trend-rules.js` when the chart package needs a `Rule Screen` block with `Minervini Trend Template` pass/fail plus the `KRX 52주 신고가 리더십 점수`.
- Run all bundled scripts with `node`.
- PNG chart labels render Hangul with `KR_STOCK_CHART_FONT` first, then the bundled `assets/fonts/NotoSansKR-Regular.ttf`, then OS font discovery. The bundled Noto Korean Regular face is sourced from the official `notofonts/noto-cjk` distribution and ships with `assets/fonts/LICENSE-NotoSansKR.txt` under the SIL Open Font License. The install hook verifies Pillow and a bundled-font text-mask smoke test; set `SKILL_INSTALL_SKIP_LINUX_DEPS=1` to avoid automatic Linux dependency installation attempts.

## Operating Rules

- Use exact dates for latest close, breakout or breakdown levels, and rule-screen checks.
- Keep rule-screen output clearly labeled as chart-derived rather than filing-derived.
- Treat pattern / wave output as candidate context, not confirmation.
- Do not invent support or resistance zones outside the generated artifacts.
- If a requested moving average or rule check lacks enough history, say that directly instead of silently filling it.
- Preserve the standard file names so downstream skills can ingest them automatically.
