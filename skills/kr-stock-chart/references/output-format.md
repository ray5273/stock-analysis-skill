# Output Format

Use this artifact contract unless the user explicitly asked for a narrower subset.

## Required Files

For `analysis-example/kr/<company>/`:

```text
chart-data.json
chart-analysis.md
```

For `analysis-example/kr/assets/`:

```text
<company>-chart.png
<company>-chart-overlay.png
<company>-chart-momentum.png
<company>-chart-structure.png
<company>-chart-pattern.png
<company>-chart-structure-zones.csv
<company>-chart-pattern-waves.csv
```

## Optional Files

When rule-screen output is requested:

```text
trend-rules.md
trend-rules.json
```

## Summary Shape

When replying in chat, keep it short:

- artifact paths written
- latest date / close
- chart-only flow
- 2-4 decision-relevant technical findings
- any gaps such as insufficient history or missing RS cache

`chart-analysis.md` should include `## Moving Averages on Latest Date` near the top, with one latest-date row for `MA5`, `MA20`, `MA60`, `MA120`, and `MA200`. Use `n/a` for any average that cannot be calculated from the available history.
