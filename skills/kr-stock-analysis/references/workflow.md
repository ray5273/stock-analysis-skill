# Workflow Reference

## Source Order

Use this order unless the user explicitly wants a faster but lighter answer:

1. Latest DART filing, business report, quarterly report, audit report, or material disclosure
2. Latest KRX disclosure, company IR deck, earnings release, and conference call materials
3. Investor presentation, company website disclosures, or ETF fact sheet
4. Recent company news or exchange notices relevant to the question
5. Market data pages or reputable financial summaries for quick ratio checks

If a number matters to the conclusion, trace it back to a primary source when possible.

## Single-Stock Checklist

### Scope

- Identify the exact ticker, market, and share class.
- Identify whether the listing is an operating company, holding company, preferred shares line, REIT, or ETF.
- Identify the analysis horizon: trading, next earnings, 12-24 months, or multi-year compounder view.
- Identify the user's goal: idea generation, validation, comparison, or risk review.

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
- ETF: holdings concentration, fees, benchmark fit, liquidity, NAV gap

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
- Use `scripts/chart-basics.js` to generate both the markdown technical read and a PNG chart asset that can be embedded in the memo.
- Gather at least 120 daily bars when possible.
- Report latest close and date, MA5, MA20, MA60, MA120, Bollinger Bands, Ichimoku state, RSI 14, volume versus 20-day average, and nearby breakout or breakdown levels.
- The PNG should show readable axes, price labels, date labels, and a separate RSI panel rather than an unlabeled price sketch.
- When you are writing a markdown memo file, embed the generated PNG near the start of the chart section with a normal markdown image link.
- Keep chart analysis secondary to fundamentals. Use it to frame positioning, momentum, and key levels, not to override business reality.
- End the chart section with a short chart-only conclusion that says whether the setup looks like bullish continuation, bearish continuation, a technical rebound, a pullback, or range-building.
- If you do not have enough bars, say the chart read is limited and fall back to simple price-action context such as 1-week, 1-month, 3-month, and 52-week range behavior.

### Catalysts

- Next earnings date
- Memory cycle or export cycle turns
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

## Style-Specific Routing

Use the base checklist first, then add the relevant market checklist:

- KRX growth stock: read `kr-market-checklists.md` and focus on reinvestment quality, margin path, and expectation risk.
- KRX value stock: read `kr-market-checklists.md` and focus on normalized earnings power, governance, and value-trap risk.
- Holding company or restructuring setup: read `kr-market-checklists.md` and focus on look-through value and discount persistence.
- Korean ETF: read `kr-market-checklists.md` and focus on index construction, liquidity, fees, NAV gap, and derivatives use.

## Comparison Checklist

When comparing tickers:

- Use a common date and source set.
- Normalize the comparison around a few metrics that matter for the sector.
- Include revenue mix quality, governance, and current valuation in the normalized comparison set.
- Add chart setup or momentum only if it materially changes timing or risk-reward.
- Distinguish quality from price.
- Show why the cheaper stock may deserve to be cheaper.
- End with "best business", "cheapest optically", and "best risk/reward" if useful.

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
- Pretending revenue mix, customer concentration, or valuation metrics exist when they are not separately disclosed
- Writing a technical read without enough price history or without saying the chart evidence is limited
- Ignoring treasury shares or holding-company structure
- Treating management commentary as fact without checking reported numbers
- Giving a target price with false precision
- Ignoring governance risk because valuation looks cheap
