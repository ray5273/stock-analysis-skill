# Workflow Reference

## Source Roles

Use a blended-source workflow, but keep source roles explicit:

1. Primary company sources
   Latest DART filing, quarterly report, business report, audit report, KRX disclosure, IR deck, governance material, or shareholder-return disclosure. Use these to confirm material numbers and formal facts.
2. Sell-side and transcript summaries
   Brokerage notes, earnings-briefing summaries, and transcript recaps. Use these to surface what the market is focusing on, how peers are framed, and where estimates or narratives diverge.
3. Specialist media and industry reporting
   Reputable financial media, trade press, and specialist interviews. Use these for competitive context, customer references, or sector-specific debate that the company does not spell out cleanly.
4. Independent long-form analysis
   Detailed blogs, newsletters, or analyst-style writeups. Use these as idea sources and stress tests, not as a substitute for primary-source verification.
5. Market-data pages
   Use these for quick ratio checks, price context, and consensus screens when the numbers are clearly dated.

If a number matters to the conclusion, trace it back to a primary source when possible. If you cannot, mark it as `street inference`, `media report`, or `unverified`.

## Single-Stock Checklist

### Scope

- Identify the exact ticker, market, and share class.
- Identify whether the listing is an operating company, holding company, preferred shares line, or restructuring case.
- Identify the analysis horizon: trading, next earnings, 12-24 months, or multi-year compounder view.
- Identify the user's goal: idea generation, validation, comparison, or risk review.
- If the workspace is writable, set the output file path early. Default to `analysis-example/kr/<company>/memo.md` for a full report and `analysis-example/kr/assets/<company>-chart.png` for any linked chart image.

### Business Quality

- Describe the core business, segments, and revenue drivers.
- Build a 3-axis revenue mix view: product or segment, geography, and customer concentration.
- If one of the three axes is not separately disclosed, say that directly and continue with the disclosed layers.
- Identify whether the business is domestic-demand driven, export-driven, cyclical, or policy-sensitive.
- Identify what must go right for the thesis to work.

### Financial Quality

- Check revenue growth and whether it is accelerating or decelerating.
- Check operating margin, EBITDA quality, and free cash flow trend.
- Check leverage, liquidity, debt maturity, lease burden, and capex needs.
- Check treasury shares, dilution, dividends, buybacks, and cancellation behavior.
- Check segment mix, geography mix, and customer concentration where disclosed.

### External Views Scan

- Before finalizing a full memo, scan for outside views that go beyond the company IR narrative.
- Prefer at least one sell-side source when coverage exists, then add specialist media or independent analysis if they materially sharpen the debate.
- Pull only the high-signal takeaways:
  - what the market thinks matters most now
  - where interpretation diverges from management framing
  - what non-company sources say about peer positioning, customer quality, or end-market risk
  - which claims are still not verified by filings
- If a secondary source restates a number that already exists in filings, cite the filing for the number and use the secondary source only for interpretation.
- Do not fill the section with repetitive newsroom summaries from the company itself.

### Governance and Structure

- Check controlling shareholder, ownership structure, and beneficial ownership where disclosed.
- Check board composition, outside director mix, and whether the CEO and chair roles are split.
- Check related-party transactions, cross-holdings, and ownership structure when relevant.
- Check whether a holding-company discount or subsidiary discount may matter.
- Check shareholder return policy, treasury stock treatment, and capital allocation credibility.
- Check whether controlling shareholder incentives diverge from minority shareholders.

### Valuation

Pick methods that fit the business model:

- Mature profitable business: P/E, EV/EBITDA, FCF yield, dividend yield
- Asset-heavy or cyclical business: EV/EBITDA, EV/EBIT, price to book, replacement value clues
- Financials: P/B, ROE, dividend yield, capital ratios
- Holding companies: NAV discount, look-through sum-of-the-parts, treasury shares adjustment

For a standard single-stock memo, always assemble a current valuation snapshot with:

- Current price
- Market cap
- Trailing P/E
- Forward P/E
- EV/EBITDA
- P/B
- FCF yield

Add EV/Sales, dividend yield, ROE, net debt or net cash, and treasury share ratio when available.

If you can gather 3-5 years of historical multiples, add valuation bands for:

- P/E
- EV/EBITDA
- P/B

State clearly when a metric is not meaningful because earnings, EBITDA, or book value make the multiple noisy or non-comparable.

Use peer comparisons only if the peer set is genuinely comparable.

### Chart and Positioning

- Prefer fetching about 1 year of daily bars before writing the chart section so MA120 and Ichimoku have enough history.
- Use `scripts/fetch-kr-chart.js` to pull current KRX bars when the user did not provide price history.
- Use `scripts/chart-basics.js` to generate both the markdown technical read and split PNG chart assets that can be embedded in the memo.
- Gather at least 120 daily bars when possible.
- Report latest close and date, MA5, MA20, MA60, MA120, Bollinger Bands, Ichimoku state, RSI 14, volume versus 20-day average, and nearby breakout or breakdown levels.
- The main chart should prefer OHLC candlesticks plus a close line and a visible current-price guide, while the overlay chart keeps heavier indicators separate.
- The chart set should show readable axes, price labels, date labels, and a clearly separated overlay view instead of stacking every indicator on one price panel.
- For Korean stock memos, prefer Korean legend and panel labels when a Hangul-capable local font is available.
- When you are writing a markdown memo file, embed the generated main trend PNG first and the overlay PNG immediately after it near the start of the chart section.
- Keep chart analysis secondary to fundamentals. Use it to frame positioning, momentum, and key levels, not to override business reality.
- End the chart section with a short chart-only conclusion that says whether the setup looks like bullish continuation, bearish continuation, a technical rebound, a pullback, or range-building.
- If you do not have enough bars, say the chart read is limited and fall back to simple price-action context such as 1-week, 1-month, 3-month, and 52-week range behavior.

### Catalysts

- Next earnings date
- Export-cycle or end-market turns
- Shareholder return policy changes
- Treasury share cancellation or buybacks
- Regulatory decisions or policy support
- Subsidiary listing, delisting, spin-off, or restructuring

### Risks

- Export slowdown or FX headwind
- Margin compression or inventory correction
- Governance discount widening
- Capital allocation disappointment
- Regulatory pressure
- Refinancing risk or weak cash conversion

### Conclusion

State:

- Base case
- Bull case
- Bear case
- Key metrics to watch next
- What would invalidate the thesis

### Street / Alternative Views For Full Memos

- Add this section after `What The Latest Results Say` and before valuation.
- Group the takeaways into:
  - common street view
  - where the market is split
  - what looks ahead of the filing
- Tag claims when useful:
  - `Confirmed by filing`
  - `Street view`
  - `Specialist media`
  - `Independent view`
  - `Not separately disclosed`
- If outside sources conflict with company framing, show the conflict instead of forcing one side into the main thesis.
- Use this section to seed `Additional Research Questions` when outside sources expose a real evidence gap.

### Evidence Gaps And Follow-Up Questions For Full Memos

- After drafting the memo, classify open points into `verified`, `inferred`, `not disclosed`, and `still unverified`.
- Promote only the highest-impact gaps into `Additional Research Questions`.
- Prioritize gaps tied to valuation, earnings durability, governance, customer concentration, capital allocation, or rerating triggers.
- Prioritize unresolved outside claims when sell-side or independent analysis makes them central to the market debate.
- Phrase each item as a concrete question that another analyst could answer from the next DART filing, IR deck, earnings release, shareholder meeting, or company-specific news flow.
- Add one short line on why each question matters to the thesis.
- Do not restate catalysts, risks, or `what to watch next` items unless they expose a current evidence gap.

## Style-Specific Routing

Use the base checklist first, then add the relevant market checklist:

- KRX growth stock: read `kr-market-checklists.md` and focus on reinvestment quality, margin path, and expectation risk.
- KRX value stock: read `kr-market-checklists.md` and focus on normalized earnings power, governance, and value-trap risk.
- Exporter: read `kr-market-checklists.md` and focus on FX sensitivity, customer concentration, and end-market cyclicality.
- Holding company or restructuring setup: read `kr-market-checklists.md` and focus on look-through value and discount persistence.

## Comparison Checklist

When comparing tickers:

- Use a common date and source set.
- Normalize the comparison around a few metrics that matter for the sector.
- Include revenue mix quality, governance, and current valuation in the normalized comparison set.
- Add chart setup or momentum only if it materially changes timing or risk-reward.
- Distinguish quality from price.
- Show why the cheaper stock may deserve to be cheaper.
- End with `best business`, `cheapest optically`, and `best risk/reward` if useful.

## Event-Driven Checklist

Use this flow for pre-earnings and post-earnings requests:

1. Confirm the event date and the previous quarter context.
2. Identify the 3-5 numbers or comments most likely to move the stock.
3. Compare reported results or expectations versus prior guidance and consensus when available.
4. Separate one-off effects from durable trend changes.
5. Add a short current valuation read, technical setup read, and note whether governance or capital allocation changes affect the event read-through.
6. Explain whether the stock move looks fundamentally justified.

## Failure Modes To Avoid

- Repeating stale price or valuation figures from memory
- Finishing a full memo only in chat when the workspace was writable and the skill should have produced a report file
- Pretending revenue mix, customer concentration, or valuation metrics exist when they are not separately disclosed
- Writing a technical read without enough price history or without saying the chart evidence is limited
- Ignoring treasury shares or holding-company structure
- Treating management commentary as fact without checking reported numbers
- Letting company newsroom releases dominate the memo when outside debate is available
- Treating one broker note, one media article, or one blog as confirmed fact
- Copying a secondary-source number into the memo without saying whether the filing confirms it
- Giving a target price with false precision
- Ignoring governance risk because valuation looks cheap
- Ending a full memo without surfacing the highest-impact unresolved questions
- Filling `Additional Research Questions` with generic diligence prompts or repeated catalysts
