// nickname-extract.js — pure helpers for extracting blogger-nickname candidates
// from Naver related-query suggestions and for detecting blogroll/roundup
// post titles that list multiple nicknames.
//
// No I/O, no deps. Consumed by discover-bloggers.js.

// Tails that Naver autocompletes around a company name but which describe
// "what people search about the company", not "who writes about it".
// Nicknames that accidentally overlap with these words are a tradeoff we
// accept — dropping real tickers is worse than missing a rare nickname.
const NICKNAME_BLOCKLIST = new Set([
  "주가",
  "주가전망",
  "전망",
  "목표주가",
  "배당",
  "배당금",
  "실적",
  "실적발표",
  "실적발표일",
  "공시",
  "뉴스",
  "차트",
  "주식",
  "주식전망",
  "전자공시",
  "관련주",
  "테마",
  "채용",
  "배당락",
  "분기",
  "분기실적",
  "컨센서스",
  "블로그",
  "카페",
  "증권사",
  "리포트",
  // Price-watch variants — 두산에너빌리티 surfaced "주가시세" which leaked past
  // the original list because it's one token, no particle to strip.
  "주가시세",
  "시세",
  "주식시세",
  "주가분석",
  "주가차트",
  "주식차트",
  "주가흐름",
  "종목분석",
  "매매동향",
  "외국인",
  "기관",
  "프로그램매매",
  "시가총액",
  "상한가",
  "하한가",
]);

// Sibling-ticker tails. Parent-company autocompletes fill with these and the
// nickname extractor would otherwise treat them as "nicknames" and fire a
// search that surfaces bloggers covering a DIFFERENT ticker. E.g. `한화` →
// `한화 오션` / `한화 에어로스페이스`. The guard is a cheap stopword list;
// grow it when a new false positive is spotted in the wild.
const SIBLING_TICKER_TAILS = new Set([
  // 한화 group
  "오션",
  "에어로스페이스",
  "솔루션스",
  "시스템",
  "인더스트리얼솔루션즈",
  // SK group
  "하이닉스",
  "이노베이션",
  "텔레콤",
  "스퀘어",
  "바이오팜",
  "바이오사이언스",
  "네트웍스",
  "아이이테크놀로지",
  // LG group
  "에너지솔루션",
  "화학",
  "전자",
  "디스플레이",
  "유플러스",
  "생활건강",
  "헬로비전",
  "이노텍",
  // 삼성 group
  "전자",
  "바이오로직스",
  "물산",
  "sdi",
  "SDI",
  "중공업",
  "엔지니어링",
  "증권",
  "생명",
  "화재",
  "카드",
  "에스디에스",
  // 현대 group
  "모비스",
  "건설",
  "제철",
  "글로비스",
  "해상",
  "로템",
  "미포",
  "오토에버",
  "중공업",
  // 포스코 group
  "퓨처엠",
  "인터내셔널",
  "홀딩스",
  "DX",
  "ICT",
  // CJ group
  "제일제당",
  "대한통운",
  "ENM",
  "CGV",
  "프레시웨이",
  // 카카오 / 네이버 product lines (commonly in autocomplete)
  "페이",
  "뱅크",
  "모빌리티",
  "게임즈",
  "엔터",
  "지도",
  "메일",
  "클라우드",
  // Generic holdco suffixes that aren't nicknames
  "홀딩스",
  "지주",
  "머티리얼즈",
]);

// Drop a nickname candidate whose token ends in one of these particles
// because the particle is almost certainly clinging to a generic word.
const PARTICLE_SUFFIXES = ["의", "은", "는", "이", "가", "을", "를", "에", "으로", "로"];

function stripTrailingParticle(word) {
  for (const p of PARTICLE_SUFFIXES) {
    if (word.length > p.length + 1 && word.endsWith(p)) {
      return word.slice(0, -p.length);
    }
  }
  return word;
}

// Given the related-query list from parseRelatedQueries, return the subset
// that looks like blogger nicknames. Drops blocklisted tails and any tail
// that's pure ASCII (those are generic product keywords like "LFP").
function extractNicknameQueries(related) {
  const out = [];
  const seen = new Set();
  for (const r of related || []) {
    if (!r || !r.text) continue;
    if (seen.has(r.text)) continue;
    seen.add(r.text);

    if (r.wholeQuery) {
      // Suffix-attached patterns like "엘앤에프형" → fire as-is. The whole
      // string IS the nickname query. No extra filtering; if the suffix is
      // a generic particle like "의" it would have already been stripped
      // by the parser, which it isn't — we keep them.
      out.push({ text: r.text, nickname: null, source: "related-whole" });
      continue;
    }

    const tail = (r.nickname || "").trim();
    if (!tail) continue;

    // Drop multi-word tails where the first token is blocklisted
    // (e.g. "주가 전망" → drop). But keep "무영 블로그" style where the
    // first token is a real nickname — the blocklist check is first-word-only.
    // Check both the raw first word AND its particle-stripped form, because
    // stripping can turn "목표주가" into "목표주" which isn't in the list.
    const rawFirst = tail.split(/\s+/)[0];
    if (NICKNAME_BLOCKLIST.has(rawFirst)) continue;
    const firstWord = stripTrailingParticle(rawFirst);
    if (NICKNAME_BLOCKLIST.has(firstWord)) continue;
    if (/^[A-Za-z0-9]+$/.test(firstWord)) continue; // pure ASCII → product term

    // Sibling-ticker guard: the "nickname" is actually a sibling company
    // name (e.g. "한화 오션"). Firing this as a search would inject bloggers
    // who cover a different ticker. Drop it before it contaminates the map.
    if (SIBLING_TICKER_TAILS.has(firstWord)) continue;
    if (SIBLING_TICKER_TAILS.has(rawFirst)) continue;

    out.push({ text: r.text, nickname: firstWord, source: "related" });
  }
  return out;
}

// Detect blogroll / roundup post titles — posts that list multiple bloggers
// by nickname. Examples seen in the wild:
//   "3인 3색 엘앤에프 관련 블로거 활용법(무영, 강비호, 문벵이)"
//   "엘앤에프의 반전, '문벵이·무영·엘앤에프형'이 말하는 투자 포인트"
// These posts are goldmines because their bodies link directly to each
// mentioned blogger.
function isRoundupTitle(title, company) {
  if (!title) return false;
  const t = title;

  // Pattern A: "N인 N색" cluster — highest-signal blogroll marker.
  if (/\d+\s*인\s*\d+\s*색/.test(t)) return true;

  // Pattern B: explicit "블로거"/"블로그" reference alongside the company.
  if (company && t.includes(company) && /블로거|블로그 추천|블로그 모음|블로그 정리/.test(t)) return true;

  // Pattern C (parenthetical/quoted list with 2+ separators) was removed —
  // it matched tag-cloud titles like "엘앤에프(양극재, 2차전지, 배터리)"
  // and caused the 삼성전자 canary to waste its roundup budget on 2 false
  // positives. A/B alone cover the real cases (the bosbos2 "3인 3색" post
  // matches A, and explicit "블로거 활용법" wording lands in B).
  return false;
}

module.exports = {
  NICKNAME_BLOCKLIST,
  extractNicknameQueries,
  isRoundupTitle,
};
