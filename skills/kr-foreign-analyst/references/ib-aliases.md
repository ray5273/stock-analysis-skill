# IB Whitelist — Accepted Aliases

Canonical names and their accepted Korean + English variants. Source of
truth: `scripts/lib/ib-whitelist.js`. Matching rules:

- **Korean aliases**: substring match (`text.includes(alias)`).
- **English aliases**: word-boundary regex (`\balias\b`, case-insensitive).
- **Longest-first ordering** so `모건 스탠리` beats `모건` when both match.
- Deduplicated by canonical name — an article mentioning both
  `모건스탠리` and `Morgan Stanley` produces a single record.

| Canonical | Korean aliases | English aliases |
| --- | --- | --- |
| Morgan Stanley | 모건스탠리, 모건 스탠리 | Morgan Stanley |
| Goldman Sachs | 골드만삭스, 골드만 삭스, 골드만 | Goldman Sachs, Goldman |
| JPMorgan | JP모건, JP 모건, 제이피모건 | J.P. Morgan, JPMorgan, JP Morgan |
| Nomura | 노무라 | Nomura |
| CLSA | — | CLSA |
| UBS | — | UBS |
| HSBC | — | HSBC |
| Macquarie | 맥쿼리 | Macquarie |
| Citi | 씨티그룹, 씨티 | Citigroup, Citi |
| Bank of America | 뱅크오브아메리카, 메릴린치 | Bank of America, BofA |
| Daiwa | 다이와 | Daiwa |
| Credit Suisse | 크레디트스위스, 크레디트 스위스 | Credit Suisse |
| Jefferies | 제프리스 | Jefferies |
| Bernstein | 번스타인 | Bernstein |
| Mizuho | 미즈호 | Mizuho |
| Barclays | 바클레이스, 바클레이즈 | Barclays |
| Deutsche Bank | 도이치뱅크, 도이치 뱅크 | Deutsche Bank |

## Deliberately excluded

Short English abbreviations like `MS`, `GS`, `CS`, `JPM`, `DB` are **not**
in the whitelist because they collide too easily with unrelated tokens
(Microsoft, Chrome Store, database, etc.). Korean news rarely uses them in
isolation anyway — always prefixed with the full name or company context.

## Adding a new broker

1. Add a `"<Canonical Name>": [alias, alias, ...]` entry to
   `scripts/lib/ib-whitelist.js`.
2. Append a row to the table above.
3. Run `node skills/kr-naver-browse/scripts/browse-naver.js --test`.
4. For Korean aliases, prefer the longest common phrasing (`모건스탠리`
   before `모건`). Never add a bare 2-char Korean token that would
   substring-match unrelated words.
