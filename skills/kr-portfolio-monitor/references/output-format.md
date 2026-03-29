# Portfolio Snapshot Output Format

## Full Template

```markdown
# 포트폴리오 스냅샷 — {YYYY-MM-DD HH:MM KST}

조회 기준: kiwoom-mcp | 총 미실현손익: {+/-X,XXX,XXX}원 ({+/-X.X%}) | 보유 종목 {N}개
조회 범위: 국내주식(KRX) 보유분만 포함

| 티커 | 종목명 | 현재가 | 1일변동 | SMA20 괴리 | RSI14 | 미실현손익 | 수익률 | 상태 |
|---|---|---|---|---|---|---|---|---|
| 066970.KQ | L&F | 98,400 | +1.2% | +3.1% | 58.2 | +340,000 | +3.6% | 정상 |
| 001120.KS | LG CNS | 63,500 | −0.5% | −1.8% | 72.1 | +300,000 | +2.4% | ⚠️ RSI 과매수 |
| 005930.KS | 삼성전자 | 71,200 | −1.1% | −6.2% | 44.3 | −180,000 | −2.5% | ⚠️ SMA20 −5%↓ |

## 주의 포지션

- **LG CNS (001120.KS)**: RSI 72.1 (과매수) — 기존 메모가 있다면 `/kr-stock-update 001120.KS`로 thesis 점검 권장
- **삼성전자 (005930.KS)**: SMA20 대비 −6.2% 이탈 — `/kr-stock-analysis 005930.KS`로 수급 및 펀더멘털 점검 권장

## 다음 단계

- 심층 분석: /kr-stock-analysis [티커]
- 기존 메모 업데이트: /kr-stock-update [티커]
```

## Column Definitions

| Column | Format | Notes |
|---|---|---|
| 티커 | `XXXXXX.KS` or `XXXXXX.KQ` | Full Yahoo-style ticker |
| 종목명 | Korean company name | As returned by kiwoom-mcp |
| 현재가 | Integer with thousand separator | KRW, no decimals |
| 1일변동 | `+X.X%` or `−X.X%` | Use Unicode minus `−` not hyphen |
| SMA20 괴리 | `+X.X%` or `−X.X%` | (price − SMA20) / SMA20 |
| RSI14 | `XX.X` | One decimal, Wilder method |
| 미실현손익 | `+/-X,XXX,XXX` | KRW with thousand separator |
| 수익률 | `+X.X%` or `−X.X%` | (currentPrice − avgCost) / avgCost |
| 상태 | See flags below | Priority: RSI > SMA20 > 정상 |

## Status Flag Values

| Flag | Condition |
|---|---|
| `정상` | RSI 30–70 and SMA20 deviation within ±5% |
| `⚠️ RSI 과매수` | RSI14 > 70 |
| `⚠️ RSI 과매도` | RSI14 < 30 |
| `⚠️ SMA20 +5%↑` | SMA20 deviation > +5% |
| `⚠️ SMA20 −5%↓` | SMA20 deviation < −5% |
| `⚠️ RSI 과매수 / SMA20 +5%↑` | Both RSI > 70 and deviation > +5% |
| `데이터 부족` | Fewer than 15 closing prices returned |

## Fallback Header (Yahoo Finance)

When MCP is unavailable and the script fallback is used:

```markdown
# 포트폴리오 스냅샷 — {YYYY-MM-DD}

조회 기준: Yahoo Finance (kiwoom-mcp 미연결) | 총 미실현손익: 수동 입력 기준
조회 범위: 국내주식(KRX) 보유분만 포함
```

## File Location

- Rolling file: `analysis-example/kr/portfolio-snapshot.md`
- Do not create per-run dated copies.
- Each run overwrites the existing file entirely.
