# Portfolio Monitor Workflow Reference

## Step 1 — Check MCP Connectivity

- Attempt a minimal kiwoom-mcp call (e.g., `get_account_balance` with no arguments or a test ping).
- If the call returns a connection error or the tool is not listed, halt MCP flow immediately.
- Tell the user: "kiwoom-mcp is not reachable. Please follow `references/mcp-setup.md` to install and configure it. Falling back to `scripts/portfolio-snapshot.js`."
- In fallback mode, instruct the user to provide `examples/kr/portfolio-sample.json` and run the Node.js script.
- If the user asks for overseas or mixed global holdings, stop and clarify that this skill only covers domestic KRX positions supported by Kiwoom REST API and the bundled fallback.

## Step 2 — Retrieve Account Balance

- Call `get_account_balance`.
- Extract from the response for each position:
  - `ticker` (Yahoo-compatible symbol or raw KRX code)
  - `name` (Korean company name)
  - `quantity` (shares held)
  - `avgCost` (average acquisition price per share in KRW)
  - `currentPrice` (latest price in KRW)
  - `unrealizedPnl` (current P&L in KRW)
- Compute `returnPct = (currentPrice − avgCost) / avgCost × 100` if not already in the response.
- Note the retrieval timestamp to display in the snapshot header.

## Step 3 — Retrieve Market Data Per Position

For each holding from step 2:

### get_stock_price
- Pass the ticker.
- Capture: current price (confirm or override step 2 price if more recent), 1-day change %, PER, PBR.

### get_daily_chart
- Pass the ticker with a 30-day range.
- Capture: array of daily bars (date, open, high, low, close, volume).
- If fewer than 20 bars are returned, note this in the status column and skip RSI14 (requires 14+ bars beyond warmup).

## Step 4 — Compute Technical Indicators

### SMA20
```
SMA20 = mean(last 20 closing prices)
SMA20_deviation = (currentPrice − SMA20) / SMA20 × 100
```

### RSI14 (Wilder method)
```
gains = [max(close[i] - close[i-1], 0) for i in range(1, n)]
losses = [max(close[i-1] - close[i], 0) for i in range(1, n)]
avgGain_initial = mean(gains[:14])
avgLoss_initial = mean(losses[:14])
For subsequent bars:
  avgGain = (avgGain_prev × 13 + gain_current) / 14
  avgLoss = (avgLoss_prev × 13 + loss_current) / 14
RS = avgGain / avgLoss
RSI = 100 − (100 / (1 + RS))
```

### Status Flags
Assign exactly one status per position using this priority order:

1. `⚠️ RSI 과매수` — RSI14 > 70
2. `⚠️ RSI 과매도` — RSI14 < 30
3. `⚠️ SMA20 +5%↑` — SMA20 deviation > +5%
4. `⚠️ SMA20 −5%↓` — SMA20 deviation < −5%
5. `정상` — none of the above

If RSI and SMA20 conditions both apply, include both flags separated by ` / `.

## Step 5 — Build the Portfolio Snapshot

### Header
```
# 포트폴리오 스냅샷 — YYYY-MM-DD HH:MM KST
조회 기준: kiwoom-mcp (또는 fallback: Yahoo Finance)
조회 범위: 국내주식(KRX) 보유분만 포함
```

### Summary Line
```
총 미실현손익: +X,XXX,XXX원 (+X.X%) | 보유 종목 N개
```

### Main Table
Columns in order:

| 티커 | 종목명 | 현재가 | 1일변동 | SMA20 괴리 | RSI14 | 미실현손익 | 수익률 | 상태 |
|---|---|---|---|---|---|---|---|---|

- Format current price with thousand separators and no decimal.
- Format 1-day change as `+1.2%` or `−0.5%` with sign.
- Format SMA20 deviation as `+3.1%` or `−1.8%` with sign.
- Format RSI14 to one decimal place.
- Format unrealized P&L with thousand separators and sign (KRW).
- Format return % with one decimal and sign.
- Sort rows by unrealized P&L descending.

### 주의 포지션 Section
List only flagged positions (those not labeled `정상`). For each:
```
- **[종목명] ([티커])**: [조건 설명] — [권장 액션]
```

권장 액션 mapping:
- First time this stock appears in the workspace (no prior `analysis-example/kr/<company>.md`): recommend `/kr-stock-analysis [티커]`
- Prior memo exists: recommend `/kr-analysis-update [티커]`
- RSI over-bought: suggest considering partial trim and thesis review.
- RSI over-sold: suggest checking for fundamental change before averaging down.

### 다음 단계 Section
```
## 다음 단계
- 심층 분석: /kr-stock-analysis [티커]
- 기존 메모 업데이트: /kr-analysis-update [티커]
```

## Step 6 — Write the File

- Write or overwrite `analysis-example/kr/portfolio-snapshot.md` when the workspace is writable.
- Do not create dated archive copies; a single rolling file is correct.
- Reply in chat with the same content so the user can read it immediately.

## Failure Modes To Avoid

- Using prices from step 2 without confirming via `get_stock_price` when a more recent price is needed.
- Implying that overseas holdings were checked when the Kiwoom REST API flow only covers domestic KRX positions.
- Returning RSI when fewer than 15 closing prices are available (need 14 periods of differences plus at least 1 warmup bar).
- Conflating unrealized P&L in the MCP response with realized gains.
- Recommending buys or sells — the skill produces a monitoring snapshot, not investment advice.
- Writing a new dated file instead of updating the rolling `portfolio-snapshot.md`.
