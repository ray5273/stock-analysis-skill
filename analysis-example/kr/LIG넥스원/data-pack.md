# LIG넥스원 Data Pack

## Security

- Ticker: `079550`
- Market: KOSPI
- Share class: 보통주
- Structure: 국내 방산 전자체계 중심 운영회사
- 발행주식수: `22,000,000주`
- 유통주식수: `21,845,250주`
- 자기주식: `154,750주 (0.70%)`

## Price Context

| Metric | Value | Date | Source |
| --- | --- | --- | --- |
| Current price | `810,000원` | 2026-04-06 | Yahoo Finance chart API via `fetch-kr-chart.js` |
| Market cap | `약 17.82조원` | 2026-04-06 | 현재가 × 발행주식수 |
| 20D breakout level | `893,000원` | 2026-04-06 | chart-basics output |
| 20D breakdown level | `604,000원` | 2026-04-06 | chart-basics output |
| Dividend per share | `2,950원` | 2026-03-31 확정 | 정기주주총회 결과 |

## Latest Results

- 2025년 연결 매출은 `4조 3,069억원`, 영업이익은 `3,194억원`, 총당기순이익은 `2,375억원`이었다.
- 2025년 지배기업소유주지분 순이익은 `2,534억원`, 기본 EPS는 `11,604원`이었다.
- 사업보고서 MD&A는 `UAE향 천궁-II 수출사업`, `국내 연구개발 사업`, `정밀타격 대규모 양산사업`을 성장 배경으로 적시했다.
- audited 공식 backlog는 2025년말 `26조 2,526억원`이었다.

## Revenue Mix

- 제품/사업부:
  `PGM 47.2%`, `C4I 24.7%`, `AEW 13.1%`, `ISR 12.1%`, `기타 2.9%`.
- 고객 집중도:
  `A고객 46.4%`, `B고객 12.1%`, 합계 `58.4%`.
  고객명은 `not separately disclosed`.
- 지역 믹스:
  `국내 80.1%`, `해외 19.9%`.

## Balance Sheet And Capital Allocation

- 2025년말 자산총계 `8조 647억원`, 부채총계 `6조 5,887억원`, 총자본 `1조 4,761억원`, 지배주주지분 `1조 4,301억원`.
- 계약자산 `1조 707억원`, 계약부채 `3조 8,335억원`, 계약부채 중 프로젝트 관련 선수금 `3조 6,782억원`.
- 영업활동현금흐름은 `-5,598억원`으로 적자였고, 유형자산 취득 `1,698억원`, 무형자산 취득 `760억원`이 있었다.
- 정기주총에서 보통주 `1주당 2,950원` 배당, `집중투표제 배제 조항 삭제`, `사명 변경`, `사채 발행 규모 확대`가 가결됐다.

## Governance And Structure

- 2026-03-31 주총 후 이사 총수는 `7명`, 사외이사는 `4명`, 사외이사 비율은 `57.1%`.
- 감사위원회 위원이 되는 사외이사 `김승주`가 신규선임됐고, 사내이사 `차상훈`이 재선임됐다.
- 2025년말 자기주식 보유비율은 `0.70%`다.
- 사업보고서는 2025년 배당 절차 개선 정관 변경 이후 `배당액 확정일 선행` 구조를 적용했다고 명시한다.

## Valuation Inputs

| Metric | Value | Date | Note |
| --- | --- | --- | --- |
| Current price | `810,000원` | 2026-04-06 | chart API |
| Market cap | `약 17.82조원` | 2026-04-06 | 파생 계산 |
| Trailing PER | `69.8x` | 2026-04-06 / 2025 실적 | `810,000 / EPS 11,604` |
| Forward PER | `not cleanly verifiable` | 2026-04-06 | 현재 공식 소스셋에 컨센서스 부재 |
| P/B | `12.46x` | 2026-04-06 / 2025말 지배주주지분 | `17.82조원 / 1.430조원` |
| EV/EBITDA | `not cleanly verifiable` | Mixed date | 순차입금과 EBITDA 기준일 불일치 |
| FCF yield | `약 -4.7%` | 2025 CF / 2026-04-06 MCAP | `(-5,598 - 1,698 - 760)억원 / 17.82조원` 근사 |
| Dividend yield | `약 0.36%` | 2026-04-06 | `2,950 / 810,000` |
| Backlog / Sales | `6.10x` | 2025말 / 2025 매출 | 공식 backlog 기준 |

## External Views

| Source role | Date | Takeaway | Verification status | Source |
| --- | --- | --- | --- | --- |
| Specialist media | 2026-02-02 | 실적과 backlog는 강하지만 추가 해외수주와 Ghost Robotics 관련 부담 해소가 관건이라는 시각 | audited 실적과 backlog는 확인, 해석은 외부 시각 | 녹색경제신문 |
| Official company news | 2026-03-25 | 팔란티어와 UAE 통합방공망 및 무인체계 솔루션 협력 MOU 체결 | 공식 회사 발표 | 회사소식 |

## Chart Inputs

- OHLCV window: `1y 1d`, latest date `2026-04-06`
- Key technical fields:
  `MA5 771,800`, `MA20 724,800`, `MA60 596,633`, `MA120 511,908`, `RSI14 58.35`, `MACD 48,655`, `ADX14 31.62`
- Chart-only flow:
  `bullish continuation`

## Sources

- DART 사업보고서 KRX 뷰어: `https://kind.krx.co.kr/external/2026/03/23/001725/20260323007318/11011.htm`
- 정기주주총회 결과: `https://kind.krx.co.kr/external/2026/03/31/001667/20260320001823/91482.htm`
- 2025년 4분기 영업(잠정) 실적 IR 페이지: `https://www.ligdefenseaerospace.com/eng/ir/irReportView.do?bbs_no=7326`
- 회사소식: 팔란티어 MOU: `https://www.ligdefenseaerospace.com/news/nex1newsView.do?bbs_no=7341`
- Specialist media: `https://www.greened.kr/news/articleView.html?idxno=336500`
- Yahoo Finance chart API: `https://query1.finance.yahoo.com/v8/finance/chart/079550.KS?range=1y&interval=1d`
