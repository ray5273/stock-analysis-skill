# Output Format

## Default Markdown Pack

1. Sector Definition
2. Source Window
3. Market Metrics
   Use a table with `Metric | Value | Date | Source | Notes`.
4. Policy and Regulatory Timeline
   Use dated bullets.
5. Value-Chain Map
   Map infrastructure, services, and downstream demand pockets.
6. Representative Public Companies
   Use `Company | Role | Exposure Type | Source Date | Notes`.
7. Known Gaps
   State what is not cleanly disclosed.

## Optional JSON-Like Shape

Use this when the user asked for structured machine-readable handoff:

```json
{
  "sectorDefinition": "",
  "sourceWindow": {
    "start": "",
    "end": ""
  },
  "marketMetrics": [],
  "policyTimeline": [],
  "valueChain": [],
  "publicCompanies": [],
  "knownGaps": []
}
```

## Tone

- Be compact.
- Keep numbers and dates easy to lift into a report.
- Use `not separately disclosed` instead of inventing precision.
