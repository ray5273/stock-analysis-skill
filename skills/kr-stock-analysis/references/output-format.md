# Output Formats

## Default Single-Stock Memo

Use this shape unless the user asks for something else:

If the workspace is writable, write this memo to `analysis-example/kr/<company>.md` and keep the file in sync with the final answer.

1. Summary
   Give the conclusion in 2-4 sentences and state the `기준일`.
2. Business and Thesis
   Explain what the company does, what drives value, and the core thesis.
3. Revenue Mix
   Cover product or segment mix first, then geography mix, then customer concentration. If a layer is not separately disclosed, say that explicitly.
4. What The Latest Results Say
   Pull the most relevant facts from the latest filing or earnings package.
5. Street / Alternative Views
   Summarize the most useful sell-side, specialist-media, or independent takes. Show what outside sources agree on, where they disagree, and which claims are still ahead of what the filing proves. Use short labels such as `Confirmed by filing`, `Street view`, `Specialist media`, `Independent view`, or `Not separately disclosed` when they improve clarity.
6. Current Valuation Snapshot
   Use a compact table and include current price, market cap, trailing PER, forward PER, EV/EBITDA, P/B, and FCF yield. Add EV/Sales, dividend yield, ROE, net debt or net cash, and treasury shares when available.
7. Historical Valuation Bands
   Show 3-5 years of P/E, EV/EBITDA, and P/B bands with a markdown summary and ASCII charts when the time series can be assembled. If a metric is not meaningful, explain why.
8. Chart and Positioning
   Add a short technical read with price trend, MA5, MA20, MA60, MA120, Bollinger Bands, Ichimoku, RSI, volume regime, and nearby breakout or breakdown levels. If you are writing a memo file, place a PNG chart image at the top of this section with a normal markdown image link, and make sure the image has readable axes and labels. End the section with a chart-only flow conclusion. If you do not have enough OHLCV history, say that directly and give a lighter price-action read instead.
9. Governance and Structure
   Always include ownership, board composition, CEO or chair split, treasury share treatment, shareholder return policy, and related-party or cross-holding issues when relevant. For each point, say why it matters for minority holders.
10. Catalysts
   List the next few events or conditions that could change the market view.
11. Risks
   List the main downside cases and what evidence would support them.
12. What Would Change My Mind
   State concrete conditions that would flip the view.
13. Additional Research Questions
   Add 4-8 company-specific follow-up questions that come directly from the current memo's evidence gaps. For each item, write the question first and then a short `why it matters` explanation. Pull the highest-impact unresolved items from `Street / Alternative Views`, unresolved disclosures, unclear economics, customer concentration, governance details, capital allocation, or rerating conditions before adding broader diligence ideas. Do not simply restate catalysts or risks.

## Quick View

Keep it compact:

1. One-line judgment
2. What matters most right now
3. Latest result or disclosure read-through
4. Current valuation snapshot
5. Key catalysts
6. Key risks

## Pair Compare

Use a short table or bullet set with:

- Business quality
- Revenue mix quality
- Growth quality
- Balance sheet
- Chart setup or momentum
- Governance or structure
- Current valuation
- Catalysts
- Risks
- Bottom-line ranking

## Pre-Earnings Note

Keep it compact:

1. Event setup and exact date
2. Numbers or comments that matter most
3. Expectations versus prior guidance
4. Current valuation and positioning watch items
5. Technical setup and price reaction watch items
6. Governance or capital allocation watch items
7. Bull and bear read-through
8. Post-print watch items

## Post-Earnings Note

Use:

1. What happened
2. What surprised positively or negatively
3. Whether the stock move looks justified
4. Updated valuation read
5. Price-action and technical read
6. What changed in the thesis
7. What to watch next

## Tone

- Be direct and analytical.
- Distinguish facts from inference.
- Keep numeric facts anchored to primary sources and let outside sources do interpretation work.
- Avoid hype language.
- Use short `not disclosed` notes instead of inventing mix splits or missing metrics.
- In `Street / Alternative Views`, prefer the outside debate that changes the thesis over generic media summaries.
- In `Additional Research Questions`, prefer concrete next-step diligence over generic brainstorming.
- Avoid personalized financial advice unless the user explicitly asks for it and provides the needed constraints.
