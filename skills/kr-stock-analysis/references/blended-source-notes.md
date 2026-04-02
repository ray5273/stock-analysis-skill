# Blended Source Notes

This note explains the recent source-policy change in `kr-stock-analysis` and `kr-stock-data-pack`.

## Why This Changed

The previous workflow was safe, but it could converge too hard on company IR, DART, and newsroom material. That produced memos that were factually grounded but often too close to the company's own framing.

The new default is:

- use primary sources to lock numbers and formal facts
- use sell-side, specialist media, and independent analysis to widen the debate
- keep the two roles visibly separated

## Source Roles

1. Primary company sources
   Use these for material numbers, customer concentration, governance facts, capital allocation, and disclosure-backed statements.
2. Sell-side and transcript summaries
   Use these for market framing, estimate debates, peer framing, and the main buy-side talking points.
3. Specialist media and industry reporting
   Use these for customer references, competitive context, and sector-specific interpretation that filings do not explain cleanly.
4. Independent long-form analysis
   Use these as idea sources and stress tests, not as a final authority on facts.

## Memo Behavior

For `full memo` outputs:

- `What The Latest Results Say` stays anchored to filings and the earnings package
- `Street / Alternative Views` captures the outside debate
- `Additional Research Questions` should pull unresolved issues from both the filings and the outside debate

For `quick view`, `pre-earnings note`, `post-earnings note`, and `pair compare`:

- outside views are allowed, but the dedicated `Street / Alternative Views` section is not mandatory

## Guardrails

- Do not let one broker note or one blog post dominate the conclusion.
- If a secondary source gives a number that matters, trace it back to a primary source when possible.
- If a claim cannot be verified from primary material, label it as `Street view`, `Specialist media`, `Independent view`, or `Not separately disclosed`.
- Do not repeat company newsroom language when a stronger outside framing is available.

## Example Use

Good use:

- DART and IR confirm customer concentration is still high.
- Sell-side says non-captive growth is the rerating trigger.
- Specialist media says a new data-center contract may change the revenue mix.
- The memo keeps those layers separate and turns the unresolved parts into follow-up questions.

Bad use:

- copying a broker target price into the thesis without checking the assumptions
- repeating a company press release as if it were external validation
- using a blog-only claim as the basis for a hard valuation conclusion
