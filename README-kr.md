# Stock Analysis Skill

미국 주식과 한국 주식 분석용 AI 스킬 모음입니다. **Codex**와 **Claude Code**(Anthropic CLI) 둘 다 사용할 수 있습니다.

언어별 문서:

- 영어: [README.md](README.md)
- 한국어: [README-kr.md](README-kr.md)

포함된 스킬:

- `us-stock-analysis`: 미국 상장 주식과 미국 상장 ETF 분석
- `kr-stock-analysis`: KRX 상장 주식과 한국 ETF 분석

## 스킬 동작 방식

두 스킬 모두 오래된 기억에 의존하지 않고, 최신 근거를 확인한 뒤 분석하는 흐름으로 설계되어 있습니다.

공통 동작:

- Codex에서는 `$us-stock-analysis`, `$kr-stock-analysis`로 호출하고, Claude Code에서는 `/us-stock-analysis`, `/kr-stock-analysis`로 호출합니다.
- 가격, 밸류에이션, 공시, 가이던스, 뉴스는 시점 민감 정보로 취급하므로, 분석 전에 최신 소스를 다시 확인합니다.
- 워크스페이스가 쓰기 가능하면 답변만 끝내지 않고 `analysis-example/<market>/<company>.md` 경로에 마크다운 리포트를 생성하거나 갱신하는 것이 기본 동작입니다.
- 최종 답변과 리포트 파일은 같은 기준일자를 공유하도록 맞추며, 문서 안에 명시적인 `as of` 날짜를 남깁니다.

### `us-stock-analysis`

주요 지침 문서:

- [skills/us-stock-analysis/SKILL.md](skills/us-stock-analysis/SKILL.md)
- [skills/us-stock-analysis/references/workflow.md](skills/us-stock-analysis/references/workflow.md)
- [skills/us-stock-analysis/references/output-format.md](skills/us-stock-analysis/references/output-format.md)

현재 동작 흐름:

1. 먼저 종목, 거래소, 분석 기간, 비교 대상, 요청 형태(풀 메모, 비교, 실적 전 메모, 실적 후 메모)를 정합니다.
2. SEC 공시와 IR 자료를 우선으로 최신 수치를 확인하고, 필요한 경우 회사 뉴스와 시세 데이터를 보강합니다.
3. 사업 구조, 재무 품질, 자본 배분, 촉매, 리스크를 바탕으로 투자 논리를 정리합니다.
4. 업종과 비즈니스 모델에 맞는 밸류에이션 방법을 선택합니다. 모든 종목에 같은 방식의 평가를 강제로 적용하지 않습니다.
5. 기본 메모 형식이 맞는 요청이면 요약, 사업과 투자 포인트, 최신 실적, 밸류에이션, 촉매, 리스크, 관점 변경 조건 순서로 결과를 작성합니다.

번들 스크립트:

- `scripts/peer-valuation.js`: 피어 밸류에이션 표 생성
- `scripts/etf-overlap.js`: ETF 겹침 비중과 공통 종목 분석
- `scripts/chart-basics.js`: 사용자가 제공한 OHLCV 데이터 기반 기본 차트 해석

### `kr-stock-analysis`

주요 지침 문서:

- [skills/kr-stock-analysis/SKILL.md](skills/kr-stock-analysis/SKILL.md)
- [skills/kr-stock-analysis/references/workflow.md](skills/kr-stock-analysis/references/workflow.md)
- [skills/kr-stock-analysis/references/output-format.md](skills/kr-stock-analysis/references/output-format.md)

현재 동작 흐름:

1. 종목코드, 시장, 주식 종류, 분석 기간, 요청 형태(메모, 비교, 이벤트 드리븐 분석)를 먼저 확정합니다.
2. DART 공시, KRX 공시, 회사 IR 자료, ETF 운용사 문서 같은 한국 1차 소스를 우선으로 최신 정보를 확인하고, 필요 시 최근 뉴스를 보완합니다.
3. 투자 논리를 만들 때 매출 믹스 공개 범위, 수출 민감도, 자사주, 지배구조, 지분 구조, 주주환원 정책처럼 한국 시장에서 중요한 항목을 함께 점검합니다.
4. 현재 밸류에이션 스냅샷을 만들고, 데이터가 충분하면 과거 3~5년 밸류에이션 밴드도 추가합니다.
5. 가격 이력이 충분하면 차트 맥락도 붙이며, 메모 파일을 쓸 때는 `analysis-example/kr/assets/` 아래 PNG 차트 자산까지 함께 관리합니다.
6. 기본 메모 형식은 요약, 사업과 투자 포인트, 매출 믹스, 최신 실적, 현재 밸류에이션, 밸류에이션 밴드, 차트와 수급 맥락, 지배구조와 구조 이슈, 촉매, 리스크, 관점 변경 조건 순서입니다.

번들 스크립트:

- `scripts/fetch-kr-chart.js`: KRX 일봉 데이터 조회
- `scripts/chart-basics.js`: 기술적 해석과 라벨 포함 PNG 차트 생성
- `scripts/valuation-bands.js`: 3~5년 밸류에이션 밴드 요약
- `scripts/peer-valuation.js`: 피어 밸류에이션 표 생성
- `scripts/etf-overlap.js`: ETF 겹침 비중과 공통 종목 분석

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

사용자 지정 경로:

```bash
CODEX_HOME=/tmp/codex-home bash ./scripts/install-all-skills.sh
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

사용자 지정 경로:

```bash
CLAUDE_HOME=/tmp/claude-home bash ./scripts/install-all-claude-skills.sh
```

## 사용 예시

### Codex

```text
Use $us-stock-analysis to prepare a dated investment memo for NVDA with valuation, catalysts, risks, and chart context.
```

```text
Use $kr-stock-analysis to analyze 005930.KS with DART-based evidence, valuation, governance checks, and catalysts.
```

### Claude Code

```text
/us-stock-analysis prepare a dated investment memo for NVDA with valuation, catalysts, risks, and chart context.
```

```text
/kr-stock-analysis analyze 005930.KS with DART-based evidence, valuation, governance checks, and catalysts.
```

## 분석 예시

- [KR - 엘앤에프](analysis-example/kr/엘앤에프.md)
- [KR - LG CNS](<analysis-example/kr/LG CNS.md>)

## 검증

Windows:

```powershell
.\scripts\validate-skills.ps1
```

Linux 또는 macOS:

```bash
bash ./scripts/validate-skills.sh
```
