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

// Deep-tech / competitive-analysis vocabulary. Posts with these terms
// discuss technology roadmaps, competitive moats, market share, R&D —
// the kind of analysis that helps evaluate a company's future technology
// position. Sector-agnostic: works for semicon, biotech, chemicals, etc.
const DEEP_TECH_TERMS = [
  "기술", "공정", "특허", "개발", "양산", "수율",
  "경쟁력", "독점", "점유율", "시장점유율", "기술력", "진입장벽", "해자",
  "로드맵", "차세대", "원천기술", "핵심기술", "혁신",
  "경쟁사", "대비", "우위", "선도", "독보적",
  "아키텍처", "플랫폼", "파이프라인", "포트폴리오",
  "내재화", "국산화", "자체개발", "원가", "원가구조",
];

// Near-term chatter words that disqualify even if a positive term is present.
// "SK하이닉스 이번주 기술 전망" has 기술 (positive) but 이번주 (negative) → drop.
const DEEP_TECH_DISQUALIFIERS = [
  "오늘", "내일", "금일", "이번주", "금주", "실시간", "속보", "긴급",
  "종가", "시가", "급등", "급락", "지금", "현재가",
];

// Stock/investing vocabulary — used by isStockRelatedTitle for blog-level
// quality gating. A blog whose general timeline rarely contains these terms
// is not a stock blog (e.g. a career/job blog that happened to have one post
// mentioning a company). Wider than TRADING_TERMS: we WANT to include
// trading-flavor posts here because they ARE stock-related, just not
// high-quality analysis. Purpose: "is this a stock blog at all?", not
// "is this post high-quality?".
//
// Deliberately excludes ambiguous words like 전망, 시장, 산업 on their own —
// those match non-stock contexts ("AI 시장 전망", "직업 전망").
const STOCK_RELATED_TERMS = [
  "주가", "주식", "증시", "코스피", "코스닥", "상한가", "하한가",
  "매수", "매도", "손절", "익절", "단타", "스윙", "급등", "급락",
  "시황", "차트", "캔들", "이평", "볼린저",
  "투자", "종목", "목표주가", "추천주", "관심주", "급등주", "주목주",
  "밸류에이션", "PER", "PBR", "ROE", "EPS", "EV/EBITDA",
  "실적", "매출", "영업이익", "순이익", "어닝", "컨센서스", "실적발표",
  "분기실적", "배당", "배당금", "배당락",
  "공시", "증자", "유상증자", "무상증자", "감자", "합병", "인적분할", "물적분할",
  "자사주", "소각", "IPO", "상장", "상장폐지", "인수",
  "경쟁력", "점유율", "시장점유율", "진입장벽", "해자", "독점",
];

const LISTICLE_SEPARATOR_RX = /[,/·|、]/g;

// Bracketed-prefix detector — news aggregator titles like "[특징주] ...",
// "【시황】 ...", "[장마감] ..." Dedicated analyst blogs rarely use this format.
const BRACKETED_PREFIX_RX = /^\s*[\[【（(]/;

// SEO / AI-content-farm cliché patterns. Each individually is weak; the
// ratio of matches across a blog's timeline is the signal.
//
// The stock-specific clickbait group (지금 사면 늦을까, 왜 오를까 등) is
// what actually catches templated AI-farm blogs like dkdlvkr3 that write
// 10 posts about 10 different tickers with identical question-hook titles.
// Real analyst blogs write custom prose per company (심층 리포트, 통찰,
// 업사이드 분석) and don't match these phrases.
const FORMULAIC_PATTERNS = [
  // Generic SEO clichés
  /총정리/,
  /완벽정리/,
  /완벽가이드/,
  /핵심정리/,
  /한눈에/,
  /모든\s*것/,
  /알아보기|알아보자/,
  /총망라/,
  /TOP\s*\d+/i,
  /\d+\s*가지/,
  /정리\s*$/,
  /\?\s*$/,
  /필독/,
  // Stock AI-farm clickbait (high-signal for templated content farms)
  /지금\s*사(면|도)\s*(늦을까|될까|괜찮을까|할까)/,
  /지금\s*매수\s*(타이밍|해도)/,
  /매수\s*타이밍\s*일까/,
  /왜\s*(오를까|떨어질까|주목받나|주목\s*받을까|뜨는가|뜨나)/,
  /얼마나\s*(오를까|갈까|올라)/,
  /사면\s*안\s*되는/,
  /꼭\s*알아야\s*할/,
  /모르면\s*(안\s*되는|손해)/,
  /놓치면\s*(안\s*되는|후회)/,
  /반드시\s*알아야/,
  /미래를?\s*(보다|엿보다|바꿀)/,
  /상승세\s*탈까/,
];

// Stopwords for the company-token extractor. These are generic stock/news
// vocabulary that isn't a company name. Without this list the distinct-token
// count would be dominated by 주가/전망/급등 etc. and every blog would look
// aggregator-like. Grow the list when a new generic term shows up in noise.
const COMPANY_TOKEN_STOPWORDS = new Set([
  // Core stock / price
  "주가", "주식", "증시", "코스피", "코스닥", "증권", "시장",
  "상한가", "하한가", "상승", "하락", "급등", "급락", "폭등", "폭락",
  "반등", "조정", "변동", "종가", "시가", "고가", "저가",
  // Analysis / forecast
  "전망", "분석", "리포트", "보고서", "평가", "의견", "코멘트",
  "실적", "매출", "이익", "영업이익", "순이익", "적자", "흑자",
  "컨센서스", "기대감", "모멘텀", "포인트", "이슈", "동향",
  // Investor flow
  "외국인", "기관", "개인", "순매수", "순매도", "매매", "거래", "거래량",
  "프로그램매매", "공매도",
  // Listicle / recommendation
  "특징주", "급등주", "관심주", "추천주", "주목주", "테마주", "관련주",
  "수혜주", "유망주",
  // Time markers
  "시황", "마감", "개장", "오늘", "내일", "금일", "이번주", "다음주",
  "분기", "연간", "반기", "상반기", "하반기", "결산", "업데이트",
  // Generic verbs / adjectives / connectors
  "이유", "이유는", "하는", "되는", "있는", "없는", "오는", "가는",
  "체크", "정리", "요약", "핵심", "전체", "주요", "최근", "최신",
  // Business / deep-tech vocabulary overlap — these are topics, not companies.
  // Deep-tech mode's title classifier uses these as POSITIVE signals, but for
  // company-name extraction they're noise. Duplication is intentional.
  "기술", "경쟁력", "점유율", "독점", "진입장벽", "해자", "로드맵",
  "공정", "특허", "개발", "양산", "수율", "혁신", "우위", "선도",
  "수주", "증가", "감소", "성장", "확대", "축소", "계약", "공급",
  "발표", "공시", "출시", "시작", "종료", "완료", "진행",
  "전년", "동기", "대비", "기록", "달성",
  // Sector labels (these are themes, not companies — filter them out so
  // a blogger who writes about 반도체 sector repeatedly doesn't get counted
  // as "many different stocks")
  "반도체", "2차전지", "이차전지", "배터리", "바이오", "제약", "헬스케어",
  "조선", "방산", "건설", "은행", "금융", "자동차", "화학", "철강",
  "해운", "항공", "화장품", "면세점", "게임", "엔터", "미디어",
  "리튬", "니켈", "양극재", "음극재", "태양광", "풍력", "원전", "SMR",
  "전기차", "수소", "로봇", "우주", "AI", "인공지능", "HBM", "CXL",
  // Stock-tag words that slip in from listicle titles
  "관련", "전부", "모든", "정보", "소식", "뉴스", "기사",
]);

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

function isBracketedTitle(title) {
  if (!title) return false;
  return BRACKETED_PREFIX_RX.test(title);
}

function isFormulaicTitle(title) {
  if (!title) return false;
  for (const rx of FORMULAIC_PATTERNS) {
    if (rx.test(title)) return true;
  }
  return false;
}

// Extract "company-like" tokens from a title for diversity counting.
// Pragmatic: pick Korean/Latin tokens of length 2–10 that aren't in the
// stopword list. Returns a Set so the caller can union across posts.
// NOT a true NER — the goal is to distinguish "blog writes about the same
// 3 companies over and over" from "blog writes about 20 different tickers
// in 20 posts". Noise in individual tokens is acceptable as long as the
// ratio signal across a blog's timeline is directionally correct.
function extractCompanyTokens(title) {
  const out = new Set();
  if (!title) return out;
  // Capture contiguous Korean/Latin runs (allow hyphen/ampersand within a
  // token for names like SK-하이닉스, LG&H). Length 2–10 trims noise.
  const matches = title.match(/[A-Za-z가-힣][A-Za-z가-힣0-9&\-]{1,9}/g) || [];
  for (const raw of matches) {
    const token = raw.trim();
    if (token.length < 2) continue;
    if (COMPANY_TOKEN_STOPWORDS.has(token)) continue;
    // Also strip trailing 주 (common tag suffix: 반도체주, 원전주 → already
    // sector words, but belt-and-suspenders)
    if (token.length > 2 && token.endsWith("주") && COMPANY_TOKEN_STOPWORDS.has(token.slice(0, -1))) continue;
    out.add(token);
  }
  return out;
}

function isStockRelatedTitle(title) {
  if (!title) return false;
  const t = lower(title);
  for (const term of STOCK_RELATED_TERMS) {
    if (t.includes(lower(term))) return true;
  }
  return false;
}

function isDeepTechTitle(title) {
  if (!title) return false;
  const t = lower(title);
  // Any disqualifier present → not deep-tech, regardless of positive hits
  for (const dq of DEEP_TECH_DISQUALIFIERS) {
    if (t.includes(lower(dq))) return false;
  }
  // At least one positive term required
  for (const term of DEEP_TECH_TERMS) {
    if (t.includes(lower(term))) return true;
  }
  return false;
}

module.exports = {
  TRADING_TERMS,
  SECTOR_TAGS,
  DEEP_TECH_TERMS,
  DEEP_TECH_DISQUALIFIERS,
  STOCK_RELATED_TERMS,
  COMPANY_TOKEN_STOPWORDS,
  FORMULAIC_PATTERNS,
  isTradingTitle,
  isListicleTitle,
  isDeepTechTitle,
  isStockRelatedTitle,
  isBracketedTitle,
  isFormulaicTitle,
  extractCompanyTokens,
};
