"use strict";

// Canonical foreign-IB name -> accepted aliases (Korean + English variants).
// Keep short ambiguous abbreviations (MS, GS, CS) out of this list to avoid
// matching unrelated acronyms. English aliases are matched with word
// boundaries; Korean aliases are substring matches.
const IB_WHITELIST = {
  "Morgan Stanley": ["모건스탠리", "모건 스탠리", "Morgan Stanley"],
  "Goldman Sachs": ["골드만삭스", "골드만 삭스", "골드만", "Goldman Sachs", "Goldman"],
  "JPMorgan": ["JP모건", "JP 모건", "제이피모건", "J.P. Morgan", "JPMorgan", "JP Morgan"],
  "Nomura": ["노무라", "Nomura"],
  "CLSA": ["CLSA"],
  "UBS": ["UBS"],
  "HSBC": ["HSBC"],
  "Macquarie": ["맥쿼리", "Macquarie"],
  "Citi": ["씨티그룹", "씨티", "Citigroup", "Citi"],
  "Bank of America": ["뱅크오브아메리카", "메릴린치", "Bank of America", "BofA"],
  "Daiwa": ["다이와", "Daiwa"],
  "Credit Suisse": ["크레디트스위스", "크레디트 스위스", "Credit Suisse"],
  "Jefferies": ["제프리스", "Jefferies"],
  "Bernstein": ["번스타인", "Bernstein"],
  "Mizuho": ["미즈호", "Mizuho"],
  "Barclays": ["바클레이스", "바클레이즈", "Barclays"],
  "Deutsche Bank": ["도이치뱅크", "도이치 뱅크", "Deutsche Bank"],
};

function buildAliasIndex() {
  const flat = [];
  for (const [canonical, aliases] of Object.entries(IB_WHITELIST)) {
    for (const alias of aliases) {
      flat.push({
        alias,
        canonical,
        isKorean: /[\uac00-\ud7af]/.test(alias),
      });
    }
  }
  flat.sort((a, b) => b.alias.length - a.alias.length);
  return flat;
}

const ALIAS_INDEX = buildAliasIndex();

const CANONICAL_BY_ALIAS = (() => {
  const out = {};
  for (const entry of ALIAS_INDEX) out[entry.alias] = entry.canonical;
  return out;
})();

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Return canonical IB names mentioned in `text`. Deduped, order of first match.
function findBrokersInText(text) {
  if (!text) return [];
  const found = [];
  const seen = new Set();
  for (const { alias, canonical, isKorean } of ALIAS_INDEX) {
    if (seen.has(canonical)) continue;
    let hit = false;
    if (isKorean) {
      hit = text.includes(alias);
    } else {
      const rx = new RegExp(
        `(^|[^A-Za-z0-9])${escapeRegex(alias)}(?![A-Za-z0-9])`
      );
      hit = rx.test(text);
    }
    if (hit) {
      found.push(canonical);
      seen.add(canonical);
    }
  }
  return found;
}

// Return the first matching alias string (longest-first) for a canonical IB.
// Caller uses this to anchor paragraph-scoped extraction around the broker.
function firstAliasIndex(text, canonical) {
  if (!text || !canonical) return { index: -1, alias: null };
  const aliases = (IB_WHITELIST[canonical] || [])
    .slice()
    .sort((a, b) => b.length - a.length);
  let best = { index: -1, alias: null };
  for (const alias of aliases) {
    const isKorean = /[\uac00-\ud7af]/.test(alias);
    let idx;
    if (isKorean) {
      idx = text.indexOf(alias);
    } else {
      const rx = new RegExp(
        `(^|[^A-Za-z0-9])(${escapeRegex(alias)})(?![A-Za-z0-9])`
      );
      const m = rx.exec(text);
      idx = m ? m.index + m[1].length : -1;
    }
    if (idx >= 0 && (best.index < 0 || idx < best.index)) {
      best = { index: idx, alias };
    }
  }
  return best;
}

module.exports = {
  IB_WHITELIST,
  CANONICAL_BY_ALIAS,
  findBrokersInText,
  firstAliasIndex,
};
