#!/usr/bin/env node

// discover-bloggers.js — rank Naver bloggers by how deeply they cover a given
// KRX stock. Reads from kr-naver-browse for all network access.

const fs = require("fs");
const path = require("path");

const browseNaver = require("../../kr-naver-browse/scripts/browse-naver.js");
const { buildQuerySet } = require("./build-query-set.js");
const { isTradingTitle, isListicleTitle } = require("./lib/title-filters.js");
const { extractNicknameQueries, isRoundupTitle } = require("./lib/nickname-extract.js");

const DEFAULT_MIN_POSTS = 2;
const DEFAULT_MAX_CANDIDATES = 10;
const DEFAULT_CACHE_DIR = ".tmp/naver-blog-cache";
const TRADING_BLOG_RATIO = 0.5;
const MAX_ROUNDUP_FETCH = 3;

function parseArgs(argv) {
  const opts = {
    minPosts: DEFAULT_MIN_POSTS,
    maxCandidates: DEFAULT_MAX_CANDIDATES,
    cacheDir: DEFAULT_CACHE_DIR,
    noCache: false,
    verbose: false,
    autoQueries: true,
    qualityFilter: true,
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

function rankBloggers(bloggers) {
  return bloggers.slice().sort((a, b) => {
    // Anchored bloggers (nickname- or roundup-surfaced) outrank keyword-only
    // hits. The anchor IS the quality signal; depth is the tiebreaker.
    const aa = isAnchored(a) ? 1 : 0;
    const ba = isAnchored(b) ? 1 : 0;
    if (ba !== aa) return ba - aa;
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
  for (const nq of nicknameQueries) {
    if (opts.verbose) console.error(`[nickname-search] ${nq.text}`);
    try {
      const hits = browseNaver.searchNaverBlog(nq.text, { max: 10 });
      if (opts.verbose) console.error(`  → ${hits.length} hit(s)`);
      accumulateHits(candidateMap, hits, {
        source: "nickname",
        nickname: nq.nickname || nq.text,
      });
      nicknameAnchorList.push({ text: nq.text, nickname: nq.nickname, hits: hits.length });
    } catch (err) {
      console.error(`[nickname-search-failed] "${nq.text}": ${err.message}`);
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

    // Quality filters: classify each title-matched post as trading / listicle
    // / dedicated. dedicatedPostCount is the primary ranking signal.
    let tradingTitleCount = 0;
    let listicleTitleCount = 0;
    let dedicatedPostCount = 0;
    for (const p of titleMatches) {
      const trading = isTradingTitle(p.title);
      const listicle = isListicleTitle(p.title, opts.company);
      if (trading) tradingTitleCount += 1;
      if (listicle) listicleTitleCount += 1;
      if (!trading && !listicle) dedicatedPostCount += 1;
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

    if (opts.verbose) {
      if (isTradingBlog) console.error(`  [excluded-trading] ${blogId} (${tradingAllCount}/${inBlogPage1Total})`);
      if (listicleTitleCount > 0) console.error(`  [listicle] ${blogId} x${listicleTitleCount}`);
      console.error(`  [counts] rel=${relevantPostCount} ded=${dedicatedPostCount} trad=${tradingTitleCount} list=${listicleTitleCount}`);
    }

    bloggers.push({
      blogId,
      displayName: null,
      blogTitle: null,
      subscriberCount: null,
      relevantPostCount,
      dedicatedPostCount,
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
      latestPostDate: null,
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
  const qualified = opts.qualityFilter
    ? bloggers.filter(
        (b) =>
          ((isAnchored(b) && b.dedicatedPostCount >= 1) ||
            b.dedicatedPostCount >= opts.minPosts) &&
          !b.isTradingBlog
      )
    : bloggers.filter((b) => b.relevantPostCount >= opts.minPosts);
  const ranked = rankBloggers(qualified);

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
      nicknameAnchoredCount: ranked.filter((b) => (b.nicknameHitCount || 0) > 0).length,
      roundupFetched,
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
