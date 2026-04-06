---
name: kr-stock-plan
description: Scope Korean stock research before drafting. Use when the user needs to pin the exact KRX-listed company, share class, time horizon, comparison set, event frame, or output mode before writing a Korean stock memo, quick view, pre-earnings note, post-earnings note, or pair compare. Do not use for the final memo itself.
---

# Korean Stock Plan

Use this skill to turn a vague Korean stock request into an execution-ready brief and, unless the user explicitly wants planning only, orchestrate the downstream Korean stock workflow in the same turn.

## Quick Start

- Define the exact security first: ticker, market, ordinary versus preferred line, and whether the listing is an operating company or holding company.
- Lock the output mode early: `quick view`, `full memo`, `pre-earnings note`, `post-earnings note`, or `pair compare`.
- Ask what the user actually needs before locking the brief. At minimum confirm decision goal, horizon, output depth, and whether filing precision, valuation, chart, peer compare, or contract-detail work is required.
- Keep the deliverable to planning. Do not drift into unsupported numbers or a full thesis write-up.
- If the user invoked `kr-stock-plan` as the entry point for a real stock task, do not stop after the brief. Use the brief to route automatically into `kr-stock-dart-analysis`, `kr-stock-data-pack`, and `kr-stock-analysis` as needed unless the user explicitly asked to stop at the brief.
- If the workspace is writable and the user wants a reusable planning artifact, write the brief to `analysis-example/kr/<company>/리서치브리프.md`.

## Workflow

1. Normalize the security target.
   Resolve the exact listing, share class, and structure another agent should analyze.
2. Confirm user needs.
   Ask the shortest clarifying set needed to lock the user goal, decision frame, deliverable depth, and must-answer questions.
3. Define the research boundary.
   Pin the horizon, comparison set, catalysts, and whether chart or valuation work is required.
4. Route the output mode.
   Choose `quick view`, `full memo`, `pre-earnings note`, `post-earnings note`, or `pair compare`.
5. State the key questions.
   List what the downstream analysis must answer and what can stay out of scope.
6. Hand off cleanly.
   Produce a short research brief that routes the work across `kr-stock-dart-analysis`, `kr-stock-data-pack`, and `kr-stock-analysis` as needed.
7. Continue automatically when appropriate.
   If the user asked for analysis rather than planning-only, execute the routed downstream skills immediately in the same turn instead of requiring the user to invoke each one manually.

Read [references/workflow.md](references/workflow.md) for planning rules.
Read [references/output-format.md](references/output-format.md) for the required brief shape.

## Operating Rules

- Prefer narrowing the target over pretending the listing structure is obvious.
- Separate user intent from your assumptions.
- Ask clarifying questions before drafting the brief whenever the user goal, deliverable shape, or must-answer questions are still unclear.
- Flag where ordinary shares, preferred shares, holding companies, or operating subsidiaries could change the interpretation.
- Avoid numeric estimates at this stage unless the user explicitly asked for a scoping estimate and provided a source.
- When latest filing precision is likely to be thesis-critical, explicitly route the downstream workflow through `kr-stock-dart-analysis` before `kr-stock-data-pack` or `kr-stock-analysis`.
- Treat `kr-stock-plan` as the default orchestrator for Korean single-stock work. Unless the user explicitly requests planning only, carry the work forward yourself after the brief is locked.
