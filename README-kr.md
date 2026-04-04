# Stock, Portfolio, And Sector Analysis Skill

미국 주식, 한국 주식, KRX 포트폴리오, 한국 섹터 리서치용 AI 스킬 모음입니다. **Codex**와 **Claude Code**(Anthropic CLI)에서 사용할 수 있습니다.

언어별 문서:

- 영어: [README.md](README.md)
- 한국어: [README-kr.md](README-kr.md)

포함된 스킬:

- `us-stock-analysis`: 미국 상장 주식과 미국 상장 ETF 분석
- `kr-stock-plan`: 한국 주식 리서치 범위를 실행용 브리프로 정리
- `kr-dart-analysis`: 한국 DART 공시에서 분기, 반기, 사업부문, 고객집중 등 핵심 내용을 정밀 추출
- `kr-stock-data-pack`: 종목 메모 작성 전에 구조화된 팩트팩과 외부 관점 입력값 수집
- `kr-stock-analysis`: 한국 주식 quick view, full memo, 이벤트 노트, pair compare 작성과 외부 관점 요약, 후속 리서치 질문 생성
- `kr-stock-update`: 기존 한국 주식 메모에 기준일 이후 업데이트를 누적 반영
- `kr-portfolio-monitor`: 키움 REST API 기반 국내주식 포트폴리오 스냅샷
- `kr-sector-plan`: 한국 섹터 리서치 범위를 실행용 브리프로 정리
- `kr-sector-data-pack`: 섹터 보고서 작성 전에 구조화된 팩트팩 수집
- `kr-sector-analysis`: 한국 섹터 quick brief 또는 full report 작성
- `kr-sector-compare`: 같은 날짜 기준의 한국 섹터 비교
- `kr-sector-audit`: 기존 한국 섹터 문서의 소스, 날짜, 논리 검토
- `kr-sector-update`: 기존 한국 섹터 메모의 증분 업데이트

## 동작 방식

공통 원칙:

- 모든 스킬은 시점 민감 정보를 메모리 대신 최신 소스로 다시 확인합니다.
- 워크스페이스가 쓰기 가능하면 기본 산출물은 채팅 답변만이 아니라 마크다운 파일입니다.
- 주식 메모는 `analysis-example/kr/<company>/memo.md`, 섹터 문서는 `analysis-example/kr-sector/<sector>.md`에 맞춰 씁니다.
- 최종 답변과 파일은 같은 기준일을 공유해야 합니다.

### `us-stock-analysis`

주요 문서:

- [skills/us-stock-analysis/SKILL.md](skills/us-stock-analysis/SKILL.md)
- [skills/us-stock-analysis/references/workflow.md](skills/us-stock-analysis/references/workflow.md)
- [skills/us-stock-analysis/references/output-format.md](skills/us-stock-analysis/references/output-format.md)

현재 동작:

1. 종목, 거래소, 기간, 비교 대상, 출력 모드를 먼저 확정합니다.
2. SEC 공시와 IR 자료를 우선으로 최신 수치를 확인합니다.
3. 사업 구조, 재무 품질, 자본 배분, 촉매, 리스크를 바탕으로 논리를 정리합니다.
4. 업종에 맞는 밸류에이션을 선택합니다.
5. 풀 메모, 비교, 실적 전후 노트 형식으로 출력합니다.

### `kr-stock-*` 스킬 세트

주요 문서:

- [skills/kr-stock-plan/SKILL.md](skills/kr-stock-plan/SKILL.md)
- [skills/kr-dart-analysis/SKILL.md](skills/kr-dart-analysis/SKILL.md)
- [skills/kr-stock-data-pack/SKILL.md](skills/kr-stock-data-pack/SKILL.md)
- [skills/kr-stock-analysis/SKILL.md](skills/kr-stock-analysis/SKILL.md)
- [skills/kr-stock-analysis/references/blended-source-notes.md](skills/kr-stock-analysis/references/blended-source-notes.md)
- [skills/kr-stock-update/SKILL.md](skills/kr-stock-update/SKILL.md)

현재 동작:

1. `kr-stock-plan`은 모호한 종목 요청을 정확한 종목, 주식 종류, 기간, 출력 모드가 담긴 브리프로 정리합니다.
2. `kr-dart-analysis`는 최신 DART 공시에서 매출, 영업이익, 사업부문, 고객집중, 증감 사유를 정확한 표와 섹션 단위로 정리하고, 누적 공시만 있을 때는 분기 단독 수치를 차감 계산으로 분리합니다.
3. `kr-stock-data-pack`은 가격 기준일, 공시, 실적, 거버넌스, 밸류 입력값, 차트 입력값, 필요할 때는 증권사·전문매체·독립 분석의 외부 관점도 구조화해서 모읍니다.
4. `kr-stock-analysis`는 KRX 상장 주식 기준으로 `quick view`, `full memo`, `pre-earnings note`, `post-earnings note`, `pair compare`를 작성하고, full memo에는 `Street / Alternative Views` 섹션과 현재 근거 공백에 연결된 후속 리서치 질문을 붙입니다.
5. `kr-stock-update`는 기존 `기준일`을 보존하고 `최근 업데이트일`과 `## Update Log`만 증분 갱신합니다.
6. `kr-stock-analysis`의 차트 출력은 이제 기본적으로 분리형이며, `OHLC 캔들스틱 + 종가선 + MA5/20/60/120 + 거래량` 메인 PNG 1장과 `볼린저밴드 + 일목균형표 + RSI14` 오버레이 PNG 1장을 함께 생성합니다.

번들 도구:

- `scripts/fetch-kr-chart.js`: KRX 일봉 데이터 조회
- `scripts/chart-basics.js`: 주가/이평/거래량과 오버레이 지표를 분리한 PNG 차트 생성
- `scripts/chart-basics.js`: KR 메인 차트는 캔들스틱, 종가선, 현재가 가이드 라인을 기본으로 그리고, 한글 폰트를 찾을 수 있으면 범례와 패널명을 한글로 표시
- `scripts/chart-basics.js`: `--png-out`으로 지정한 파일은 메인 추세 차트로 저장하고, 같은 이름의 `-overlay.png` 파일을 보조지표 차트로 추가 생성
- `scripts/valuation-bands.js`: 3~5년 밸류에이션 밴드 요약
- `scripts/peer-valuation.js`: 피어 밸류에이션 표 생성
- [skills/kr-stock-update/scripts/extract-report-baseline.js](skills/kr-stock-update/scripts/extract-report-baseline.js): 메모 기준일, 업데이트 날짜, source URL 추출
- [skills/kr-stock-update/scripts/normalize-update-log.js](skills/kr-stock-update/scripts/normalize-update-log.js): 날짜별 업데이트 블록 생성 및 메모 반영

### `kr-portfolio-monitor`

주요 문서:

- [skills/kr-portfolio-monitor/SKILL.md](skills/kr-portfolio-monitor/SKILL.md)
- [skills/kr-portfolio-monitor/references/workflow.md](skills/kr-portfolio-monitor/references/workflow.md)
- [skills/kr-portfolio-monitor/references/output-format.md](skills/kr-portfolio-monitor/references/output-format.md)
- [skills/kr-portfolio-monitor/references/mcp-setup.md](skills/kr-portfolio-monitor/references/mcp-setup.md)

현재 동작:

1. `kiwoom-mcp` 연결을 먼저 확인합니다.
2. 국내 KRX 보유 종목만 대상으로 계좌 잔고와 가격을 가져옵니다.
3. SMA20 이격도와 RSI14를 계산해 과열/과매도 구간을 표시합니다.
4. 결과를 `analysis-example/kr/portfolio-snapshot.md`에 업데이트합니다.
5. MCP 연결이 안 되면 수동 JSON과 Yahoo Finance 데이터를 사용하는 fallback을 씁니다.

### `kr-sector-*` 스킬 세트

주요 문서:

- [skills/kr-sector-plan/SKILL.md](skills/kr-sector-plan/SKILL.md)
- [skills/kr-sector-data-pack/SKILL.md](skills/kr-sector-data-pack/SKILL.md)
- [skills/kr-sector-analysis/SKILL.md](skills/kr-sector-analysis/SKILL.md)
- [skills/kr-sector-compare/SKILL.md](skills/kr-sector-compare/SKILL.md)
- [skills/kr-sector-audit/SKILL.md](skills/kr-sector-audit/SKILL.md)
- [skills/kr-sector-update/SKILL.md](skills/kr-sector-update/SKILL.md)

현재 동작:

1. `kr-sector-plan`은 섹터 범위와 출력 모드를 정합니다.
2. `kr-sector-data-pack`은 시장 지표, 정책, 규제, 밸류체인, 상장사 후보를 모읍니다.
3. `kr-sector-analysis`는 quick brief 또는 full report를 작성합니다.
4. `kr-sector-compare`는 같은 날짜 기준으로 섹터를 비교합니다.
5. `kr-sector-audit`는 findings-first 형식으로 기존 문서를 점검합니다.
6. `kr-sector-update`는 기존 메모의 증분 업데이트를 관리합니다.

## 설치

### Codex

설치 경로: `$CODEX_HOME/skills/<skill-name>` 기본값은 `~/.codex/skills/`

Windows:

```powershell
.\scripts\install-skill.ps1 us-stock-analysis
.\scripts\install-all-skills.ps1
```

Linux 또는 macOS:

```bash
bash ./scripts/install-skill.sh us-stock-analysis
bash ./scripts/install-all-skills.sh
```

### Claude Code

설치 경로: `$CLAUDE_HOME/skills/<skill-name>` 기본값은 `~/.claude/skills/`

Windows:

```powershell
.\scripts\install-claude-skill.ps1 us-stock-analysis
.\scripts\install-all-claude-skills.ps1
```

Linux 또는 macOS:

```bash
bash ./scripts/install-claude-skill.sh us-stock-analysis
bash ./scripts/install-all-claude-skills.sh
```

## 사용 예시

### Codex

```text
Use $us-stock-analysis to prepare a dated investment memo for NVDA with valuation, catalysts, risks, and chart context.
```

```text
Use $kr-stock-plan to scope 064400.KS into a clear Korean stock research brief with ticker, share class, horizon, output mode, and key questions.
```

```text
Use $kr-dart-analysis to extract a filing-grounded summary for LG CNS covering the latest quarterly or half-year revenue, operating profit, segment differences, customer concentration, and any standalone-quarter derivations needed from cumulative DART figures.
```

```text
Use $kr-dart-analysis to check a Korean company's disclosed order backlog, compare it with same-basis annual revenue, and report backlog coverage in Korean with clear source mapping and a note that the ratio is derived rather than a formally disclosed KPI.
```

```text
Use $kr-dart-analysis to list all disclosed single-sales or supply contracts for a Korean company over the last 12 months, keeping original notices, amendments, counterparties, amounts, sales ratios, contract periods, and latest status visible row by row.
```

```text
Use $kr-dart-analysis to list all disclosed single-sales or supply contracts for a Korean company and add a maturity table showing how much current effective contract amount ends by 2027, by 2028, and by each later year, clearly labeled as contract-period coverage rather than formal backlog unless the filing discloses backlog.
```

```text
Use $kr-stock-data-pack to gather a dated company fact pack for LG CNS with price context, filings, latest results, governance facts, valuation inputs, chart inputs, and outside-view inputs from sell-side or specialist media.
```

```text
Use $kr-stock-analysis to analyze 005930.KS with DART-based evidence, street or alternative views, valuation, governance checks, catalysts, chart context, and follow-up research questions.
```

```text
Use $kr-stock-update to update analysis-example/kr/엘앤에프/memo.md with company-specific disclosures, IR materials, and news after the memo date, and append a dated update block to the same file.
```

```text
Use $kr-portfolio-monitor to scan current Kiwoom-supported KRX holdings, compute SMA20 deviation and RSI14, and write the result to analysis-example/kr/portfolio-snapshot.md.
```

```text
Use $kr-sector-analysis to write a Korea security-operations market report with market definition, drivers, constraints, value chain, regulation, company map, and source-dated facts.
```

### Claude Code

```text
/us-stock-analysis prepare a dated investment memo for NVDA with valuation, catalysts, risks, and chart context.
```

```text
/kr-stock-plan scope 064400.KS into a clear Korean stock research brief with ticker, share class, horizon, output mode, and key questions.
```

```text
/kr-dart-analysis extract a filing-grounded summary for LG CNS covering the latest quarterly or half-year revenue, operating profit, segment differences, customer concentration, and any standalone-quarter derivations needed from cumulative DART figures.
```

```text
/kr-dart-analysis list all disclosed single-sales or supply contracts for a Korean company over the last 12 months, keeping original notices, amendments, counterparties, amounts, sales ratios, contract periods, and latest status visible row by row.
```

```text
/kr-dart-analysis list all disclosed single-sales or supply contracts for a Korean company and add a maturity table showing how much current effective contract amount ends by 2027, by 2028, and by each later year, clearly labeled as contract-period coverage rather than formal backlog unless the filing discloses backlog.
```

```text
/kr-stock-data-pack gather a dated company fact pack for LG CNS with price context, filings, latest results, governance facts, valuation inputs, chart inputs, and outside-view inputs from sell-side or specialist media.
```

```text
/kr-stock-analysis analyze 005930.KS with DART-based evidence, street or alternative views, valuation, governance checks, catalysts, chart context, and follow-up research questions.
```

```text
/kr-stock-update update analysis-example/kr/엘앤에프/memo.md with company-specific disclosures, IR materials, and news after the memo date, and append a dated update block to the same file.
```

```text
/kr-portfolio-monitor scan current Kiwoom-supported KRX holdings, compute SMA20 deviation and RSI14, and write the result to analysis-example/kr/portfolio-snapshot.md.
```

```text
/kr-sector-analysis write a Korea security-operations market report with market definition, drivers, constraints, value chain, regulation, company map, and source-dated facts.
```

## 분석 예시

- [KR - Portfolio Snapshot](analysis-example/kr/portfolio-snapshot.md)
- [KR - 엘앤에프](<analysis-example/kr/엘앤에프/memo.md>)
- [KR - LG CNS 리서치 브리프](<analysis-example/kr/LG CNS/리서치브리프.md>)
- [KR - LG CNS DART 분석](<analysis-example/kr/LG CNS/dart-analysis.md>)
- [KR - LG CNS 수주 통합 분석](<analysis-example/kr/LG CNS/수주통합분석.md>)
- [KR - LG CNS](<analysis-example/kr/LG CNS/memo.md>)
- [KR - 두산에너빌리티 DART 분석](<analysis-example/kr/두산에너빌리티/dart-analysis.md>)
- [KR - 두산에너빌리티 수주 통합 분석](<analysis-example/kr/두산에너빌리티/수주통합분석.md>)
- [KR - 한전KPS 수주계약 리스트](<analysis-example/kr/한전KPS/수주계약리스트.md>)
- [KR - 한미글로벌 수주계약 리스트](<analysis-example/kr/한미글로벌/수주계약리스트.md>)
- [KR - 대양전기공업](<analysis-example/kr/대양전기공업/memo.md>)
- [KR Sector - 국내 데이터센터](analysis-example/kr-sector/국내%20데이터센터.md)
- [KR Sector - 국내 데이터센터 리서치 브리프](analysis-example/kr-sector/국내%20데이터센터-리서치브리프.md)
- [KR Sector - 국내 IT SI 서비스](analysis-example/kr-sector/국내%20IT%20SI%20서비스.md)
- [KR Sector - 국내 IT SI 서비스 리서치 브리프](analysis-example/kr-sector/국내%20IT%20SI%20서비스-리서치브리프.md)

## 검증

Windows:

```powershell
.\scripts\validate-skills.ps1
```

Linux 또는 macOS:

```bash
bash ./scripts/validate-skills.sh
```
