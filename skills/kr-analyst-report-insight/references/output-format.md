# Output Format

The digest is a single Markdown file. The file path is user-chosen via
`--output`; the recommended location is
`analysis-example/kr/<company>/analyst-report-insight.md` for memo-adjacent
deliverables or `.tmp/analyst-report-cache/digest/<ticker>/<YYYY-MM-DD>.md`
for ad-hoc runs.

## Section order (fixed)

The seven sections must appear in this order. Omit a section's body (not
the heading) only when the rule below explicitly allows it.

1. **Header**
2. **Consensus Snapshot**
3. **Broker Coverage Table**
4. **Recent Reports**
5. **Divergences**
6. **TP Trajectory**
7. **Source Quality**

## 1. Header

```markdown
# Analyst Report Insight: <company> (<ticker>)

기준일: <YYYY-MM-DD>   (= fetched date from input JSON)
Lookback: <n> days    (derived from the oldest vs newest publishedDate in the input)
Sources: <hankyung, naver>  (unique `sourceSite` values encountered)
Report count: <n>
```

`기준일` is the `fetchedAt` field from the input JSON, NOT today's
wall-clock date. This keeps the digest reproducible.

## 2. Consensus Snapshot

```markdown
## Consensus Snapshot

- Target price (KRW): median ₩<m>, mean ₩<μ>, range ₩<min> – ₩<max>  (<n> reports with TP)
- Rating: BUY <a> / HOLD <b> / SELL <c> / N/A <d>
- Latest report: <YYYY-MM-DD> by <broker> (<analyst-or-"unknown">)
- Coverage brokers: <k> unique
```

If fewer than 2 reports have a non-null TP, replace the TP line with:
`- Target price: insufficient data (<n> report(s) with TP)`.

## 3. Broker Coverage Table

Latest row per broker only. Sorted by `publishedDate` desc, broker asc.

```markdown
## Broker Coverage

| Broker | Analyst | Date | Rating | Target | TP Δ | 1-liner |
|---|---|---|---|---|---|---|
| 한국투자증권 | 홍길동 | 2026-04-10 | BUY | ₩250,000 | +8.7% | 실적 컨센 상회, 목표가 상향 |
| ... |
```

Formatting:
- `TP Δ` is percentage vs this broker's immediately-prior TP in the
  window. Prefix with `+` or `−`. If no prior, render `—`.
- `1-liner` is the top-scored line from the PDF text (see Recent Reports
  scoring) with a small bonus for lines ending in `다.` / `음.` / `함.`
  / `됨.` / `.` / `!` and a penalty for lines ending mid-clause (open
  paren, trailing comma) so the cell is more likely a complete sentence.
  Fall back to the report title if extraction produced no text.
- Missing cells render as `—`, never empty.

## 4. Recent Reports

Top `--max-reports` (default 10) by `publishedDate` desc. No dedupe.

```markdown
## Recent Reports

### <title> — <broker> / <analyst-or-"분석가 미상">  (<YYYY-MM-DD>)

Rating: <BUY|HOLD|SELL|N/A>   Target: ₩<TP-or-"—">

- <verbatim bullet 1>
- <verbatim bullet 2>
- ...

📎 <landingUrl>
```

Rules:
- 5–8 bullets per report, scored as described in `workflow.md`.
- Bullets are **verbatim** from the extracted `.txt`. Truncate to 220
  chars with a trailing `…` when cut. Do not rewrite.
- Cap total bullet characters per report at `--snippet-chars` (default
  1500), dropping lowest-scored trailing bullets first.
- Lines that are mostly numbers / whitespace / punctuation (digit +
  whitespace ratio > 0.6, e.g. bare table rows like `매출액 365 520 …`)
  are penalized in scoring so narrative lines win.
- If the report has `extractionOk: false`, replace the bullet list with
  a single italic line: `*PDF text unavailable — see landing page.*`.

## 5. Divergences

```markdown
## Divergences

- **<broker>**: TP ₩<x> is <+n.n%|−n.n%> vs consensus median (₩<m>).
- **<broker>**: Rating <SELL> vs modal <BUY>.
```

Rules:
- Only brokers whose **latest** in-window row differs.
- TP divergence threshold: `|Δ / median| > 0.15`.
- If there are zero divergences, render `No material divergences against consensus median / modal rating.` as a single bullet (or a plain paragraph, but keep the `##` heading).

## 6. TP Trajectory

Render only if ≥ 6 reports have both a `publishedDate` and a non-null
`targetPrice`. Otherwise keep the `##` heading with the body
`Insufficient dated TPs for a trajectory (<n> qualifying reports; need ≥ 6).`

```markdown
## TP Trajectory

| Month | Consensus TP (median) |
|---|---|
| 2025-06 | ₩210,000 |
| 2025-09 | ₩225,000 |
| 2026-01 | ₩240,000 |
| 2026-04 | ₩250,000 |

Sparkline: ▁▃▆█   (₩210,000 … ₩250,000)
```

Sparkline rule:
- Characters: `▁▂▃▄▅▆▇█` (8 levels).
- Map each monthly median linearly from `min` → `▁`, `max` → `█`.
- When all values are equal, render all characters as `▄` and show
  `(flat at ₩<value>)` after the sparkline instead of the range.
- Months are sorted ascending. Empty months are skipped (do not insert
  placeholders).

## 7. Source Quality

```markdown
## Source Quality

- Extracted OK: <n>/<total>
- Skipped (login-gated): <n>
- Skipped (no PDF URL): <n>
- Extraction failed: <n>
- Warnings:
  - <reportId>: <message>
  - ...
```

If `meta.warnings` is empty, render `- Warnings: none`.

## Empty-input behavior

If the input JSON has `reports: []`:

```markdown
# Analyst Report Insight: <company> (<ticker>)

기준일: <YYYY-MM-DD>

No analyst reports in window.
```

No other sections. This matches the `kr-naver-insight` empty-input
convention.
