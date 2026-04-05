# Workflow Reference

## Goal

This skill is for incremental follow-up, not for rebuilding the full initiation memo from scratch.

The core question is:

- what happened after the original memo date
- whether those events changed the thesis
- what to watch next

## Baseline Step

Before searching for new information:

1. Open the existing memo file.
2. Parse the `기준일`.
3. Parse `최근 업데이트일` if present.
4. Parse existing `Update Log` dates and source URLs.
5. Read the existing `Summary`, `Risks`, and `What Would Change My Mind` sections so you know what the original thesis was.
6. If `dart-reference.md` or `dart-cache.json` exists, also parse:
   - `reference 기준일`
   - `최근 확인일`
   - `마지막 반영 공시일`
   - missing, partial, and review-needed sections

Use `scripts/extract-report-baseline.js` when possible so the baseline metadata is explicit.

## Source Window

Default source window:

- start date: the memo's `기준일`
- end date: now

The update process should search the full window after `기준일`, then avoid duplicate write-back by checking whether the same event date or source URL already appears in the memo.

If a DART cache is available, use it to focus the filing recheck:

- prioritize sections that were previously `missing`, `partial`, or `needs_review`
- if a new annual or quarterly filing arrived after `lastFilingChecked`, rerun the section coverage check before treating old `not separately disclosed` judgments as still valid
- keep the memo update and the filing-reference refresh connected but conceptually separate

This is intentional:

- a strict `last update date` filter can miss material items that were not logged before
- a `memo date` filter plus deduplication is safer for memo maintenance

## Materiality Filter

Prioritize:

- earnings releases and result commentary
- formal guidance changes
- order wins, order cancellations, or large contracts
- capital raises, CB or BW issues, and dilution-related events
- treasury share buybacks, disposals, or cancellations
- dividend and shareholder return policy changes
- controlling shareholder or insider ownership changes
- governance or board structure changes
- plant disruptions, regulatory actions, or litigation that changes the operating outlook

Usually exclude:

- generic market recaps
- price-action-only articles
- duplicate media write-ups of the same filing
- weak rumor-based headlines

## Thesis Delta

For every material event, answer:

1. Is this new information or only a restatement of what the memo already knew?
2. Does it affect earnings power, cash conversion, capital allocation, governance, or timing?
3. Does it strengthen the base case, weaken it, or leave it unchanged?
4. Does it change the required monitoring list?

Do not label something as a thesis change unless it changes the investment case, downside, or monitoring framework in a concrete way.

## File Update Rules

When updating the memo file:

- keep the original title and memo body
- keep the original `기준일`
- add or refresh `최근 업데이트일`
- add `## Update Log` if missing
- add one block per date using `### YYYY-MM-DD Update`
- replace the same-date block if it already exists
- keep the latest block at the bottom in chronological order of write operations

If the new information materially changes the original conclusion, also refresh the opening `Summary` section manually before finalizing the file.

## Failure Modes To Avoid

- rewriting the whole memo when only an incremental update was requested
- including news published before the memo date
- duplicating the same source URLs across repeated updates on the same event
- turning every headline into a thesis change
- dropping the old thesis context and writing a disconnected news digest
