# Stock Analysis Skill

GitHub-friendly Codex skill repository for equity analysis workflows.

This repository contains two self-contained skills:

- `us-stock-analysis` for U.S. stocks and U.S.-listed ETFs
- `kr-stock-analysis` for KRX-listed stocks and Korean ETFs

Each skill is designed to be copied into `~/.codex/skills/<skill-name>` and then used directly by Codex.

## Repository Layout

```text
stock-analysis-skill/
|- skills/
|  |- us-stock-analysis/
|  `- kr-stock-analysis/
|- scripts/
|  |- install-skill.ps1
|  |- install-all-skills.ps1
|  `- validate-skills.ps1
`- examples/
```

## Install

Install one skill:

```powershell
.\scripts\install-skill.ps1 us-stock-analysis
```

Install all skills:

```powershell
.\scripts\install-all-skills.ps1
```

The scripts copy each skill folder into `C:\Users\<you>\.codex\skills\`.

## Skill List

| Skill | Purpose |
| --- | --- |
| `us-stock-analysis` | Dated, source-backed analysis for U.S. public companies and ETFs, including growth, value, ETF, peer valuation, and chart basics workflows |
| `kr-stock-analysis` | Dated, source-backed analysis for Korean public companies and Korean ETFs, including KRX-specific valuation, DART-centric workflow, governance, holding-company discounts, and chart basics workflows |

## Example Invocations

```text
Use $us-stock-analysis to prepare a dated investment memo for NVDA with valuation, catalysts, risks, and chart context.
```

```text
Use $kr-stock-analysis to analyze 005930.KS with DART-based evidence, valuation, governance checks, and catalysts.
```

## Validation

Run:

```powershell
.\scripts\validate-skills.ps1
```

The validator checks:

- required skill files exist
- frontmatter is present
- `openai.yaml` exists
- Node scripts pass `node --check`

## Notes

- Skills are kept self-contained so they can be copied independently.
- `examples/` contains sample JSON inputs for the bundled scripts.
- The repository does not assume Python; bundled automation scripts use PowerShell and Node.js.
