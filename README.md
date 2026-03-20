# Stock Analysis Skill

Codex skills for U.S. and Korean stock analysis.

Included skills:

- `us-stock-analysis` for U.S. stocks and U.S.-listed ETFs
- `kr-stock-analysis` for KRX-listed stocks and Korean ETFs

Install target: `$CODEX_HOME/skills/<skill-name>`  
Default if `CODEX_HOME` is unset: `~/.codex`

## Install

Windows:

```powershell
.\scripts\install-skill.ps1 us-stock-analysis
.\scripts\install-all-skills.ps1
```

Linux or macOS:

```bash
bash ./scripts/install-skill.sh us-stock-analysis
bash ./scripts/install-all-skills.sh
```

Custom target example:

```bash
CODEX_HOME=/tmp/codex-home bash ./scripts/install-all-skills.sh
```

## Usage

```text
Use $us-stock-analysis to prepare a dated investment memo for NVDA with valuation, catalysts, risks, and chart context.
```

```text
Use $kr-stock-analysis to analyze 005930.KS with DART-based evidence, valuation, governance checks, and catalysts.
```

## Analysis Examples

- [KR - 엘앤에프](analysis-example/kr/엘앤에프.md)

## Validation

Windows:

```powershell
.\scripts\validate-skills.ps1
```

Linux or macOS:

```bash
bash ./scripts/validate-skills.sh
```
