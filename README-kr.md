# Stock, Portfolio, And Sector Analysis Skill

미국 주식, 한국 주식, KRX 포트폴리오, 한국 섹터 리서치용 AI 스킬 모음입니다. **Codex**와 **Claude Code**(Anthropic CLI)에서 사용할 수 있습니다.

언어별 문서:

- 영어: [README.md](README.md)
- 한국어: [README-kr.md](README-kr.md)

포함된 스킬:

한국 주식 워크플로 요약: `kr-stock-plan -> kr-stock-dart-analysis -> kr-stock-data-pack -> kr-stock-analysis`

`kr-stock-plan`은 진입점 오케스트레이터처럼 동작해야 합니다. 사용자가 `plan only`를 명시하지 않았다면, 먼저 짧게 필요한 것을 물어보고 브리프를 만든 다음 필요한 하위 skill까지 자동으로 이어서 실행합니다.

추천 핸드오프 프롬프트:

```text
Use $kr-stock-plan as the entry point for Korean stock work. Have it ask what the user actually needs first, scope the request, route through $kr-stock-dart-analysis when filing precision matters, then build the dated fact base with $kr-stock-data-pack, and finish with $kr-stock-analysis unless the user explicitly asks to stop after planning.
```

한국어 예시:

```text
먼저 $kr-stock-plan으로 사용자가 실제로 필요한 것을 짧게 확인한 뒤 종목, 기간, 출력 모드를 정리하고, 공시 정밀도가 중요하면 $kr-stock-dart-analysis를 거친 뒤, $kr-stock-data-pack으로 날짜가 보이는 팩트 베이스를 만들고, 마지막으로 $kr-stock-analysis로 최종 메모를 작성해줘. 사용자가 브리프만 원한다고 하지 않으면 중간에 멈추지 말고 이어서 실행해줘.
```

- `us-stock-analysis`: 미국 상장 주식과 미국 상장 ETF 분석
- `kr-stock-plan`: 한국 주식 리서치 범위를 실행용 브리프로 정리
- `kr-stock-dart-analysis`: 한국 DART 공시에서 분기, 반기, 사업부문, 고객집중 등 핵심 내용을 정밀 추출
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
- [skills/kr-stock-dart-analysis/SKILL.md](skills/kr-stock-dart-analysis/SKILL.md)
- [skills/kr-stock-dart-analysis/references/script-inputs.md](skills/kr-stock-dart-analysis/references/script-inputs.md)
- [skills/kr-stock-data-pack/SKILL.md](skills/kr-stock-data-pack/SKILL.md)
- [skills/kr-stock-analysis/SKILL.md](skills/kr-stock-analysis/SKILL.md)
- [skills/kr-stock-analysis/references/blended-source-notes.md](skills/kr-stock-analysis/references/blended-source-notes.md)
- [skills/kr-stock-update/SKILL.md](skills/kr-stock-update/SKILL.md)

현재 동작:

1. `kr-stock-plan`은 먼저 사용자가 무엇을 원하는지 짧게 확인한 뒤, 모호한 종목 요청을 정확한 종목, 주식 종류, 기간, 출력 모드, 핵심 질문, 추천 워크플로가 담긴 브리프로 정리하고, 브리프만 요청한 경우가 아니면 하위 skill까지 자동으로 이어서 실행합니다.
2. `kr-stock-dart-analysis`는 최신 DART 공시에서 매출, 영업이익, 사업부문, 고객집중, 수주, 계약공시, 증감 사유를 정확한 표와 섹션 단위로 정리하고, 범위가 모호하면 먼저 사용자가 공시에서 무엇을 보고 싶은지 짧게 확인합니다.
   긴 사업보고서나 감사보고서라면 이후 업데이트를 위해 `dart-reference.md`와 `dart-cache.json`도 함께 남겨 섹션별 커버리지와 재확인 필요 항목을 재사용합니다.
3. `kr-stock-data-pack`은 가격 기준일, 공시, 실적, 거버넌스, 밸류 입력값, 차트 입력값, 필요할 때는 증권사·전문매체·독립 분석의 외부 관점도 구조화해서 모으고, 어떤 블록이 필요한지 불명확하면 먼저 짧게 확인합니다.
4. `kr-stock-analysis`는 KRX 상장 주식 기준으로 `quick view`, `full memo`, `pre-earnings note`, `post-earnings note`, `pair compare`를 작성하고, 최종 산출물의 의사결정 프레임이나 강조 섹션이 불명확하면 먼저 짧게 확인합니다.
5. `kr-stock-update`는 기존 `기준일`을 보존하고 `최근 업데이트일`과 `## Update Log`만 증분 갱신합니다.
6. `kr-stock-analysis`의 차트 출력은 이제 기본적으로 분리형이며, `OHLC 캔들스틱 + 종가선 + MA5/20/60/120 + 거래량` 메인 PNG 1장과 `볼린저밴드 + 일목균형표 + RSI14` 오버레이 PNG 1장을 함께 생성합니다.

권장 파이프라인:

```text
kr-stock-plan
  -> 사용자 필요 확인 후 종목, 출력 모드, 핵심 질문 확정
  -> 공시 정밀도가 중요하면: kr-stock-dart-analysis
  -> kr-stock-data-pack
  -> kr-stock-analysis
```

라우팅 가이드:

- 티커, 주식 종류, 기간, 비교 범위, 산출물 형식이 아직 모호하면 `kr-stock-plan`부터 시작합니다. 사용자가 실제 분석 작업을 원한 경우에는 브리프 뒤에 자동으로 다음 skill까지 이어서 실행합니다.
- 결론이 DART 원문 문구, 누적공시의 분기 환산, 사업부문, 고객집중, 수주잔고, 계약공시에 크게 의존하면 `kr-stock-dart-analysis`를 중간에 넣습니다.
- `kr-stock-data-pack`은 가격, 거버넌스, 밸류, 차트, 외부 관점까지 날짜가 보이는 입력값을 모으는 단계입니다.
- 최종 quick view, memo, 이벤트 노트, pair compare 작성은 `kr-stock-analysis`가 맡습니다.

번들 도구:

- `scripts/fetch-kr-chart.js`: KRX 일봉 데이터 조회
- `scripts/chart-basics.js`: 주가/이평/거래량과 오버레이 지표를 분리한 PNG 차트 생성
- `scripts/chart-basics.js`: KR 메인 차트는 캔들스틱, 종가선, 현재가 가이드 라인을 기본으로 그리고, 한글 폰트를 찾을 수 있으면 범례와 패널명을 한글로 표시
- `scripts/chart-basics.js`: `--png-out`으로 지정한 파일은 메인 추세 차트로 저장하고, 같은 이름의 `-overlay.png` 파일을 보조지표 차트로 추가 생성
- `scripts/valuation-bands.js`: 3~5년 밸류에이션 밴드 요약
- `scripts/peer-valuation.js`: 피어 밸류에이션 표 생성
- `skills/kr-stock-dart-analysis/scripts/extract-dart-sections.js`: DART 원문 텍스트에서 섹션 인덱스 생성
- `skills/kr-stock-dart-analysis/scripts/verify-dart-coverage.js`: 목차 대비 파싱 커버리지 검증
- `skills/kr-stock-dart-analysis/scripts/build-dart-reference.js`: `dart-reference.md`와 `dart-cache.json` 생성
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
$us-stock-analysis로 NVDA에 대한 기준일 명시 투자 메모를 작성해줘. 밸류에이션, 촉매, 리스크, 차트 맥락을 포함해줘.
```

```text
$kr-stock-plan을 064400.KS 분석의 진입점으로 사용해줘. 먼저 내가 실제로 필요한 걸 짧게 물어보고, 티커, 주식 종류, 기간, 출력 모드, 핵심 질문을 확정한 다음, 내가 브리프만 원한다고 하지 않으면 한국 주식 하위 workflow까지 자동으로 이어서 실행해줘.
```

```text
$kr-stock-dart-analysis로 LG CNS 최신 분기 또는 반기 공시를 기준으로 매출, 영업이익, 사업부문 차이, 고객집중도, 그리고 누적 DART 수치에서 필요한 분기 단독 환산까지 포함한 공시 기반 요약을 추출해줘.
```

```text
$kr-stock-dart-analysis로 한국 기업의 공시상 수주잔고를 확인하고, 같은 기준의 연간 매출과 비교해서 백로그 커버리지를 한국어로 정리해줘. 소스 매핑을 분명히 하고, 이 비율이 공시된 KPI가 아니라 계산값이라는 점도 표시해줘.
```

```text
$kr-stock-dart-analysis로 최근 12개월 동안 한국 기업이 공시한 단일판매ㆍ공급계약을 모두 행별로 정리해줘. 최초 공시, 정정 여부, 상대방, 금액, 매출 비중, 계약 기간, 최신 상태가 보이게 해줘.
```

```text
$kr-stock-dart-analysis로 한국 기업의 단일판매ㆍ공급계약 공시를 모두 정리하고, 현재 유효 계약 금액 중 2027년까지, 2028년까지, 그리고 그 이후 연도별로 얼마나 종료되는지 만기 분포 표도 추가해줘. 공시에서 수주잔고를 따로 밝히지 않으면 정식 backlog가 아니라 계약 기간 기준 커버리지라는 점을 분명히 적어줘.
```

```text
$kr-stock-data-pack으로 LG CNS에 대한 날짜가 보이는 팩트팩을 모아줘. 가격 맥락, 공시, 최신 실적, 거버넌스 팩트, 밸류 입력값, 차트 입력값, 그리고 증권사나 전문매체의 외부 시각까지 포함해줘.
```

```text
$kr-stock-analysis로 005930.KS를 분석해줘. DART 기반 근거, 시장 또는 대안적 시각, 밸류에이션, 거버넌스 체크, 촉매, 차트 맥락, 후속 리서치 질문까지 포함해줘.
```

```text
$kr-stock-update로 `analysis-example/kr/엘앤에프/memo.md`를 업데이트해줘. 메모 기준일 이후 나온 회사 공시, IR 자료, 뉴스만 반영하고, 같은 파일에 날짜가 표시된 업데이트 블록을 추가해줘.
```

```text
$kr-portfolio-monitor로 현재 키움 지원 KRX 보유 종목을 점검하고, SMA20 이격도와 RSI14를 계산해서 결과를 `analysis-example/kr/portfolio-snapshot.md`에 작성해줘.
```

```text
$kr-sector-analysis로 국내 보안관제 시장 보고서를 작성해줘. 시장 정의, 성장 동인, 제약 요인, 밸류체인, 규제, 기업 지도, 기준일이 보이는 팩트를 포함해줘.
```

### Claude Code

```text
/us-stock-analysis prepare a dated investment memo for NVDA with valuation, catalysts, risks, and chart context.
```

```text
/kr-stock-plan 064400.KS를 진입점으로 사용해서 먼저 내가 필요한 걸 짧게 물어보고, 티커, 주식 종류, 기간, 출력 모드, 핵심 질문을 확정한 다음, 내가 브리프만 원한다고 하지 않으면 한국 주식 하위 workflow까지 자동으로 이어서 실행해줘.
```

```text
/kr-stock-dart-analysis extract a filing-grounded summary for LG CNS covering the latest quarterly or half-year revenue, operating profit, segment differences, customer concentration, and any standalone-quarter derivations needed from cumulative DART figures.
```

```text
/kr-stock-dart-analysis list all disclosed single-sales or supply contracts for a Korean company over the last 12 months, keeping original notices, amendments, counterparties, amounts, sales ratios, contract periods, and latest status visible row by row.
```

```text
/kr-stock-dart-analysis list all disclosed single-sales or supply contracts for a Korean company and add a maturity table showing how much current effective contract amount ends by 2027, by 2028, and by each later year, clearly labeled as contract-period coverage rather than formal backlog unless the filing discloses backlog.
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
- [KR - LG CNS DART reference](<analysis-example/kr/LG CNS/dart-reference.md>)
- [KR - 삼성전자 DART reference](<analysis-example/kr/삼성전자/dart-reference.md>)
- [KR - LG CNS 수주 통합 분석](<analysis-example/kr/LG CNS/수주통합분석.md>)
- [KR - LG CNS](<analysis-example/kr/LG CNS/memo.md>)
- [KR - 삼성SDS 리서치 브리프](<analysis-example/kr/삼성SDS/리서치브리프.md>)
- [KR - 삼성SDS DART 분석](<analysis-example/kr/삼성SDS/dart-analysis.md>)
- [KR - 삼성SDS Data Pack](<analysis-example/kr/삼성SDS/data-pack.md>)
- [KR - 삼성SDS](<analysis-example/kr/삼성SDS/memo.md>)
- [KR - LG전자 DART 분석](<analysis-example/kr/LG전자/dart-analysis.md>)
- [KR - 두산에너빌리티 DART 분석](<analysis-example/kr/두산에너빌리티/dart-analysis.md>)
- [KR - 두산에너빌리티 DART reference](<analysis-example/kr/두산에너빌리티/dart-reference.md>)
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
