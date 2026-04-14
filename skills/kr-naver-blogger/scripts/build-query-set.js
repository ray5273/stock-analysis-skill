#!/usr/bin/env node

// build-query-set.js — Build a research-driven query set for Naver blogger
// discovery. Replaces the old hardcoded 3-query list with dynamic keywords
// derived from:
//   1. Base queries (always: <company> 투자 분석, <company> 실적)
//   2. DART product keywords (from dart-analysis.md if available)
//   3. News-trend keywords (from Naver News headline frequency analysis)
//   4. Context-file keywords (from an existing memo/data-pack, optional)
//
// Pure Node stdlib. No npm dependencies.

const fs = require("fs");
const path = require("path");

const browseNaver = require("../../kr-naver-browse/scripts/browse-naver.js");
const { isListicleTitle } = require("./lib/title-filters.js");

const DEFAULT_MAX_QUERIES = 8;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    maxQueries: DEFAULT_MAX_QUERIES,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--company") opts.company = next();
    else if (arg === "--ticker") opts.ticker = next();
    else if (arg === "--output") opts.output = next();
    else if (arg === "--dart-file") opts.dartFile = next();
    else if (arg === "--context-file") opts.contextFile = next();
    else if (arg === "--max-queries") opts.maxQueries = parseInt(next(), 10) || DEFAULT_MAX_QUERIES;
    else if (arg === "--verbose") opts.verbose = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

function usage() {
  return [
    "Usage:",
    "  node build-query-set.js --company <name> --ticker <code> --output <path>",
    "",
    "Options:",
    "  --company         Korean company name (required)",
    "  --ticker          6-digit KRX ticker (required)",
    "  --output          Output JSON path (required)",
    "  --dart-file PATH  Path to dart-analysis.md for product keyword extraction",
    "  --context-file PATH  Path to existing memo/data-pack for keyword extraction",
    "  --max-queries N   Maximum total queries (default 8)",
    "  --verbose         Print debug output",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Korean text tokenization
// ---------------------------------------------------------------------------

// Common Korean particles and suffixes to strip from tokens
const PARTICLE_RX = /(을|를|이|가|의|은|는|에|에서|와|과|도|로|으로|에게|한테|부터|까지|처럼|만큼|보다|라고|이라고|라는|이라는|라며|이라며)$/;

// Stopwords: generic finance/news terms that don't help identify topical coverage
const STOPWORDS = new Set([
  // finance generic
  "주가", "종목", "투자", "실적", "분석", "전망", "목표주가", "공시", "리포트",
  "증권", "상승", "하락", "시장", "수익", "매출", "영업이익", "당기순이익",
  "주식", "코스피", "코스닥", "거래", "거래량", "시가총액", "배당", "배당금",
  "기업", "회사", "경영", "대표", "사업", "보고서", "사업보고서", "공시일",
  "IR", "애널리스트", "증권사", "컨센서스", "리서치", "보고",
  "강세", "약세", "낙폭", "상승폭", "하락세", "상승세", "흐름", "변동",
  "전환", "상회", "하회", "기록", "수준", "규모", "추천", "매수",
  // news chrome / generic news terms
  "속보", "단독", "종합", "업데이트", "기자", "뉴스", "기사", "보도",
  "취재", "인터뷰", "확인", "관련", "관련주", "테마주", "대장주",
  "네이버", "네이버페이", "네이버뉴스", "출처", "캡처",
  // time
  "오늘", "내일", "어제", "최근", "올해", "작년", "내년", "이번",
  // generic verbs/adjectives/fillers that slip through particle stripping
  "가능", "예상", "전년", "대비", "동기", "기준", "현재", "이후",
  "이상", "이하", "이번주", "다음주", "이번달",
  "있다", "있다.", "했다", "했다.", "됐다", "됐다.", "밝혔다", "전했다",
  "보였다", "나타냈다", "기록했다", "거래되고",
  "글로벌", "국내", "해외", "전체", "업종", "시장에서", "대비해",
  "반면", "특히", "가운데", "따르면", "통해", "위해",
  "넘어", "이상의", "대한", "이후로", "동안", "이전",
  "하락한", "상승한", "올랐고", "밀렸다", "올랐다",
  "거래되며", "보이며", "나타내며", "이어가고", "이어갔다",
  "오전", "오후", "장중", "장마감", "전일",
  "수요", "공급", "전략", "동향", "이슈",
  // politics / election noise (leaks into finance news)
  "후보", "공약", "대선", "선거", "정치", "정부", "대통령",
  // other generic
  "한국", "미국", "중국", "일본", "유럽", "분기",
  "중심", "협력", "발표", "계획", "추진", "검토", "진행",
  // flow / supply-demand meta terms
  "외국인", "기관", "개인", "수급", "매수세", "매도세",
  // broad sector labels — too generic to seed a useful query.
  // Specific products (양극재, HBM, SMR) intentionally NOT listed.
  "광통신", "반도체", "바이오", "제약", "조선", "방산", "철강",
  "해운", "항공", "건설", "은행", "증권사", "보험", "식품",
  "화장품", "면세점", "엔터", "미디어", "게임", "유통",
]);

function tokenize(text, company, ticker) {
  if (!text) return [];

  // Normalize
  const normalized = text
    .replace(/["""'']/g, " ")
    .replace(/[…·,;:!?()[\]{}<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const rawTokens = normalized.split(" ").filter(Boolean);
  const cleaned = [];

  const companyLower = (company || "").toLowerCase();
  const tickerLower = (ticker || "").toLowerCase();

  for (let token of rawTokens) {
    // Strip quotes, ellipsis, and trailing punctuation
    token = token.replace(/^['"]+|['"]+$/g, "").replace(/[.。,;:!?]+$/, "").trim();
    if (!token) continue;

    // Strip trailing particles
    token = token.replace(PARTICLE_RX, "");
    if (!token || token.length < 2) continue;

    const lower = token.toLowerCase();

    // Skip the company name itself, ticker, and stopwords
    if (lower === companyLower) continue;
    if (lower === tickerLower) continue;
    // Skip tokens that are a prefix/substring of the company name (e.g. "삼성" for "삼성전자")
    if (companyLower.length > 2 && companyLower.includes(lower) && lower.length >= 2) continue;
    if (STOPWORDS.has(lower)) continue;
    if (STOPWORDS.has(token)) continue;

    // Skip pure numbers, dates, or very short tokens
    if (/^\d+$/.test(token)) continue;
    if (token.length < 2) continue;
    // Skip tokens that are just numbers with units, dates, or percentages
    if (/^\d+[%조억원만천일월년시분]?$/.test(token)) continue;
    if (/^\d{1,2}일$/.test(token)) continue;
    // Skip verb/adjective endings that survive particle stripping
    if (/[하된]$/.test(token) && token.length <= 3) continue;

    cleaned.push(token);
  }
  return cleaned;
}

// Count 1-gram and 2-gram frequencies from a list of token arrays.
// Returns sorted array of { term, count } for terms with count >= minCount.
function countFrequencies(tokenArrays, { minCount = 3, maxTerms = 10 } = {}) {
  const freq = new Map();

  for (const tokens of tokenArrays) {
    // 1-grams
    for (const t of tokens) {
      freq.set(t, (freq.get(t) || 0) + 1);
    }
    // 2-grams
    for (let i = 0; i < tokens.length - 1; i += 1) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      freq.set(bigram, (freq.get(bigram) || 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([term, count]) => ({ term, count }));
}

// ---------------------------------------------------------------------------
// Query sources
// ---------------------------------------------------------------------------

function baseQueries(company) {
  return [
    { text: `${company} 투자 분석`, source: "base" },
    { text: `${company} 실적`, source: "base" },
  ];
}

// Extract product keywords from a DART analysis markdown file.
// Looks for product/business names in sections like "사업의 내용", "주요 제품",
// "주요 수주", or table cells that mention specific products.
function extractDartKeywords(dartFilePath, company) {
  if (!dartFilePath || !fs.existsSync(dartFilePath)) return [];

  let content;
  try {
    content = fs.readFileSync(dartFilePath, "utf8");
  } catch {
    return [];
  }

  // Tokenize the whole file and find high-frequency nouns
  const tokens = tokenize(content, company);
  const freq = new Map();
  for (const t of tokens) {
    // Keep tokens that look like product names: 2-6 Korean chars, or
    // known patterns like English+Korean (e.g. "NCMA", "SMR", "HBM")
    const isKoreanNoun = /^[\uac00-\ud7af]{2,6}$/.test(t);
    const isAcronym = /^[A-Z]{2,6}$/.test(t);
    const isMixed = /^[A-Za-z\uac00-\ud7af]{2,8}$/.test(t);
    if (!isKoreanNoun && !isAcronym && !isMixed) continue;
    freq.set(t, (freq.get(t) || 0) + 1);
  }

  // Also look for terms in table rows (| col1 | col2 |) — these often name
  // specific projects/products
  const tableTerms = new Set();
  const tableRowRx = /^\|(.+)\|$/gm;
  let match;
  while ((match = tableRowRx.exec(content)) !== null) {
    const cells = match[1].split("|").map((c) => c.trim());
    for (const cell of cells) {
      // Extract Korean nouns 2-6 chars from cells
      const words = cell.split(/\s+/);
      for (let w of words) {
        w = w.replace(PARTICLE_RX, "");
        if (/^[\uac00-\ud7af]{2,6}$/.test(w) && !STOPWORDS.has(w)) {
          tableTerms.add(w);
          freq.set(w, (freq.get(w) || 0) + 1);
        }
        if (/^[A-Z]{2,6}$/.test(w)) {
          tableTerms.add(w);
          freq.set(w, (freq.get(w) || 0) + 1);
        }
      }
    }
  }

  return Array.from(freq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);
}

// Fetch Naver News headlines for the company and extract trending keywords
// via frequency analysis.
function extractNewsKeywords(company, ticker, opts = {}) {
  const mode = opts.mode || "news";
  const headlines = browseNaver.searchNaverNews(company, {
    max: 30,
    verbose: opts.verbose,
  });

  if (opts.verbose) {
    console.error(`[news] ${headlines.length} headline(s) fetched`);
  }

  if (headlines.length === 0) return { keywords: [], headlinesScanned: 0, listicleDropped: 0 };

  // Drop listicle-style headlines before tokenizing. Listicle headlines
  // ("엘앤에프 광통신 원전 반도체 급등...") contaminate the keyword set with
  // unrelated sector tags that then pull in cross-sector bloggers.
  const filtered = [];
  let listicleDropped = 0;
  for (const h of headlines) {
    if (isListicleTitle(h, company, { mode })) {
      listicleDropped += 1;
      if (opts.verbose) console.error(`  [listicle-drop] ${h.slice(0, 60)}`);
      continue;
    }
    filtered.push(h);
  }

  // Tokenize each filtered headline
  const tokenArrays = filtered.map((h) => tokenize(h, company, ticker));
  const topTerms = countFrequencies(tokenArrays, { minCount: 3, maxTerms: 10 });

  if (opts.verbose) {
    for (const { term, count } of topTerms) {
      console.error(`  [news-term] "${term}" x${count}`);
    }
  }

  return {
    keywords: topTerms.map((t) => t.term),
    headlinesScanned: headlines.length,
    listicleDropped,
  };
}

// Extract keywords from an existing memo or data-pack markdown file.
// Looks for section headers containing 핵심 논점, 투자 포인트, Key Issues etc.
// and extracts noun phrases from those sections.
function extractContextKeywords(contextFilePath, company) {
  if (!contextFilePath || !fs.existsSync(contextFilePath)) return [];

  let content;
  try {
    content = fs.readFileSync(contextFilePath, "utf8");
  } catch {
    return [];
  }

  // Find sections with keyword-rich headers
  const sectionRx = /^#{1,3}\s+(핵심|투자|Key|논점|포인트|리스크|카탈리스트|모멘텀|변수).*$/gim;
  const sections = [];
  let match;
  while ((match = sectionRx.exec(content)) !== null) {
    // Grab up to 500 chars after the header
    const start = match.index + match[0].length;
    const end = Math.min(start + 500, content.length);
    sections.push(content.slice(start, end));
  }

  if (sections.length === 0) return [];

  const tokens = tokenize(sections.join("\n"), company);
  const freq = new Map();
  for (const t of tokens) {
    if (/^[\uac00-\ud7af]{2,6}$/.test(t) || /^[A-Z]{2,6}$/.test(t)) {
      freq.set(t, (freq.get(t) || 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);
}

// ---------------------------------------------------------------------------
// Main build logic
// ---------------------------------------------------------------------------

function buildQuerySet(opts) {
  const { company, ticker, verbose } = opts;
  const queries = [];
  const seenTexts = new Set();

  function addQuery(text, source) {
    const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
    if (seenTexts.has(normalized)) return;
    seenTexts.add(normalized);
    queries.push({ text, source });
  }

  // 1. Base queries (always)
  for (const q of baseQueries(company)) {
    addQuery(q.text, q.source);
  }

  // 2. DART product keywords
  let dartProductsExtracted = 0;
  const dartKeywords = extractDartKeywords(opts.dartFile, company);
  dartProductsExtracted = dartKeywords.length;
  if (verbose && dartKeywords.length > 0) {
    console.error(`[dart] ${dartKeywords.length} keyword(s): ${dartKeywords.join(", ")}`);
  }
  for (const kw of dartKeywords.slice(0, 3)) {
    addQuery(`${company} ${kw}`, "dart-product");
  }

  // 3. News-trend keywords
  let newsHeadlinesScanned = 0;
  let newsListicleDropped = 0;
  const newsResult = extractNewsKeywords(company, ticker, { verbose, mode: "news" });
  newsHeadlinesScanned = newsResult.headlinesScanned;
  newsListicleDropped = newsResult.listicleDropped || 0;
  for (const kw of newsResult.keywords.slice(0, 5)) {
    addQuery(`${company} ${kw}`, "news-trend");
  }

  // 4. Context-file keywords
  let contextFileUsed = null;
  const contextKeywords = extractContextKeywords(opts.contextFile, company);
  if (contextKeywords.length > 0) {
    contextFileUsed = opts.contextFile;
    if (verbose) {
      console.error(`[context] ${contextKeywords.length} keyword(s): ${contextKeywords.join(", ")}`);
    }
    for (const kw of contextKeywords.slice(0, 3)) {
      addQuery(`${company} ${kw}`, "context");
    }
  }

  // Cap at max
  const capped = queries.slice(0, opts.maxQueries);

  // Fallback: if we only have base queries (news failed, no DART/context),
  // add a weak substitute
  if (capped.length <= 2 && dartKeywords.length === 0 && newsResult.keywords.length === 0) {
    addQuery(`${company} 주요 제품`, "fallback");
    if (verbose) {
      console.error("[fallback] No DART/news keywords found, added fallback query");
    }
  }

  const finalQueries = queries.slice(0, opts.maxQueries);

  return {
    company,
    ticker,
    generatedAt: todayYmd(),
    queries: finalQueries,
    meta: {
      newsHeadlinesScanned,
      newsListicleDropped,
      dartProductsExtracted,
      contextFileUsed,
      generatedBy: "kr-naver-blogger/build-query-set.js",
    },
  };
}

function todayYmd() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    console.error(usage());
    process.exit(1);
  }

  if (opts.help) {
    console.log(usage());
    process.exit(0);
  }

  if (!opts.company || !opts.ticker || !opts.output) {
    console.error("Error: --company, --ticker, and --output are required");
    console.error(usage());
    process.exit(1);
  }

  const result = buildQuerySet(opts);

  fs.mkdirSync(path.dirname(opts.output), { recursive: true });
  fs.writeFileSync(opts.output, JSON.stringify(result, null, 2) + "\n", "utf8");

  console.log(
    `Built ${result.queries.length} queries (${result.meta.newsHeadlinesScanned} news headlines scanned, ${result.meta.dartProductsExtracted} DART keywords). Output: ${opts.output}`
  );
}

if (require.main === module) main();

module.exports = { buildQuerySet, extractDartKeywords, extractNewsKeywords, extractContextKeywords, tokenize, countFrequencies };
