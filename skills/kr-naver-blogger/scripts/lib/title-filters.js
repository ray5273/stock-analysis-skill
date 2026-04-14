// title-filters.js — shared title classification helpers for
// kr-naver-blogger. Pure functions, no I/O, no deps.
//
// Two filters:
//   - isTradingTitle(title): generic TA / day-trading flavor vocabulary
//   - isListicleTitle(title, company): multi-stock roundup where the target
//     company is one of many tagged names
//
// Used by:
//   - discover-bloggers.js to classify per-blogger titleMatches
//   - build-query-set.js to drop listicle news headlines before tokenizing

const TRADING_TERMS = [
  "차트분석", "차트", "캔들", "이평", "볼린저", "RSI", "MACD",
  "매매", "매수", "매도", "손절", "익절", "지지선", "저항선",
  "단타", "스윙", "급등주", "급락주", "관심주", "주목주", "추천주",
  "시황", "오늘의", "내일의", "금일", "상한가", "하한가",
];

// Sector / theme tags that commonly show up in listicle headlines.
// These are the names of themes, not individual companies. A title with 3+
// of these (none being the target company) is almost certainly a roundup.
const SECTOR_TAGS = [
  "반도체", "2차전지", "이차전지", "바이오", "광통신", "원전", "SMR",
  "조선", "방산", "AI", "인공지능", "HBM", "전기차", "수소", "로봇",
  "우주", "엔터", "미디어", "게임", "건설", "은행", "증권", "보험",
  "화장품", "면세점", "철강", "해운", "항공", "제약", "식품",
  "리튬", "니켈", "양극재", "음극재", "태양광", "풍력",
];

const LISTICLE_SEPARATOR_RX = /[,/·|、]/g;

function lower(s) {
  return (s || "").toLowerCase();
}

function isTradingTitle(title) {
  if (!title) return false;
  const t = lower(title);
  for (const term of TRADING_TERMS) {
    if (t.includes(lower(term))) return true;
  }
  return false;
}

// mode: "blog" (default, strict — for blog post titles) or "news" (relaxed —
// for news headlines, which naturally mention multiple sectors even when
// the article is about a single company). Blog-mode uses all three signals;
// news-mode only triggers on explicit listicle patterns (many separators +
// many OTHER company-name mentions).
function isListicleTitle(title, company, opts = {}) {
  if (!title) return false;
  const mode = opts.mode || "blog";
  const t = title;

  // Signal 1: 4+ listicle separators (strong signal in any mode)
  const seps = (t.match(LISTICLE_SEPARATOR_RX) || []).length;
  if (seps >= 4) return true;

  if (mode === "blog") {
    // Blog titles: 3+ separators is already suspicious
    if (seps >= 3) return true;

    // 3+ distinct sector tags, none being the target company itself
    const hits = new Set();
    for (const tag of SECTOR_TAGS) {
      if (company && tag === company) continue;
      if (t.includes(tag)) hits.add(tag);
      if (hits.size >= 3) return true;
    }

    // Long title where the target company appears deep in the list
    if (company && t.length > 40) {
      const idx = t.indexOf(company);
      if (idx > 25) return true;
    }
  }

  return false;
}

module.exports = {
  TRADING_TERMS,
  SECTOR_TAGS,
  isTradingTitle,
  isListicleTitle,
};
