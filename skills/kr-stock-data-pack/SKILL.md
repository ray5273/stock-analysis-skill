---
name: kr-stock-data-pack
description: Gather structured fact packs for Korean stock research. Use when the user needs source-dated inputs such as price context, filings, results, guidance, revenue mix, balance-sheet facts, governance data, valuation inputs, chart inputs, outside-view inputs, or a reusable company fact pack before writing a Korean stock memo or event note. Do not use for the final narrative memo itself.
---

# Korean Stock Data Pack

Use this skill to assemble the inputs that a downstream Korean stock memo needs.

## Quick Start

- Treat prices, disclosures, IR materials, guidance, and company news as time-sensitive.
- Prefer primary sources first: DART, KRX disclosures, company IR, official financial statements, and governance pages.
- If the user mainly needs exact filing extraction for quarterly, half-year, segment, or customer-concentration detail, use `kr-dart-analysis` first and then pull the rest of the pack around it.
- When the downstream memo needs more than official company framing, gather dated outside-view inputs from sell-side, specialist media, or detailed independent analysis.
- Keep the output structured. The point is to gather clean inputs, not to write the final thesis.
- If the workspace is writable, write the pack to `analysis-example/kr/<company>/data-pack.md` when the user asked for a reusable artifact.

## Workflow

1. Define the pack scope.
   Start from the agreed security, mode, and time horizon.
2. Gather dated facts.
   Collect the latest price context, filings, earnings facts, governance facts, valuation inputs, and chart inputs. When filing precision is the bottleneck, anchor this step to a prior `kr-dart-analysis` output.
3. Gather outside views when useful.
   Capture the few outside takes that materially change the debate, and label whether each is sell-side, specialist media, or independent analysis.
4. Keep dates visible.
   Put the exact date next to each metric block when refresh cycles differ.
5. Separate facts from interpretation.
   Include only light context. Save the thesis and conclusion for `kr-stock-analysis`.
6. Deliver a reusable pack.
   Use markdown tables or JSON-like blocks that the downstream writer can reuse without re-parsing.

Read [references/workflow.md](references/workflow.md) for the data-gathering checklist.
Read [references/output-format.md](references/output-format.md) for the default pack shape.
Read [../kr-stock-analysis/references/blended-source-notes.md](../kr-stock-analysis/references/blended-source-notes.md) when the downstream memo needs outside views alongside primary-source facts.

## Operating Rules

- Say directly when revenue mix, customer concentration, or a valuation metric is not separately disclosed.
- Keep conflicting dates visible instead of flattening them into one fake reference date.
- Distinguish verified facts from your inference.
- Label outside inputs by source role and keep their verification status visible.
- Do not convert a thin source set into a confident valuation call.
