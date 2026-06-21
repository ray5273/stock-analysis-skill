# Memo Transformation Rules

## Section policy

- Preserve the investment thesis, disclosed figures, contrary views, valuation, catalysts, risks, chart references, and sources.
- Exclude `Research Brief`, `Update Log`, `Follow-up Research Prompts`, and internal file links.
- Keep DART findings inside the narrative section where they support a claim.
- Preserve dates, signs, units, ratios, ticker symbols, and source URLs verbatim.
- Convert Markdown tables into one bullet per row. Use the first column as the row label and retain every remaining header/value pair.

## Blog shape

- Use a personal investment-research voice, not promotional copy.
- Build the title as `회사명 | 핵심 투자 쟁점 | 기준일`.
- Add company, ticker, `주식분석`, and deduplicated thesis keywords as tags.
- Keep linked PNG charts in memo order and fail if a relative path does not resolve to a real file.
- End with the exact basis date, source section, and a statement that the post is not a recommendation to buy or sell.

The deterministic converter applies the structural rules. Review `naver-post.md` before preparing when tone or section transitions need editorial changes; rerun the converter after any source memo change so hashes stay aligned.
