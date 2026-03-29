---
name: kr-sector-update
description: Update an existing Korea-focused sector memo using only material changes published after the memo date. Use when a prior `analysis-example/kr-sector/<sector>.md` already exists and the user wants an incremental sector update instead of a full rewrite.
---

# Korean Sector Update

Use this skill when the user already has a Korea sector memo and only wants what changed.

## Quick Start

- Start from an existing sector memo under `analysis-example/kr-sector/<sector>.md`.
- Preserve the original `기준일`.
- Refresh `최근 업데이트일` and append or replace a dated block under `## Update Log`.
- Search only for material changes after the memo date: policy updates, industry statistics, regulation changes, public-company disclosures, and value-chain developments.

## Workflow

1. Read the baseline memo.
   Capture the original thesis, source window, and any prior updates.
2. Gather only new information.
   Search for material developments after the memo date.
3. Filter for materiality.
   Keep only what changes the thesis, risks, or monitoring list.
4. Update incrementally.
   Preserve the body unless the new evidence clearly invalidates it.
5. Write the update block.
   Lead with what changed, what did not, and what to watch next.

Read [references/workflow.md](references/workflow.md) for update rules.
Read [references/output-format.md](references/output-format.md) for the dated update shape.

## Operating Rules

- Do not rebuild the entire report unless the new evidence clearly breaks it.
- Deduplicate against existing update dates and source URLs when possible.
- Prefer saying `no material sector-specific update` over forcing a narrative.
