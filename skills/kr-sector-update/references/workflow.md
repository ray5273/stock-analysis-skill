# Workflow Reference

## Goal

This skill is for incremental maintenance of an existing sector memo.

The core questions are:

- what changed after the original memo date
- whether those changes alter the sector view
- what to watch next

## Baseline Step

Before searching for new information:

1. Read the existing memo file.
2. Parse the `기준일`.
3. Parse `최근 업데이트일` if present.
4. Read the opening conclusion, risks, and final outlook section.
5. Read the existing `Update Log` so you do not duplicate prior work.

## Materiality Filter

Prioritize:

- new support programs or funding changes
- regulation changes or formal consultations
- refreshed public statistics
- major listed-company disclosures that change the sector read-through
- power, permitting, environmental, or infrastructure constraints that materially changed

Usually exclude:

- generic macro recaps
- duplicate media summaries of the same announcement
- price-action-only commentary

## File Update Rules

- keep the original `기준일`
- refresh `최근 업데이트일`
- add `## Update Log` if missing
- add one block per date using `### YYYY-MM-DD Update`
- replace the same-date block if it already exists

## Failure Modes To Avoid

- rewriting the whole report when only an update was requested
- including items published before the memo date
- turning small headlines into thesis changes
