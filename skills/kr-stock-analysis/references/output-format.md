# Output Formats

## Default Single-Stock Memo

Use this shape unless the user asks for something else:

If the workspace is writable, write this memo to `analysis-example/kr/<company>/memo.md` and keep the file in sync with the final answer.

For `full memo` outputs, keep the fixed headers below exactly as written so follow-up routing can find the memo state reliably.

## Decision Frame

Lead with the 3-5 points most likely to change the investment decision. Include the current call, what still blocks conviction, and what needs verification first. If the user gave a specific question, make that question visible here.

## Summary

Give the conclusion in 2-4 sentences and state the `기준일`.

## Business and Thesis

Explain what the company does, what drives value, and the core thesis.

## Revenue Mix

Cover product or segment mix first, then geography mix, then customer concentration. If a layer is not separately disclosed, say that explicitly.

## What The Latest Results Say

Pull the most relevant facts from the latest filing or earnings package.

## DART Recheck

Add a compact table for the 3-8 most important memo claims. Show `주장`, `상태`, `확인값 또는 판단`, `출처`, and `비고`. Use statuses such as `confirmed`, `partially supported`, `contradicted`, `not separately disclosed`, or `needs follow-up`.

## Street / Alternative Views

Summarize the most useful sell-side, specialist-media, or independent takes. Show what outside sources agree on, where they disagree, and which claims are still ahead of what the filing proves. Use short labels such as `Confirmed by filing`, `Street view`, `Specialist media`, `Independent view`, or `Not separately disclosed` when they improve clarity.

## Current Valuation Snapshot

Use a compact table and include current price, market cap, trailing PER, forward PER, EV/EBITDA, P/B, and FCF yield. Add EV/Sales, dividend yield, ROE, net debt or net cash, and treasury shares when available.

## Historical Valuation Bands

Show 3-5 years of P/E, EV/EBITDA, and P/B bands with a markdown summary and ASCII charts when the time series can be assembled. If a metric is not meaningful, explain why. If you are writing a memo file and enough data points exist (at least 3 years), also embed PNG valuation band charts using `scripts/valuation-chart.js` with markdown image links for P/E and P/B (and EV/EBITDA when available), placed at the start of this section before the ASCII tables.

## Chart and Positioning

Add a short technical read with price trend, MA5, MA20, MA60, MA120, Bollinger Bands, Ichimoku, RSI, MACD, ADX/DMI, volume regime, and nearby breakout or breakdown levels. If you are writing a memo file, place the three PNG charts at the top of this section with normal markdown image links: first a main trend chart for OHLC candlesticks, the close line, moving averages, volume, and a visible current-price guide, then an overlay chart for Bollinger Bands, Ichimoku, and RSI, then a momentum chart for MACD, signal, histogram, and ADX/DMI. Immediately below those images, add `### Rule Screen` and show, in order, `Minervini Trend Template`, `KRX 52주 신고가 리더십 점수`, a detailed rule-status table, and a 2-3 sentence interpretation. If the RS cache is unavailable, say `RS percentile unavailable`, keep Minervini as `incomplete`, and keep the Korean score as `partial` instead of zeroing the missing RS component. End the section with a chart-only flow conclusion. If you do not have enough OHLCV history, say that directly and give a lighter price-action read instead.

## Governance and Structure

Always include ownership, board composition, CEO or chair split, treasury share treatment, shareholder return policy, and related-party or cross-holding issues when relevant. For each point, say why it matters for minority holders.

## Catalysts

List the next few events or conditions that could change the market view.

## Risks

List the main downside cases and what evidence would support them.

## Uncomfortable Questions

Add 3-6 company-specific questions that come from the chosen archetype and expose what analyst reports or generic AI summaries often glide past.

## Decision-Changing Issues

Rank the 3-5 swing factors most likely to move the stance. These should be the points that would actually change the investment decision if they resolve one way or the other.

## Structured Stance

State the current stance, why the memo stops there, and what would change the view. Use language such as `관찰 유지`, `추가 검증 후 보류`, `집단 리스크 해소 후 재평가`, or `지금은 추격하지 않음` instead of a forced buy or sell call unless the user explicitly asked for one.

## Follow-up Research Prompts

Add 4-8 company-specific follow-up prompts that come directly from the current memo's evidence gaps. For each item, write the question first and then a short `why it matters` explanation. Pull the highest-impact unresolved items from `Street / Alternative Views`, unresolved disclosures, unclear economics, customer concentration, governance details, capital allocation, or rerating conditions before adding broader diligence ideas. Do not simply restate catalysts or risks.

## Update Log

Include this section when the memo already exists or when dated follow-up work was incorporated. Preserve the original `기준일`, refresh `최근 업데이트일`, and append or replace dated blocks instead of rewriting the whole memo by default.

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
- In `Uncomfortable Questions`, prefer archetype-specific discomfort over broad risk boilerplate.
- In `Decision-Changing Issues`, prefer ranked swing factors over a long undifferentiated list.
- In `Follow-up Research Prompts`, prefer concrete next-step diligence over generic brainstorming.
- Avoid personalized financial advice unless the user explicitly asks for it and provides the needed constraints.
