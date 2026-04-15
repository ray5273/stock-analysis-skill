#!/usr/bin/env node

// discover-bloggers.js — rank Naver bloggers by how deeply they cover a given
// KRX stock. Reads from kr-naver-browse for all network access.

const fs = require("fs");
const path = require("path");

const browseNaver = require("../../kr-naver-browse/scripts/browse-naver.js");
const { buildQuerySet } = require("./build-query-set.js");
const {
  isTradingTitle,
  isListicleTitle,
  isDeepTechTitle,
  isStockRelatedTitle,
  isBracketedTitle,
  isFormulaicTitle,
} = require("./lib/title-filters.js");
const { extractNicknameQueries, isRoundupTitle } = require("./lib/nickname-extract.js");

const DEFAULT_MIN_POSTS = 2;
const DEFAULT_MAX_CANDIDATES = 10;
const DEFAULT_CACHE_DIR = ".tmp/naver-blog-cache";
const TRADING_BLOG_RATIO = 0.5;
const MAX_ROUNDUP_FETCH = 3;

// Blog-level quality threshold (deep mode only).
// stockPostRatio: fraction of blog's general timeline (last ~20 posts) that
// is stock-related. < 0.5 means the blog is not primarily about stocks. This
// catches two distinct failure modes:
//   (a) career/lifestyle blogs that happened to have one stock-flavored post
//       (e.g. dodam852 → stockRatio 0.00)
//   (b) news aggregators that mix stock news with politics/sports/entertainment
//       (e.g. ittimesnews → stockRatio ~0.40)
// Real analyst blogs tend to have stockRatio >= 0.7. The 0.5 cutoff leaves
// room for macro/crypto-adjacent writers who still cover equities seriously.
const MIN_STOCK_POST_RATIO = 0.5;

// Content-farm filter. isFormulaicTitle catches clickbait templates like
// "X 주식 주가 전망 지금 매수 타이밍일까", "왜 오를까", etc. Real analysts score
// 0.00; AI/SEO farms score ~1.00 (canary: dkdlvkr3, enddltm7). The 0.7 cutoff
// requires a clear majority of a blog's general timeline to fit the template
// before excluding, so bloggers with one occasional formulaic title pass.
// Requires MIN_GENERAL_POSTS_FOR_BLOG_GATE general posts sampled to avoid
// false positives on very new blogs.
const MAX_FORMULAIC_TITLE_RATIO = 0.7;
const MIN_GENERAL_POSTS_FOR_BLOG_GATE = 5;

// Dedicated-post trust floor. A blogger with this many dedicated
// (non-trading, non-listicle) posts *about this specific company* bypasses
// the non-stock-blog filter. Real covering bloggers (acejji81, lowclass,
// investryu) often score stockRatio=0.00 because isStockRelatedTitle is
// narrow and misses titles like "GRT (42) – GRT 필름 엔비디아 서버 테스트".
// The dedicated count itself is the trust signal — a stockRatio floor
// caused regressions on all three core GRT bloggers.
//
// Minor false-positive risk: non-stock blogs (gnccei, ded=4) with company
// mentions in partnership/program titles may bypass. Accepted tradeoff —
// isDedicatedFarm catches the bigger AI-farm problem, and non-stock posts
// produce obviously non-analytical summaries downstream.
const DEDICATED_TRUST_FLOOR = 3;

// Staleness filter. When at least MIN_DATED_POSTS of the company-matched posts
// carry parseable dates and STALE_RATIO_THRESHOLD of those are older than
// STALE_CUTOFF_DAYS, the blogger has stopped covering this ticker. We require
// MIN_DATED_POSTS >= 3 because date parsing in parseBlogSearchResults fails
// silently on some lines — a 1/1 ratio from a single dated post would produce
// false positives against active bloggers whose date tokens didn't parse.
const STALE_CUTOFF_DAYS = 365;
const STALE_RATIO_THRESHOLD = 0.8;
const MIN_DATED_POSTS = 3;

function parseArgs(argv) {
  const opts = {
    minPosts: DEFAULT_MIN_POSTS,
    maxCandidates: DEFAULT_MAX_CANDIDATES,
    cacheDir: DEFAULT_CACHE_DIR,
    noCache: false,
    verbose: false,
    autoQueries: true,
    qualityFilter: true,
    blogFilter: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--company") opts.company = next();
    else if (arg === "--ticker") opts.ticker = next();
    else if (arg === "--min-posts") opts.minPosts = parseInt(next(), 10) || DEFAULT_MIN_POSTS;
    else if (arg === "--max-candidates") opts.maxCandidates = parseInt(next(), 10) || DEFAULT_MAX_CANDIDATES;
    else if (arg === "--output") opts.output = next();
    else if (arg === "--cache-dir") opts.cacheDir = next();
    else if (arg === "--no-cache") opts.noCache = true;
    else if (arg === "--verbose") opts.verbose = true;
    else if (arg === "--queries-file") opts.queriesFile = next();
    else if (arg === "--dart-file") opts.dartFile = next();
    else if (arg === "--context-file") opts.contextFile = next();
    else if (arg === "--no-auto-queries") opts.autoQueries = false;
    else if (arg === "--no-quality-filter") opts.qualityFilter = false;
    else if (arg === "--no-blog-filter") opts.blogFilter = false;
    else if (arg === "--deep") opts.deep = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

function usage() {
  return [
    "Usage:",
    "  node discover-bloggers.js --company <name> --ticker <code> --output <path>",
    "",
    "Options:",
    "  --company            Korean company name (required)",
    "  --ticker             6-digit KRX ticker (required)",
    "  --output             Output JSON path (required)",
    "  --min-posts N        Minimum qualifying post count (default 2)",
    "  --max-candidates N   Max bloggers to evaluate (default 10)",
    "  --cache-dir PATH     Cache root (default .tmp/naver-blog-cache)",
    "  --no-cache           Skip cache lookup for today",
    "  --verbose            Print debug output",
    "",
    "Query options:",
    "  --queries-file PATH  Pre-built query set JSON (skips auto-query build)",
    "  --dart-file PATH     DART analysis markdown for product keyword extraction",
    "  --context-file PATH  Existing memo/data-pack for keyword extraction",
    "  --no-auto-queries    Force legacy 3-query mode (no dynamic keywords)",
    "  --no-quality-filter  Disable trading/listicle title filters (regression mode)",
    "  --no-blog-filter     Disable blog-level quality gates (deep mode regression)",
    "  --deep               Deep-tech mode: filter for technology/competitive analysis",
  ].join("\n");
}

function todayYmd() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function cachePath(cacheDir, ticker, date) {
  return path.join(cacheDir, "bloggers", ticker, `${date}.json`);
}

function readCache(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function writeJson(p, data) {
  ensureDir(p);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// Accumulate search hits into a blogId→entry map. `source` tags which pass
// the hit came from so downstream logic can tell keyword-surfaced candidates
// apart from nickname- and roundup-surfaced ones.
function accumulateHits(byId, searchResults, { source = "keyword", nickname = null } = {}) {
  for (const r of searchResults) {
    if (!r.blogId) continue;
    if (!byId.has(r.blogId)) {
      byId.set(r.blogId, {
        ...r,
        searchHitCount: 0,
        searchHits: [],
        nicknameHitCount: 0,
        nicknameAnchors: new Set(),
        roundupMentioned: false,
        roundupSources: new Set(),
      });
    }
    const existing = byId.get(r.blogId);
    existing.searchHits.push(r);
    if (source === "keyword") {
      existing.searchHitCount += 1;
    } else if (source === "nickname") {
      existing.nicknameHitCount += 1;
      if (nickname) existing.nicknameAnchors.add(nickname);
    }
  }
}

function markRoundupMention(byId, blogId, sourceBlogId) {
  if (!blogId) return;
  if (!byId.has(blogId)) {
    byId.set(blogId, {
      blogId,
      searchHitCount: 0,
      searchHits: [],
      nicknameHitCount: 0,
      nicknameAnchors: new Set(),
      roundupMentioned: true,
      roundupSources: new Set([sourceBlogId]),
    });
  } else {
    const existing = byId.get(blogId);
    existing.roundupMentioned = true;
    existing.roundupSources.add(sourceBlogId);
  }
}

function mentionsCompany(text, company, ticker) {
  if (!text) return false;
  const haystack = text.toLowerCase();
  if (company && haystack.includes(company.toLowerCase())) return true;
  if (ticker && haystack.includes(ticker.toLowerCase())) return true;
  return false;
}

function isAnchored(b) {
  return (b.nicknameHitCount || 0) > 0 || b.roundupMentioned === true;
}

function rankBloggers(bloggers, { deep = false } = {}) {
  return bloggers.slice().sort((a, b) => {
    if (deep) {
      // Deep-tech mode: rank by tech/competitive analysis post density.
      const al = a.deepTechPostCount || 0;
      const bl = b.deepTechPostCount || 0;
      if (bl !== al) return bl - al;
    } else {
      // Default: anchored bloggers outrank keyword-only hits.
      const aa = isAnchored(a) ? 1 : 0;
      const ba = isAnchored(b) ? 1 : 0;
      if (ba !== aa) return ba - aa;
    }
    const ad = a.dedicatedPostCount ?? a.relevantPostCount;
    const bd = b.dedicatedPostCount ?? b.relevantPostCount;
    if (bd !== ad) return bd - ad;
    if (b.relevantPostCount !== a.relevantPostCount) {
      return b.relevantPostCount - a.relevantPostCount;
    }
    const ap = a.inBlogPaginationPages || 0;
    const bp = b.inBlogPaginationPages || 0;
    if (bp !== ap) return bp - ap;
    const ald = a.latestPostDate || "";
    const bld = b.latestPostDate || "";
    if (bld !== ald) return bld.localeCompare(ald);
    return a.blogId.localeCompare(b.blogId);
  });
}

function discover(opts) {
  if (!opts.company || !opts.ticker || !opts.output) {
    console.error("Error: --company, --ticker, and --output are required");
    console.error(usage());
    process.exit(1);
  }

  const today = todayYmd();
  const cachedPath = cachePath(opts.cacheDir, opts.ticker, today);
  if (!opts.noCache) {
    const cached = readCache(cachedPath);
    if (cached) {
      if (opts.verbose) console.error(`[cache-hit] ${cachedPath}`);
      writeJson(opts.output, cached);
      return cached;
    }
  }

  // Build query set: dynamic (default), pre-built file, or legacy fallback
  let queries;
  let querySetMeta = null;
  if (opts.queriesFile) {
    // Use a pre-built query set JSON
    const raw = JSON.parse(fs.readFileSync(opts.queriesFile, "utf8"));
    queries = (raw.queries || []).map((q) => q.text || q);
    querySetMeta = raw.meta || null;
    if (opts.verbose) console.error(`[queries] loaded ${queries.length} from ${opts.queriesFile}`);
  } else if (opts.autoQueries) {
    // Build dynamic queries via build-query-set
    const qResult = buildQuerySet({
      company: opts.company,
      ticker: opts.ticker,
      dartFile: opts.dartFile,
      contextFile: opts.contextFile,
      maxQueries: 8,
      verbose: opts.verbose,
    });
    queries = qResult.queries.map((q) => q.text);
    querySetMeta = { queries: qResult.queries, meta: qResult.meta };
    if (opts.verbose) console.error(`[queries] built ${queries.length} dynamic queries`);
  } else {
    // Legacy 3-query fallback
    queries = [
      `${opts.company} 투자 분석`,
      `${opts.company} 실적`,
      opts.ticker,
    ];
    if (opts.verbose) console.error(`[queries] legacy mode, ${queries.length} queries`);
  }

  // --deep mode: inject tech/competitive analysis queries so the candidate
  // pool contains bloggers who write about technology and market position.
  if (opts.deep) {
    const deepQueries = [
      { text: `${opts.company} 기술 분석`, source: "deep-tech" },
      { text: `${opts.company} 경쟁력`, source: "deep-tech" },
      { text: `${opts.company} 기술 로드맵`, source: "deep-tech" },
    ];
    for (const dq of deepQueries) {
      if (!queries.includes(dq.text)) {
        queries.push(dq.text);
        if (querySetMeta && querySetMeta.queries) {
          querySetMeta.queries.push(dq);
        }
      }
    }
    if (opts.verbose) console.error(`[deep] injected ${deepQueries.length} tech-analysis queries`);
  }

  // Pass 1 — keyword search. Same as Phase 2.
  const candidateMap = new Map();
  const allResults = [];
  for (const q of queries) {
    if (opts.verbose) console.error(`[search] ${q}`);
    try {
      const hits = browseNaver.searchNaverBlog(q, { max: 10 });
      if (opts.verbose) console.error(`  → ${hits.length} hit(s)`);
      allResults.push(...hits);
      accumulateHits(candidateMap, hits, { source: "keyword" });
    } catch (err) {
      console.error(`[search-failed] "${q}": ${err.message}`);
    }
  }

  // Pass 2 — related-query nickname anchor. Fetch 연관검색어 from the blog
  // search page for the company, strip blocklisted tails, fire the rest as
  // `<company> <nickname>` anchor queries. Each hit is tagged with the
  // surfacing nickname so qualification can bypass min-posts for anchored
  // bloggers.
  let relatedQueries = [];
  const nicknameAnchorList = [];
  try {
    relatedQueries = browseNaver.fetchRelatedQueries(opts.company) || [];
    if (opts.verbose) console.error(`[related] ${relatedQueries.length} suggestion(s)`);
  } catch (err) {
    console.error(`[related-failed] ${err.message}`);
  }
  const nicknameQueries = extractNicknameQueries(relatedQueries);
  const eventQueryList = [];
  for (const nq of nicknameQueries) {
    // source: "event" = corporate-action tail (주주총회, 무상증자, ...).
    // Fire the search for recall but route hits into the keyword pool so
    // they do NOT get nickname-anchor status. They must still qualify via
    // the dedicatedPostCount floor like any other keyword hit.
    const isEvent = nq.source === "event";
    const label = isEvent ? "event-search" : "nickname-search";
    if (opts.verbose) console.error(`[${label}] ${nq.text}`);
    try {
      const hits = browseNaver.searchNaverBlog(nq.text, { max: 10 });
      if (opts.verbose) console.error(`  → ${hits.length} hit(s)`);
      accumulateHits(candidateMap, hits, {
        source: isEvent ? "keyword" : "nickname",
        nickname: isEvent ? null : nq.nickname || nq.text,
      });
      if (isEvent) {
        eventQueryList.push({ text: nq.text, hits: hits.length });
      } else {
        nicknameAnchorList.push({ text: nq.text, nickname: nq.nickname, hits: hits.length });
      }
    } catch (err) {
      console.error(`[${label}-failed] "${nq.text}": ${err.message}`);
    }
  }

  // Pass 3 — roundup-post body mining. Scan every hit from pass 1 + pass 2
  // for titles matching blogroll patterns. Fetch the full page text (via
  // browseText, which is untruncated) of up to MAX_ROUNDUP_FETCH of them,
  // extract every `blog.naver.com/<blogId>` reference, and inject those
  // blogIds as high-trust candidates. This is how we surface depth-first
  // coverers (like naburo for 엘앤에프) whose own titles never mention the
  // company name — they get linked from other dedicated bloggers' roundup
  // posts.
  const seenRoundupKeys = new Set();
  const roundupCandidates = [];
  for (const r of allResults) {
    if (!r.title || !r.blogId || !r.logNo) continue;
    if (!isRoundupTitle(r.title, opts.company)) continue;
    const key = `${r.blogId}:${r.logNo}`;
    if (seenRoundupKeys.has(key)) continue;
    seenRoundupKeys.add(key);
    roundupCandidates.push(r);
  }
  // Also consider nickname-pass hits — the "3인 3색" post might only surface
  // via a `엘앤에프 무영` query, not the primary keyword pass.
  for (const entry of candidateMap.values()) {
    for (const h of entry.searchHits) {
      if (!h.title || !h.logNo) continue;
      if (!isRoundupTitle(h.title, opts.company)) continue;
      const key = `${h.blogId}:${h.logNo}`;
      if (seenRoundupKeys.has(key)) continue;
      seenRoundupKeys.add(key);
      roundupCandidates.push(h);
    }
  }
  const roundupFetched = [];
  for (const rc of roundupCandidates.slice(0, MAX_ROUNDUP_FETCH)) {
    if (opts.verbose) console.error(`[roundup] ${rc.blogId}/${rc.logNo} ${rc.title}`);
    try {
      const url = `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(rc.blogId)}&logNo=${encodeURIComponent(rc.logNo)}`;
      const text = browseNaver.browseText(url);
      if (!text) continue;
      const refIds = browseNaver.extractBlogIdRefs(text, { excludeBlogId: rc.blogId });
      if (opts.verbose) console.error(`  → refs: ${refIds.join(", ") || "(none)"}`);
      for (const id of refIds) {
        markRoundupMention(candidateMap, id, rc.blogId);
      }
      roundupFetched.push({
        sourceBlogId: rc.blogId,
        logNo: rc.logNo,
        title: rc.title,
        refs: refIds,
      });
    } catch (err) {
      console.error(`[roundup-fetch-failed] ${rc.blogId}/${rc.logNo}: ${err.message}`);
    }
  }

  // Build the candidate list to evaluate: everything the max-candidates cap
  // from pass 1, plus ALL anchored entries (nickname or roundup) regardless
  // of the cap. Anchored entries are rare enough that uncapping is safe and
  // fixes the recall problem that started Phase 3.
  const byKeywordHit = Array.from(candidateMap.values())
    .filter((c) => !isAnchored(c))
    .sort((a, b) => b.searchHitCount - a.searchHitCount)
    .slice(0, opts.maxCandidates);
  const anchored = Array.from(candidateMap.values()).filter(isAnchored);
  const candidateList = [...byKeywordHit, ...anchored];
  // Hint for large candidate pools — suggest --deep if not already set.
  if (candidateMap.size > 25 && !opts.deep && opts.verbose) {
    console.error(
      `[hint] Large candidate pool (${candidateMap.size}). ` +
      `기술/경쟁력 분석 필터링은 --deep 으로.`
    );
  }

  const seenCandidateIds = new Set();
  const candidates = [];
  for (const c of candidateList) {
    if (seenCandidateIds.has(c.blogId)) continue;
    seenCandidateIds.add(c.blogId);
    candidates.push(c.blogId);
  }

  const bloggers = [];
  let skipped = 0;
  for (const blogId of candidates) {
    if (opts.verbose) console.error(`[evaluate] ${blogId}`);
    const entry = candidateMap.get(blogId);
    const searchHitCount = entry ? entry.searchHitCount : 0;
    const nicknameHitCount = entry ? entry.nicknameHitCount : 0;
    const nicknameAnchors = entry && entry.nicknameAnchors ? [...entry.nicknameAnchors] : [];
    const roundupMentioned = entry ? !!entry.roundupMentioned : false;
    const roundupSources = entry && entry.roundupSources ? [...entry.roundupSources] : [];

    // Primary signal: hit Naver's per-blog search and count posts whose
    // TITLE contains the company name. Naver's in-blog search matches on
    // body text, so a title filter is needed to strip one-off mentions.
    let inBlogResult = { posts: [], paginationPages: 0 };
    try {
      inBlogResult = browseNaver.searchWithinBlog(blogId, opts.company);
    } catch (err) {
      console.error(`[inblog-search-failed] ${blogId}: ${err.message}`);
    }

    const titleMatches = inBlogResult.posts.filter((p) =>
      mentionsCompany(p.title, opts.company, opts.ticker)
    );
    const relevantPostCount = titleMatches.length;
    const inBlogPage1Total = inBlogResult.posts.length;
    const inBlogPaginationPages = inBlogResult.paginationPages;

    // Staleness: among company-matched posts with parseable dates, count how
    // many are older than STALE_CUTOFF_DAYS. latestRelevantPostDate is the
    // newest dated post. Both feed the staleness qualification gate below.
    const staleCutoffMs = Date.now() - STALE_CUTOFF_DAYS * 24 * 60 * 60 * 1000;
    let datedPostCount = 0;
    let stalePostCount = 0;
    let latestRelevantPostDate = null;
    for (const p of titleMatches) {
      if (!p.date) continue;
      const ts = Date.parse(p.date);
      if (Number.isNaN(ts)) continue;
      datedPostCount += 1;
      if (ts < staleCutoffMs) stalePostCount += 1;
      if (!latestRelevantPostDate || p.date > latestRelevantPostDate) {
        latestRelevantPostDate = p.date;
      }
    }
    const staleCoverageRatio =
      datedPostCount > 0 ? stalePostCount / datedPostCount : null;

    // Quality filters: classify each title-matched post as trading / listicle
    // / dedicated. dedicatedPostCount is the primary ranking signal.
    let tradingTitleCount = 0;
    let listicleTitleCount = 0;
    let dedicatedPostCount = 0;
    let deepTechPostCount = 0;
    let dedicatedFormulaicCount = 0;
    const seenLogNos = new Set();
    for (const p of titleMatches) {
      const trading = isTradingTitle(p.title);
      const listicle = isListicleTitle(p.title, opts.company);
      const deepTech = isDeepTechTitle(p.title);
      if (trading) tradingTitleCount += 1;
      if (listicle) listicleTitleCount += 1;
      if (!trading && !listicle) {
        dedicatedPostCount += 1;
        if (isFormulaicTitle(p.title)) dedicatedFormulaicCount += 1;
      }
      if (deepTech && !trading && !listicle) deepTechPostCount += 1;
      if (p.logNo) seenLogNos.add(p.logNo);
    }
    // Ratio of formulaic titles among this blogger's dedicated posts about
    // the target company. A high ratio means the blogger writes the same
    // SEO template for every ticker (oeollo: "X 목표주가 전망, 2026년 핵심
    // 체크포인트", mmustory: "X 배당금액, 2026년 시나리오 정리").
    const dedicatedFormulaicRatio =
      dedicatedPostCount > 0 ? dedicatedFormulaicCount / dedicatedPostCount : 0;

    // In deep mode, also count tech titles from the initial search results.
    // searchWithinBlog returns page-1 by recency, so old tech posts (the ones
    // that made the blogger a candidate via "SK하이닉스 기술 분석" query) may
    // not show up on page 1. The search-result titles from Pass 1 already have
    // them — count those too, deduped by logNo.
    if (opts.deep && entry && entry.searchHits) {
      for (const h of entry.searchHits) {
        if (!h.title || !h.logNo) continue;
        if (seenLogNos.has(h.logNo)) continue;
        if (!mentionsCompany(h.title, opts.company, opts.ticker)) continue;
        if (isTradingTitle(h.title) || isListicleTitle(h.title, opts.company)) continue;
        if (isDeepTechTitle(h.title)) {
          deepTechPostCount += 1;
          seenLogNos.add(h.logNo);
        }
      }
    }

    // Trading-shop detector: if half of the blog's page-1 posts are TA
    // flavor, it's not a dedicated coverer regardless of title matches.
    let tradingAllCount = 0;
    for (const p of inBlogResult.posts) {
      if (isTradingTitle(p.title)) tradingAllCount += 1;
    }
    const isTradingBlog =
      inBlogPage1Total > 0 &&
      tradingAllCount / inBlogPage1Total >= TRADING_BLOG_RATIO;

    // Blog-level quality signal. Fetch the blog's general recent timeline
    // (up to 20 posts, unfiltered by any query) and measure how much of it
    // is stock-related. Filters two failure modes with one cutoff:
    // (a) non-stock blogs (career, lifestyle) that happened to have one
    //     stock-flavored post; (b) news aggregators that mix tickers with
    //     politics/sports/entertainment content.
    let generalPosts = [];
    try {
      generalPosts = browseNaver.readBlogPostList(blogId, { max: 20 }) || [];
    } catch (err) {
      console.error(`[general-list-failed] ${blogId}: ${err.message}`);
    }
    const generalPostCount = generalPosts.length;
    let stockRelatedCount = 0;
    let bracketedCount = 0;
    let formulaicCount = 0;
    for (const p of generalPosts) {
      if (isStockRelatedTitle(p.title)) stockRelatedCount += 1;
      if (isBracketedTitle(p.title)) bracketedCount += 1;
      if (isFormulaicTitle(p.title)) formulaicCount += 1;
    }
    const stockPostRatio =
      generalPostCount > 0 ? stockRelatedCount / generalPostCount : 0;
    const bracketedTitleRatio =
      generalPostCount > 0 ? bracketedCount / generalPostCount : 0;
    // AI content farm signal. Canary: dkdlvkr3 scores 1.00 (every title
    // matches a templated clickbait phrase like "지금 사면 늦을까", "왜 오를까"),
    // while real analyst gunyoung88 scores 0.00. Threshold decision deferred —
    // reported for observability first.
    const formulaicTitleRatio =
      generalPostCount > 0 ? formulaicCount / generalPostCount : 0;

    if (opts.verbose) {
      if (isTradingBlog) console.error(`  [excluded-trading] ${blogId} (${tradingAllCount}/${inBlogPage1Total})`);
      if (listicleTitleCount > 0) console.error(`  [listicle] ${blogId} x${listicleTitleCount}`);
      console.error(`  [counts] rel=${relevantPostCount} ded=${dedicatedPostCount} deep=${deepTechPostCount} trad=${tradingTitleCount} list=${listicleTitleCount} dedFormulaic=${dedicatedFormulaicCount}/${dedicatedPostCount}`);
      console.error(
        `  [blog] general=${generalPostCount} stock=${stockRelatedCount} ` +
        `stockRatio=${stockPostRatio.toFixed(2)} ` +
        `bracketRatio=${bracketedTitleRatio.toFixed(2)} ` +
        `formulaicRatio=${formulaicTitleRatio.toFixed(2)}`
      );
      const staleStr = staleCoverageRatio === null ? "n/a" : staleCoverageRatio.toFixed(2);
      console.error(
        `  [stale] dated=${datedPostCount}/${relevantPostCount} ` +
        `staleRatio=${staleStr} latest=${latestRelevantPostDate || "n/a"}`
      );
    }

    bloggers.push({
      blogId,
      displayName: null,
      blogTitle: null,
      subscriberCount: null,
      relevantPostCount,
      dedicatedPostCount,
      deepTechPostCount,
      tradingTitleCount,
      listicleTitleCount,
      isTradingBlog,
      searchHitCount,
      nicknameHitCount,
      nicknameAnchors,
      roundupMentioned,
      roundupSources,
      inBlogPage1Total,
      inBlogPaginationPages,
      generalPostCount,
      stockPostRatio,
      bracketedTitleRatio,
      formulaicTitleRatio,
      dedicatedFormulaicRatio,
      datedPostCount,
      staleCoverageRatio,
      latestRelevantPostDate,
      latestPostDate: latestRelevantPostDate,
      categories: [],
      profileSnippet: null,
    });
  }

  // Anchored bloggers (surfaced via nickname autocomplete or roundup-post
  // body references) bypass the min-posts floor — but still need at least
  // one dedicated post about the company. The anchor is a trust signal, not
  // a free pass; an anchored blogger with ded=0 (mentioned the company in
  // one body but never wrote a titled post about it) isn't a coverer.
  // Trading-blog exclusion still applies to everyone.
  //
  // --deep mode: only bloggers with at least one deep-tech titled post
  // qualify. Anchor bypass is skipped (large caps rarely have nickname
  // anchors). Trading-blog exclusion still applies.
  const isStaleCoverer = (b) =>
    opts.blogFilter &&
    b.datedPostCount >= MIN_DATED_POSTS &&
    b.staleCoverageRatio !== null &&
    b.staleCoverageRatio >= STALE_RATIO_THRESHOLD;

  // Blog-timeline gates that apply in all modes (not just --deep). Catches
  // two failure modes the ticker-level filters miss:
  //   (1) lifestyle/career blogs with zero stock content in the general
  //       timeline but one orphan stock post that title-matched the query
  //       (e.g. gunyoung88, itcar098 — timelines full of 기후동행퀴즈, 도시락);
  //   (2) SEO/AI content farms whose general timeline is 80%+ templated
  //       clickbait (e.g. enddltm7 — "X 주식 주가 전망 지금 사면 될까").
  // Both require MIN_GENERAL_POSTS_FOR_BLOG_GATE samples before firing so new
  // bloggers with thin timelines aren't falsely excluded.
  const isNonStockBlog = (b) =>
    b.dedicatedPostCount < DEDICATED_TRUST_FLOOR &&
    b.generalPostCount >= MIN_GENERAL_POSTS_FOR_BLOG_GATE &&
    b.stockPostRatio < MIN_STOCK_POST_RATIO;
  const isContentFarm = (b) =>
    b.generalPostCount >= MIN_GENERAL_POSTS_FOR_BLOG_GATE &&
    b.formulaicTitleRatio >= MAX_FORMULAIC_TITLE_RATIO;
  // Dedicated-post farm: even if the blog's general timeline looks clean,
  // if most of its posts *about this specific company* are templated, it's
  // a multi-ticker AI farm that writes the same SEO template per ticker.
  // Requires at least 2 dedicated posts to avoid single-post false positives.
  const isDedicatedFarm = (b) =>
    b.dedicatedPostCount >= 2 &&
    b.dedicatedFormulaicRatio >= MAX_FORMULAIC_TITLE_RATIO;

  const qualified = opts.qualityFilter
    ? bloggers.filter((b) => {
        if (b.isTradingBlog) return false;
        if (isStaleCoverer(b)) {
          if (opts.verbose) {
            console.error(
              `  [excluded-stale] ${b.blogId} ` +
              `staleRatio=${b.staleCoverageRatio.toFixed(2)} ` +
              `dated=${b.datedPostCount} latest=${b.latestRelevantPostDate || "n/a"}`
            );
          }
          return false;
        }
        if (isNonStockBlog(b)) {
          if (opts.verbose) {
            console.error(
              `  [excluded-non-stock-blog] ${b.blogId} ` +
              `stockRatio=${b.stockPostRatio.toFixed(2)} ` +
              `general=${b.generalPostCount}`
            );
          }
          return false;
        }
        if (isContentFarm(b)) {
          if (opts.verbose) {
            console.error(
              `  [excluded-content-farm] ${b.blogId} ` +
              `formulaicRatio=${b.formulaicTitleRatio.toFixed(2)} ` +
              `general=${b.generalPostCount}`
            );
          }
          return false;
        }
        if (isDedicatedFarm(b)) {
          if (opts.verbose) {
            console.error(
              `  [excluded-dedicated-farm] ${b.blogId} ` +
              `dedFormulaicRatio=${b.dedicatedFormulaicRatio.toFixed(2)} ` +
              `ded=${b.dedicatedPostCount}`
            );
          }
          return false;
        }
        if (opts.deep) {
          if (b.deepTechPostCount < 1) return false;
          return true;
        }
        return (
          (isAnchored(b) && b.dedicatedPostCount >= 1) ||
          b.dedicatedPostCount >= opts.minPosts
        );
      })
    : bloggers.filter((b) => b.relevantPostCount >= opts.minPosts);
  const ranked = rankBloggers(qualified, { deep: opts.deep });

  const output = {
    company: opts.company,
    ticker: opts.ticker,
    discoveredAt: today,
    bloggers: ranked,
    meta: {
      searchQueries: queries.length,
      candidatesFound: candidateMap.size,
      qualified: ranked.length,
      skipped,
      querySet: querySetMeta,
      relatedQueries,
      nicknameQueries: nicknameAnchorList,
      eventQueries: eventQueryList,
      nicknameAnchoredCount: ranked.filter((b) => (b.nicknameHitCount || 0) > 0).length,
      roundupFetched,
      deepMode: opts.deep || false,
      blogFilterApplied: !!(opts.deep && opts.blogFilter),
      generatedBy: "kr-naver-blogger/discover-bloggers.js",
    },
  };

  writeJson(opts.output, output);
  if (!opts.noCache) writeJson(cachedPath, output);

  console.log(
    `Discovered ${ranked.length} qualified blogger(s) out of ${candidateMap.size} candidate(s). Output: ${opts.output}`
  );
  return output;
}

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
  discover(opts);
}

if (require.main === module) main();

module.exports = { discover, rankBloggers };
