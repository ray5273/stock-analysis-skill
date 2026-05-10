# GS (078930) Data Pack

기준일: 2026-05-10
범위: GS그룹 지주회사 (주식회사 지에스) — KRX 보통주 078930
Mode: 기존 Phase B 산출물 합성 (DART/차트 재수집 없음)

## Security

- Ticker: 078930.KS (KOSPI)
- 회사: 주식회사 지에스 (GS Holdings) — 지주회사
- Share class: 보통주 (우선주 078935 별도 상장)
- Structure: 허씨일가 + 특수관계인 53.59% 지배 지주회사. 직접 자회사: GS에너지, GS리테일, GS글로벌, GS이피에스 등. GS칼텍스는 GS에너지(50%)와 Chevron(50%)의 합작.
- 출처: dart-analysis.md §5, dart-reference.md §VII

---

## (a) Price / Valuation Snapshot

출처: `chart-data.json` (Yahoo Finance, 2024-05-08~2026-05-08), `dart-analysis.md` §1·§4-1, `analyst-report-insight.md` (Consensus)

| Metric | Value | Date | Source |
| --- | --- | --- | --- |
| 종가 | ₩79,400 | 2026-05-08 | chart-data.json |
| 52주 고가 | ₩84,000 | last 252 sessions | chart-data.json |
| 52주 저가 | ₩37,700 | last 252 sessions | chart-data.json |
| YoY 수익률 | +107.9% | 2025-05 → 2026-05 | chart-data.json |
| SMA20 | ₩75,120 | 2026-05-08 | chart-data.json |
| SMA60 | ₩70,095 | 2026-05-08 | chart-data.json |
| RSI14 | 63.7 | 2026-05-08 | chart-data.json |
| 컨센서스 목표주가 (median) | ₩26,500 | 2026-05-10 lookback 361d | analyst-report-insight.md |
| 컨센서스 목표주가 (range) | ₩15,000 – ₩80,000 | 32 reports w/ TP | analyst-report-insight.md |
| TP trajectory | 2025-05 ₩19,000 → 2026-04 ₩40,000 → 2026-05 ₩31,000 | monthly median | analyst-report-insight.md |

| Metric | Value | Date | Note |
| --- | --- | --- | --- |
| 주당 현금배당 (보통주) | ₩3,000 | FY2025 | 3년 연속 인상 (2,500→2,700→3,000) — dart-analysis.md §4-1 |
| 현금배당수익률 (보통주) | 4.30% | FY2025 기준 | 단, 시점별 주가에 따라 실제 yield는 변동 — dart-analysis.md §4-1 |
| 연결 현금배당성향 | 35.6% (FY25) vs 45.1% (FY24) | FY2025 | dart-analysis.md §4-1 |
| 별도 배당총액 vs 별도 순이익 | 284,114 / 249,903 (백만원) | FY2025 | 별도 기준 100%+ 배당성향 — dart-analysis.md §4-1 |

> ⚠ 주의: 컨센서스 목표주가 ₩26,500 (median)은 **현주가 ₩79,400 대비 -67%**로 비정상적 괴리. 아래 "Inconsistencies" 참고. P/E·P/B 멀티플은 사업보고서/리서치 어디에도 명시 인용 없음 — 별도 valuation 계산 단계에서 산출 필요.

---

## (b) Revenue / Dividend Mix from Subsidiaries

출처: `dart-analysis.md` §2 (NAV 구성), §3 (배당수익 흐름), `dart-reference.md` (XII 상세표, X 거래내용)

### NAV 구성 — 주요 종속·관계회사

- 연결 대상 회사 수: 64사 (상장 3사 + 비상장 61사). 국내 계열사 100개, 해외 19개.
- 자산총계 기준 (백만원, 사업보고서 별도 표):
  - GS에너지(주) 6,614,981 — GS칼텍스 50% 보유 (에너지 지주)
  - 인천종합에너지(주) 589,868 — 집단에너지
  - 위드인천에너지(주) 261,595 — 집단에너지
  - GS리테일(주) — 상장 (편의점·홈쇼핑), 지주 직접 보유
  - GS글로벌(주) — 상장 (종합상사), 지주 직접 보유
  - GS이피에스(주) — 발전, 지주 직접 보유
  - 파르나스호텔(주) — 호텔/관광

### 별도(주)지에스가 받는 자회사 배당 (백만원)

| 배당 지급사 | FY2025 | FY2024 | YoY |
| --- | --- | --- | --- |
| 지에스에너지(주) | 79,800 | 306,250 | -73.9% |
| 지에스이피에스(주) | 95,181 | 171,407 | -44.5% |
| (주)지에스리테일 | 24,505 | 30,317 | -19.2% |
| (주)지에스글로벌 | 1,046 | 1,046 | 0.0% |
| **합계 (직접 자회사 배당)** | **200,532** | **509,020** | **-60.6%** |

- 배당금수취(영업현금흐름): FY25 154,370 / FY24 376,545 / FY23 711,845 — 3년 연속 감소.
- 안정적 부수 수익: 임대수익 + 상표권 (예: GS칼텍스 42,465백만원, GS리테일 23,744백만원, GS건설 16,359백만원, FY25 별도).
- **시사점**: 별도 손익은 자회사 배당에 ~80% 의존. GS에너지(=GS칼텍스 정유마진) 약세가 별도 배당여력을 직접 압박 중.

---

## (c) Recent Results vs Prior Year (FY2025 vs FY2024)

출처: `dart-analysis.md` §1, `dart-reference.md` (III. 재무에 관한 사항 + Z-6 fnlttSinglAcntAll)

| 지표 (백만원, 연결) | FY2025 | FY2024 | FY2023 | FY25 YoY |
| --- | --- | --- | --- | --- |
| 매출액 | 25,184,127 | 25,249,976 | 25,924,671 | -0.3% |
| 매출원가 | 19,136,787 | 19,066,519 | 19,218,281 | +0.4% |
| 매출총이익 | 6,047,340 | 6,183,457 | 6,706,390 | -2.2% |
| 영업이익 | 2,936,061 | 3,077,185 | 3,744,476 | -4.6% |
| 당기순이익(연결) | 1,038,137 | 863,517 | 1,578,711 | +20.2% |
| 지배주주 당기순이익 | 798,737 | 567,020 | 1,300,651 | +40.9% |

- 별도 (주)지에스 당기순이익 FY25 249,903백만원 (전기 561,636, **-55.5% YoY**) — 자회사 배당수익 감소 직접 반영.
- 매출·영업이익은 정유 약세로 소폭 감소. 지배주주 순이익은 일회성/세금/지분법 효과로 +40.9% 회복.
- 컨퍼런스/IR 가이던스: 본 데이터팩에서는 별도 인용 없음 (사업보고서 IV. 경영진단의견에서만 일반적 견해 제시).

---

## (d) Balance Sheet & Capital Allocation

출처: `dart-analysis.md` §1·§4·§7, `dart-reference.md` (Z-6 재무상태표, Z-3 자기주식)

| 지표 (백만원, 연결) | FY2025 | FY2024 | FY2023 |
| --- | --- | --- | --- |
| 자산총계 | 35,707,911 | 35,063,398 | 34,448,425 |
| 자본총계 | 19,194,117 | 18,470,356 | 17,625,195 |
| 부채비율(자산-자본 기준) | ~86% | ~90% | ~95% |
| 유동자산 | 5,409,932 | 5,706,980 | 5,982,341 |

### Capital allocation

- **배당**: FY25 현금배당총액 284,114백만원 (전기 255,712). 주당 ₩3,000으로 3년 연속 인상.
- **자기주식**: 보통주 19,883주(약 0.02%) + 우선주 5,150주 — FY25 변동 0주. **자사주 매입·소각 여지 사실상 없음** (출처: Z-3 tesstkAcqsDspsSttus).
- **별도 배당성향 100% 초과**: 별도 순이익 249,903 < 배당총액 284,114 → 잉여금/자회사 배당의존 심화 시그널.
- **증자/감자**: FY25 변동 없음 (Z-4, partial 응답이지만 본문 확인).
- **신규 단일계약 공시**: 지주 본사 명의 없음 (자회사 GS글로벌·GS이피에스 등 합산 공시만 — XI 섹션).

---

## (e) Governance / Ownership (기준일 2025-12-31)

출처: `dart-analysis.md` §5·§6, `dart-reference.md` (VII. 주주, VI. 이사회)

### 지배주주 / 특수관계인

- 최대주주: **허창수 명예회장** 4,344,995주 (4.68%) — 변동 없음
- 특수관계인 합계: **49,793,403주 (53.59%)** — 기초 53.33% → +0.26%p
- 5%+ 개별 보유:
  - 허용수 4,889,718주 (5.26%) — 변동 없음
  - 허준홍 4,380,910주 (4.71%, 기초 3.44%) — **+1,180,910주 신규 매수, 가장 큰 변동**
- 주요 4세대 변동:
  - 허준홍 +1.27%p (3.44 → 4.71%)
  - 허정윤 +0.69%p, 허정홍·허정현·허서홍 소폭 매수
  - **허광수 -500,000주, 허남각 -1,816,670주(보유 소멸)** ← 세대 간 이전 추정
- 외부 단일 최대주주: **국민연금공단 7,014,212주 (7.55%)**
- 소액주주: 99.86% (43,757명) / 38.25%

### 이사회 / 감사

- 이사회 구성: 사내이사 3 + 사외이사 4 = 7인. 의장은 대표이사가 겸임.
- 위원회: 감사위원회, ESG위원회, 사외이사후보추천위원회.
- 회장: **허태수** (대표이사, 1,969,234주, 친인척, 재직 6.0년).
- 감사인: FY25 삼일회계법인 (전기 안진 → 변경). 양 기수 모두 적정의견. 핵심감사사항: 별도-종속기업투자자산 손상, 연결-영업권 손상.
- 관련당사자 거래: 신용공여·자산양수도·영업거래 모두 "해당사항 없음" — 임대·상표권·배당이 중심.

> 모니터링 포인트: **허준홍의 4세대 승계 구도 부각** + 부친 허남각 지분 전량 소멸 → 2026년 이후 지배구조 이벤트 가능성.

---

## (f) Consolidated External Views

| Source role | Date | Source name | Takeaway | Verification status | Source |
| --- | --- | --- | --- | --- | --- |
| sell-side consensus | 2026-05-10 | Hankyung Consensus (38건, 10 brokers) | TP median ₩26,500, BUY 30 / HOLD 1 / SELL 0 / N/A 7 — **현주가 ₩79,400 대비 -67% 괴리**. 단, 대다수 리포트가 GS 자회사(리테일·건설·피앤엘·GST) 대상이며 지주(078930) 직접 커버는 소수. | sell-side (broker) | analyst-report-insight.md |
| sell-side (지주 직접) | 2026-02-11 | 유진투자증권 황성현 — "배당 서프라이즈" | TP **₩80,000 (+33%)**, BUY 유지. 1Q26 매출 6.5조(+5%yoy), 영업이익 8,758억(+9%yoy). GS에너지 E&P가 파워 부진 만회. BPS 시점 '26년으로 변경 + 배당성향 상향 반영. | sell-side (broker) | https://consensus.hankyung.com/analysis/downpdf?report_idx=646798 |
| sell-side (자회사 GS리테일) | 2026-05-08 | LS증권 오린아 / 한화 이진협 | GS리테일 1Q26 매출 +3.8% YoY, 영업이익 +39.4% YoY 호실적. TP ₩30,000~₩32,000 BUY. | sell-side (broker) | analyst-report-insight.md |
| sell-side (자회사 GS건설) | 2026-04-09~10 | LS 김세련 / 한화 송유림 | GS건설 1Q26 영업이익 +32.5% YoY, 주택믹스 개선 + 원전 신사업 모멘텀. TP ₩50,000~₩51,000 BUY. | sell-side (broker) | analyst-report-insight.md |
| foreign IB | **2017-11-28 (구舊)** | Nomura, Buy | "GS, 순자산가치 대비 30% 할인돼 거래" — NAV discount 견해. **참고: 8년 묵은 single-source view, 현 시점 활용도 낮음.** | foreign-IB (news) | foreign-views.md (thebell.co.kr) |
| independent (blogger) | 2026-04-12 | guidesyj — "에너지·유통·건설 지주사 + 배당 가치주 + 박스권 전략" | 지주사 안정적 배당 + 자회사 가치 반영 구조. 박스권 트레이딩 관점. | unverified (blogger) | https://m.blog.naver.com/guidesyj/224249516840 |
| independent (blogger) | 2026-04-20 | guidesyj — GS피엔엘 (파르나스 + 관광 회복) | 호텔·쇼핑·외식으로 리오프닝 핵심 소비주. 자회사 NAV에 긍정 시사. | unverified (blogger) | https://m.blog.naver.com/guidesyj/224258339077 |
| independent (blogger) | 2026-05-08 | gunyoung88 — GS피앤엘 1Q 펀더멘탈 강조 | 견조한 1분기 실적 전망. | unverified (blogger) | naver-insights.md |
| independent (blogger) | 2026-04-23, 2026-04-28 | 8989vkfrn / msstocks 외 6 bloggers, 24 posts total | 배당주·NAV 디스카운트 테마 중심 커버리지. | unverified (blogger) | naver-insights.md |

---

## Chart Inputs

- OHLCV window: 2024-05-08 ~ 2026-05-08 (2년 일봉, ~500 bars), `chart-data.json`
- Key technical fields available: SMA20 ₩75,120 / SMA60 ₩70,095 / RSI14 63.7 / 52w range ₩37,700–84,000 / YoY +107.9%
- Embedded charts in `assets/`: 차트 PNG는 본 데이터팩 작성 시점 기준 미생성 — 메모 작성 전 `chart-basics.js` 또는 harness `--mode chart` 필요.

---

## Sources (artifact map)

| Artifact | 사용 블록 |
| --- | --- |
| `dart-analysis.md` | (b) revenue/dividend mix, (c) results, (d) balance sheet, (e) governance |
| `dart-reference.md` + `dart-cache.json` | (c)·(d)·(e) 원본 표/구조 데이터 검증 |
| `chart-data.json` | (a) 가격·기술적 지표 |
| `analyst-report-insight.md` | (a) 컨센서스 TP, (f) sell-side 38건 |
| `naver-insights.md` | (f) independent (blogger) 24 posts / 6 bloggers |
| `foreign-views.md` + `foreign-coverage.json` | (f) foreign-IB 1건 (Nomura, 2017) |

---

## Inconsistencies / Gaps for the Memo Writer

1. **컨센서스 TP가 현주가와 -67% 괴리 (₩26,500 vs ₩79,400)**.
   원인은 `analyst-report-insight.md`에 수집된 38건 중 대부분이 **GS 자회사(GS리테일 007070, GS건설 006360, GS피앤엘 499790, GST 등) 리포트**이고, GS 지주(078930) 직접 커버 보고서는 **유진투자증권 황성현 (2026-02-11, TP ₩80,000)**이 사실상 유일. 즉 median ₩26,500은 ticker mismatch에 가까운 통계로, 메모에 그대로 인용하면 큰 오해를 부를 수 있음. **GS(078930) 단독 컨센서스만 별도 분리해 인용할 것.** (The "유진 ₩80,000" outlier flag in the divergence section is실제로 outlier가 아니라 유일한 적정 직접 커버.)
2. **Foreign IB 단일 출처가 2017년 Nomura** — 9년 가까이 된 견해. Phase B의 `kr-foreign-analyst` 결과가 사실상 비어있음. 메모의 "Street / Alternative Views"에서는 단순히 "최근 외국계 직접 커버 매우 제한적"으로 처리하고 NAV discount 일반론 정도만 차용 권장.
3. **별도 배당성향 100% 초과 (FY25 배당총액 ₩2,841억 > 별도 순이익 ₩2,499억)** — 자회사(특히 GS에너지) 배당여력 회복이 없으면 향후 배당 유지 가능성에 의문. 메모에서 핵심 리스크로 다뤄야 함.
4. **자기주식 매입 여지 거의 없음** (보유 0.02%, FY25 변동 0). 추가 환원 카탈리스트는 배당 인상 또는 신규 자사주 결의 필요.
5. **OpenDART 보조 엔드포인트 3건(Z-1 majorshareholder, Z-4 irdsSttus, Z-5 cpndlhCmpsBoardCo) status=101 에러** — 본문 VII·VIII에 동일 정보 있어 분석에는 영향 없음 (`dart-analysis.md` §10).
6. **GS칼텍스 단독 손익은 본 사업보고서에 미포함** (GS에너지의 50% 합작사로만 표기). 정유 마진 민감도 분석이 필요하면 별도 GS칼텍스 비상장 사업보고서 조회 필요.
7. **NAV 시가평가 미수행** — 본 데이터팩은 자산총계(장부가) 기준만 정리. 상장 자회사(GS리테일·GS글로벌) 시가총액 × 지분율 + 비상장(GS칼텍스·GS에너지·GS이피에스·파르나스) 추정 NAV는 메모 단계에서 직접 계산 필요. Nomura 2017 "30% NAV discount"는 시계열 비교 출발점으로만.
8. **블로거 24개 포스트 중 GS 지주(078930) 직접 분석은 소수** — 다수가 GS피앤엘·GS글로벌·GS건설·GS리테일 등 자회사. 인용 시 ticker 분리 필요.
9. **차트 PNG 미생성**: `assets/` 비어 있음. 메모 작성 전 `harness --mode chart` 또는 `chart-basics.js` 호출 필요.
10. **밸류에이션 멀티플(P/E, P/B, EV/EBITDA) 명시 인용 없음** — 데이터팩 inputs(연결 순이익 1,038,137 / 자본 19,194,117 / 시가총액 ≈₩7.4조 추정)으로부터 메모 작성자가 직접 산출 필요.
