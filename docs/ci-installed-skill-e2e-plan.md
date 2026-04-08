# CI Installed Skill and Harness E2E Plan

## Summary

This document captures the deferred plan for improving `scripts/harness.js` and extending CI so the repository tests installed skills more realistically.

Current state:

- `scripts/harness.js` orchestrates chart generation, DART processing, and memo quality gating from repo-local paths.
- `.github/workflows/validate.yml` already validates files and installs skills into `CODEX_HOME` and `CLAUDE_HOME`.
- CI does not yet run meaningful post-install execution tests from the installed skill directories.
- `scripts/validate-skills.sh` currently has at least one brittle text-match check that fails even when the expected section exists.

Target state:

- Keep fast static validation across all current OS jobs.
- Add installed-skill execution coverage on Ubuntu.
- Make harness path resolution flexible enough to run against installed skills, not only repo-local `skills/...` paths.
- Defer full live-model E2E until a dedicated Codex runner, auth model, and invariant-based evaluation flow are ready.

## Planned Changes

### 1. Harden validator checks

- Replace brittle shell text checks in `scripts/validate-skills.sh` with CRLF-safe checks.
- Prefer either:
  - Node-based content assertions, or
  - shell checks that normalize carriage returns before matching.
- Keep the validator focused on structural invariants instead of exact formatting quirks.

### 2. Make harness install-aware

- Extend `scripts/harness.js` with configurable path roots so it can execute against:
  - repo-local skills, and
  - installed skills under `CODEX_HOME/skills`.
- Add explicit CLI options for at least:
  - `--skills-root`
  - `--examples-root`
  - `--assets-dir`
- Preserve current behavior as the default when these flags are omitted.

### 3. Add installed-skill execution coverage in CI

- Keep the existing matrix for static validation and install verification.
- Add Ubuntu-only installed-skill execution steps after installation.
- Run installed scripts against known fixtures and existing example assets.
- Prefer a thin helper script if the workflow becomes noisy, for example:
  - `scripts/test-installed-skills.sh`

### 4. Split fixture-based coverage from live-network coverage

- Use fixture-driven checks for deterministic coverage:
  - chart rendering from sample JSON
  - DART normalize/extract/verify/build-reference pipeline from sample export JSON
  - memo quality gate against an existing example memo
- Keep live Yahoo Finance fetch as a separate integration step if retained.
- Treat network-backed checks as higher-risk and isolate failures clearly.

### 5. Defer AI-driven live E2E

- A true Codex-driven E2E path requires:
  - a non-interactive Codex runner in CI
  - model authentication in GitHub Actions secrets
  - stable prompts and fixture inputs
  - invariant-based output checks instead of exact output matching
- This should be a separate follow-up, likely as:
  - manual dispatch, or
  - nightly job

## Proposed CI Shape

### Existing cross-platform job

- Continue:
  - static validation
  - install-all for Codex skills
  - install-all for Claude skills
  - basic installed-directory existence checks

### Added Ubuntu execution coverage

- After `install-all-skills.sh`, run:
  - installed `kr-stock-analysis/scripts/chart-basics.js` with `examples/kr-stock-analysis/chart-sample.json`
  - installed `kr-stock-dart-analysis` pipeline with `examples/kr-stock-dart-analysis/dart-browser-export-sample.json`
  - `scripts/harness.js --mode gate` against `analysis-example/kr/LG CNS/memo.md`
- Optionally add one separate live-network chart fetch step.

## Acceptance Criteria

- `validate-skills.sh` passes reliably on Linux and is not sensitive to CRLF formatting.
- `scripts/harness.js` can target installed skill directories without breaking current repo-local usage.
- GitHub Actions validates installed-skill execution on Ubuntu after installation.
- Failures clearly identify whether the breakage is:
  - static validation
  - installation
  - fixture execution
  - network integration

## Non-Goals

- No live-model Codex E2E in this change.
- No broad redesign of skill packaging.
- No change to current example memo content unless required by validator or harness behavior.

## Assumptions

- Ubuntu-only execution coverage is the right first step for installed-skill runtime checks.
- Live-model E2E is valuable, but should be introduced separately once CI-side Codex execution is operational and secret-backed.
- Existing untracked research/example files in the worktree are unrelated and should remain untouched by this plan-only PR.
