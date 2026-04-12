# TODOS

## Korean Stock Orchestrator

### Auto-suggest comparison candidates when thesis is ambiguous

**What:** Add a rule that lets the KR orchestrator suggest up to two comparison names when single-name analysis alone is not enough.

**Why:** Some investment decisions stay fuzzy until the user sees the company against the most relevant alternative, even when the user did not explicitly ask for a compare.

**Context:** The first KR orchestrator version keeps comparison opt-in by default. A later iteration should add a narrow trigger for "comparison recommended" without turning the workflow into a wide screener. The trigger should stay conservative, cap the peer count at two, and only fire when the memo still has unresolved decision-changing ambiguity after the single-name pass.

**Effort:** M
**Priority:** P2
**Depends on:** KR orchestrator v1 with memo-canonical follow-up flow

---

## Naver Blog Pipeline

### Quality gate: enforce blog citation for Naver-pass memos

**What:** When the quality gate runs on a memo whose brief had `Naver blog pass: yes`, check that at least one Naver blog post URL appears in the memo body.

**Why:** Without enforcement, the planner can route a Naver pass that produces artifacts but the memo writer silently ignores them. The gate should catch this.

**Context:** Deferred until real end-to-end runs confirm the pipeline works reliably. Premature enforcement risks false negatives on memos where Naver posts were reviewed but legitimately excluded.

**Effort:** S
**Priority:** P1
**Depends on:** Naver orchestration integration landed

### Validate naver-insights.md row format before data-pack ingestion

**What:** Add a lightweight format check in the data-pack ingestion path to verify that naver-insights.md entries have the expected structure (date, snippet, URL) before adding rows to the External Views table.

**Why:** If the summarize-insights script produces malformed output, the data-pack silently ingests garbage rows. A format check catches this early.

**Effort:** S
**Priority:** P2
**Depends on:** Naver orchestration integration landed

### Automated test for --with-blog harness composition

**What:** Add a dry-run test case that verifies `--mode all --with-blog` composes chart + blog + gate in the correct order and skips blog gracefully when `--ticker` is missing.

**Why:** The harness has no formal test infra yet. When it gets one, this composition path should be covered.

**Effort:** S
**Priority:** P2
**Depends on:** Harness test infrastructure
