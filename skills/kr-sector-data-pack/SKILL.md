---
name: kr-sector-data-pack
description: Gather structured fact packs for Korea-focused sector and industry research. Use when the user needs market definition, source-dated market metrics, policy events, regulation changes, value-chain maps, listed-company candidates, or a clean source pack before writing a Korean sector report. Do not use for the final narrative report itself.
---

# Korean Sector Data Pack

Use this skill to assemble the inputs that a downstream sector report needs.

## Quick Start

- Treat market size, growth rates, policy calendars, regulations, and company facts as time-sensitive.
- Prefer official and primary sources first: ministries, KOSIS, Bank of Korea, industry institutes, associations, KRX, DART, and company IR.
- Keep the output structured. The point is to gather clean inputs, not to write a long narrative.
- If the workspace is writable, write the pack to `analysis-example/kr-sector/<sector>-data-pack.md` when the user asked for a reusable artifact.

## Workflow

1. Define the pack scope.
   Start from the agreed sector definition and note what the pack must and must not cover.
2. Gather dated facts.
   Collect the latest source-backed metrics, policy dates, regulations, value-chain facts, and public-company references.
3. Label source freshness.
   Put the exact date next to each metric block or bullet when refresh cycles differ.
4. Separate facts from interpretation.
   Include only light context. Save the thesis-heavy narrative for `kr-sector-analysis`.
5. Deliver a reusable pack.
   Use markdown tables or JSON-like blocks that a downstream writer can reuse without re-parsing.

Read [references/workflow.md](references/workflow.md) for the data-gathering checklist.
Read [references/output-format.md](references/output-format.md) for the default pack shape.

## Operating Rules

- Say when Korea-only market size is not separately disclosed.
- Keep conflicting source dates visible instead of flattening them into one fake reference date.
- Distinguish listed companies, private operators, and policy institutions clearly.
- Do not convert a thin source set into a confident market forecast.
