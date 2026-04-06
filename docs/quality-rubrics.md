# Quality Rubrics

This repository treats skills as production workflows, not prompt snippets. A skill change is only considered complete when the matching examples, agent prompts, and validation checks all still agree on the same output contract.

## Evaluation Axes

Each audited artifact is judged on five axes.

### 1. Freshness

- `Pass`: `기준일` or equivalent as-of date is explicit, and mixed-cadence metrics keep their own dates.
- `Weak pass`: top-level date exists but some metric blocks flatten different refresh cycles together.
- `Fail`: dated analysis is presented without a usable as-of date.

### 2. Sourcing

- `Pass`: material facts point to a primary or clearly labeled secondary source, and missing disclosures are stated honestly.
- `Weak pass`: source list exists but some critical claims are not obviously traceable.
- `Fail`: unsupported claims, unlabeled secondary-source numbers, or invented detail.

### 3. Reasoning Hygiene

- `Pass`: facts and inference are separated, outside views are labeled, and unverified claims are framed as such.
- `Weak pass`: interpretation is mostly separated but some conclusions overrun the evidence.
- `Fail`: the artifact presents inference as disclosed fact.

### 4. Output Contract

- `Pass`: required headings, file paths, update-log behavior, and linked assets follow the skill contract.
- `Weak pass`: most of the shape is present but there is small drift in section order or metadata.
- `Fail`: path, section, or update behavior contradicts the skill contract.

### 5. Decision Utility

- `Pass`: the artifact makes a clear judgment, shows what matters next, and converts unresolved gaps into concrete follow-up work when required.
- `Weak pass`: the information is useful but the judgment or next-step framing is soft.
- `Fail`: the artifact is descriptive but not decision-ready.

## Golden Artifact Policy

- Golden artifacts are the small set of example documents used for regression checks.
- README files should link only to audited golden artifacts and reusable fixtures.
- Legacy examples may remain in the repo, but they are not linked as canonical unless they pass the current rubric.

## Current Golden Set

- `analysis-example/kr/LG CNS/memo.md`
- `analysis-example/kr/대양전기공업/memo.md`
- `analysis-example/kr-sector/국내 데이터센터.md`
- `analysis-example/kr-sector/국내 데이터센터-리서치브리프.md`

## Audit Focus

Validation should prioritize the following failure modes before cosmetic issues:

- stale or undated analysis
- missing or contradictory output paths
- broken README links
- update artifacts that rewrite instead of append
- chart links without matching assets
- memo examples drifting away from the active skill contract
