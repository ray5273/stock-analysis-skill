# Workflow Reference

## Goal

This skill is for scoping only.

The output should make a downstream stock analyst answerable on:

- what security is in scope
- what time frame matters
- what output shape is needed
- what questions must be answered

## Security Definition

Before handing off:

1. Lock the exact ticker and market.
2. Lock the share class.
3. State whether the listing is an operating company, holding company, preferred line, or restructuring case.
4. Note any obvious confusion risk with similarly named listings or subsidiaries.

## Scope Questions

Set the minimum boundary for the downstream work:

- horizon: trading, event, 12-24 months, or multi-year view
- deliverable: quick view, full memo, pre-earnings note, post-earnings note, or pair compare
- peer set: none, optional, or required
- chart work: optional or required
- valuation depth: snapshot only or snapshot plus historical bands

## What To Include

The brief should usually state:

- security and structure
- user goal
- horizon
- comparison set when relevant
- mode
- recommended workflow steps
- required sections
- optional sections
- explicit exclusions

## Workflow Routing

Route the downstream work explicitly instead of leaving the sequence implicit.

- Default stock workflow: `kr-stock-plan -> kr-stock-data-pack -> kr-stock-analysis`
- Filing-heavy workflow: `kr-stock-plan -> kr-stock-dart-analysis -> kr-stock-data-pack -> kr-stock-analysis`
- Direct filing-to-memo workflow is acceptable only when the user wants filing-grounded interpretation immediately and the extra fact-pack layers are not necessary.

Prefer the filing-heavy workflow when the request depends on:

- latest quarter or half-year numbers
- standalone-quarter derivation from cumulative filing data
- segment, geography, or customer-concentration precision
- backlog, contract-disclosure, or related-party detail
- exact disclosure wording that will materially affect the conclusion

## Failure Modes To Avoid

- leaving ticker or share class ambiguous
- mixing operating company analysis with holding-company logic without saying so
- asking the downstream writer to decide the output mode
- sneaking thesis conclusions into the planning artifact
