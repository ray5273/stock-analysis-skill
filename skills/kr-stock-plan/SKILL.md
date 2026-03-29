---
name: kr-stock-plan
description: Scope Korean stock research before drafting. Use when the user needs to pin the exact KRX-listed company, share class, time horizon, comparison set, event frame, or output mode before writing a Korean stock memo, quick view, pre-earnings note, post-earnings note, or pair compare. Do not use for the final memo itself.
---

# Korean Stock Plan

Use this skill to turn a vague Korean stock request into an execution-ready brief.

## Quick Start

- Define the exact security first: ticker, market, ordinary versus preferred line, and whether the listing is an operating company or holding company.
- Lock the output mode early: `quick view`, `full memo`, `pre-earnings note`, `post-earnings note`, or `pair compare`.
- Keep the deliverable to planning. Do not drift into unsupported numbers or a full thesis write-up.
- If the workspace is writable and the user wants a reusable planning artifact, write the brief to `analysis-example/kr/<company>-리서치브리프.md`.

## Workflow

1. Normalize the security target.
   Resolve the exact listing, share class, and structure another agent should analyze.
2. Define the research boundary.
   Pin the horizon, comparison set, catalysts, and whether chart or valuation work is required.
3. Route the output mode.
   Choose `quick view`, `full memo`, `pre-earnings note`, `post-earnings note`, or `pair compare`.
4. State the key questions.
   List what the downstream analysis must answer and what can stay out of scope.
5. Hand off cleanly.
   Produce a short research brief that `kr-stock-data-pack` or `kr-stock-analysis` can consume directly.

Read [references/workflow.md](references/workflow.md) for planning rules.
Read [references/output-format.md](references/output-format.md) for the required brief shape.

## Operating Rules

- Prefer narrowing the target over pretending the listing structure is obvious.
- Separate user intent from your assumptions.
- Flag where ordinary shares, preferred shares, holding companies, or operating subsidiaries could change the interpretation.
- Avoid numeric estimates at this stage unless the user explicitly asked for a scoping estimate and provided a source.
