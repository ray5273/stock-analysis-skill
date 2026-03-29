---
name: kr-portfolio-monitor
description: Scan a Korean domestic stock portfolio using kiwoom-mcp tools to retrieve live positions, current prices, and 30-day chart data, then compute SMA20 deviation and RSI14 for each holding and produce a dated markdown snapshot table with flagged positions and next-step recommendations. Use when the user wants a quick health check across multiple KRX positions at once rather than a deep single-stock memo.
---

# Korean Portfolio Monitor

Use this skill to produce a dated portfolio snapshot across domestic KRX positions in a single pass. It replaces reading accounts and price data one ticker at a time by using kiwoom-mcp tools to retrieve everything in a structured flow.

## Quick Start

- Check whether `kiwoom-mcp` is configured before anything else. If MCP is unavailable, fall back to `scripts/portfolio-snapshot.js` with a manual JSON input.
- Keep the scope explicit: Kiwoom REST API coverage in this workflow is domestic KRX holdings only. Do not present overseas stocks as included.
- Pull live data: balance, current prices, and 30 days of daily bars per position.
- Compute SMA20 deviation and RSI14 for each holding from the daily bar data.
- Write a dated markdown table. Flag positions where RSI14 > 70 or RSI14 < 30 or SMA20 deviation exceeds ±5%.
- State an explicit "as of" date and time in the output.
- If the workspace is writable, write the snapshot to `analysis-example/kr/portfolio-snapshot.md` and update it on each run.

## Workflow

1. Check MCP connectivity.
   Verify that kiwoom-mcp tools are reachable. If any tool call fails with a connection error, stop and instruct the user to configure kiwoom-mcp using `references/mcp-setup.md`, then fall back to `scripts/portfolio-snapshot.js` with manual input. If the user asks for overseas holdings, stop and clarify that this skill only covers domestic KRX positions exposed by Kiwoom REST API.
2. Retrieve account balance.
   Call `get_account_balance` to get the full list of current holdings: ticker, name, quantity, average cost, current price, and unrealized P&L.
3. Retrieve market data for each position.
   For each holding returned in step 2, call `get_stock_price` for current price, PER, and PBR. Call `get_daily_chart` with a 30-day window to get OHLCV bars.
4. Compute technical indicators.
   From the 30-day bar data compute:
   - SMA20: simple mean of the last 20 closing prices
   - SMA20 deviation: (current price − SMA20) / SMA20 × 100%
   - RSI14: standard 14-period Wilder RSI using the closing prices
   Label each position: RSI > 70 = 과매수, RSI < 30 = 과매도, otherwise 정상. Flag SMA20 deviation beyond ±5% as well.
5. Build the portfolio snapshot.
   Assemble the markdown table and the "주의 포지션" section. Sort positions by unrealized P&L descending.
6. Write the answer and file.
   Output the snapshot as the primary chat reply. If the workspace is writable, write or update `analysis-example/kr/portfolio-snapshot.md`.

Read [references/workflow.md](references/workflow.md) for the detailed step-by-step checklist.
Read [references/output-format.md](references/output-format.md) for the exact table and section templates.
Read [references/mcp-setup.md](references/mcp-setup.md) for kiwoom-mcp installation and `.mcp.json` configuration.

## MCP Tool Reference

These tools are provided by the `kiwoom` MCP server (`java-jaydev/kiwoom-mcp`):

| Tool | Purpose |
|---|---|
| `get_account_balance` | Returns all held positions with quantity, average cost, current price, and unrealized P&L |
| `get_stock_price` | Returns current price, PER, PBR, and market cap for a single ticker |
| `get_daily_chart` | Returns OHLCV daily bars for a single ticker over a given period |

## Fallback: No MCP

When kiwoom-mcp is not configured or not reachable:

- Use `scripts/portfolio-snapshot.js` in the `kr-stock-analysis` skill directory.
- Provide holdings via `--input portfolio.json` (see `examples/kr/portfolio-sample.json` for format).
- The script fetches prices and chart data from Yahoo Finance and computes the same indicators.

```bash
node skills/kr-stock-analysis/scripts/portfolio-snapshot.js \
  --input examples/kr/portfolio-sample.json
```

## Operating Rules

- Never use stale prices. All price and P&L data must come from live MCP tool calls or live Yahoo Finance fetches in the same session.
- State the data retrieval timestamp in the output header.
- State that live Kiwoom coverage is limited to domestic KRX holdings when that could affect interpretation.
- Separate live MCP data from any manually entered data when both are present.
- Do not compute a weighted portfolio return — the account balance response provides unrealized P&L directly per position.
- If any single ticker lookup fails, note the failure in the table row and continue with the remaining positions.
- Do not provide a buy or sell recommendation. The snapshot flags technical conditions only. Link to `/kr-stock-analysis` or `/kr-stock-update` for deeper analysis.
- Keep the snapshot file as a rolling single-file update. Do not create a new file per run.

## Source Priority

1. kiwoom-mcp live data (account balance, price, chart)
2. Yahoo Finance via portfolio-snapshot.js fallback (when MCP unavailable)
3. Manually provided JSON for offline or testing scenarios

## Minimum Output Standard

- Snapshot date and retrieval time
- Scope note when live Kiwoom data is used: domestic KRX holdings only
- Markdown table with: ticker, name, current price, 1-day change, SMA20 deviation, RSI14, unrealized P&L, return %, status flag
- Highlighted "주의 포지션" section listing any flagged holdings with the specific condition
- "다음 단계" section linking flagged positions to `/kr-stock-analysis` or `/kr-stock-update`
- Total portfolio unrealized P&L and overall return summary line
