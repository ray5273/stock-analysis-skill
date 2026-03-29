---
name: kr-sector-plan
description: Scope Korean sector and industry research before drafting. Use when the user needs to define the exact sector, coverage boundary, time horizon, decomposition axes, deliverable mode, or research questions for a Korea-focused sector report, brief, comparison, or update. Do not use for writing the final sector report itself.
---

# Korean Sector Plan

Use this skill to turn a vague Korea sector request into an execution-ready research brief.

## Quick Start

- Define the exact sector first. Resolve whether the user means a product category, a value-chain slice, a policy theme, or a listed-company basket.
- Lock the output mode early: `quick brief`, `full report`, `comparison`, `audit`, or `update`.
- Keep the deliverable to planning. Do not drift into writing the actual report or filling in unsupported numbers.
- If the workspace is writable and the user wants a reusable planning artifact, write the brief to `analysis-example/kr-sector/<sector>-리서치브리프.md`.

## Workflow

1. Clarify the target sector.
   Normalize the user's wording into a sector definition that another agent can execute.
2. Set the report boundary.
   Pin geography, time horizon, value-chain depth, end-market slices, and whether listed-company coverage is required.
3. Choose the output mode.
   Route the request into `quick brief`, `full report`, `comparison`, `audit`, or `update`.
4. List the key questions.
   State what the downstream research needs to answer, what can be omitted, and which assumptions are allowed.
5. Hand off cleanly.
   Produce a short research brief and tailored outline that downstream sector skills can consume directly.

Read [references/workflow.md](references/workflow.md) for planning rules.
Read [references/output-format.md](references/output-format.md) for the required brief shape.

## Operating Rules

- Prefer narrowing the scope over pretending the sector boundary is obvious.
- Separate user intent from your assumptions.
- Flag where the sector name overlaps with adjacent themes such as cloud, AI infrastructure, utilities, or software services.
- Avoid numeric estimates at this stage unless the user explicitly asked for a scoping estimate and provided a source.
