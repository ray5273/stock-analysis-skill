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

### Freshness-weighted blogger ranking

**What:** Extract post dates from `PostSearchList.naver` snippets and apply a freshness decay to `relevantPostCount` during ranking (within 30d → 1.0, 30–90d → 0.7, 90–180d → 0.4, >180d → 0.1).

**Why:** Current B1 ranking treats a blogger who posted 10 times two years ago the same as one posting 6 times this month. For memos driven by current sentiment, freshness should dominate.

**Context:** Deferred from the B1-first plan after in-blog search replaced the PostList heuristic. Only worth doing once we see real ranking errors caused by stale coverage.

**Effort:** M
**Priority:** P2
**Depends on:** Reliable date extraction from PostSearchList snippets

### Dead-blog filter for blogger discovery

**What:** Drop candidates whose most recent post is older than 180 days before the per-blog search loop runs.

**Why:** Cheap gate, no extra fetches. Keeps the candidate pool focused on active coverers.

**Effort:** S
**Priority:** P2
**Depends on:** Freshness-weighted ranking (shares the date extraction)

### Blog profile metadata scrape

**What:** Visit `https://blog.naver.com/<blogId>` for each qualified blogger and extract display name, blog title, subscriber count, and category list. Populate the currently-null fields in the output JSON.

**Why:** Reporting improvement, not a ranking fix. Reviewers currently see bare blog IDs with no context about who the blogger is or how big their audience is.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Automated test for --with-blog harness composition

**What:** Add a dry-run test case that verifies `--mode all --with-blog` composes chart + blog + gate in the correct order and skips blog gracefully when `--ticker` is missing.

**Why:** The harness has no formal test infra yet. When it gets one, this composition path should be covered.

**Effort:** S
**Priority:** P2
**Depends on:** Harness test infrastructure
