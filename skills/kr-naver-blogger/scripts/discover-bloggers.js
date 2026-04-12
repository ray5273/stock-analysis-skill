#!/usr/bin/env node

// discover-bloggers.js — rank Naver bloggers by how deeply they cover a given
// KRX stock. Reads from kr-naver-browse for all network access.

const fs = require("fs");
const path = require("path");

const browseNaver = require("../../kr-naver-browse/scripts/browse-naver.js");

const DEFAULT_MIN_POSTS = 3;
const DEFAULT_MAX_CANDIDATES = 10;
const DEFAULT_CACHE_DIR = ".tmp/naver-blog-cache";

function parseArgs(argv) {
  const opts = {
    minPosts: DEFAULT_MIN_POSTS,
    maxCandidates: DEFAULT_MAX_CANDIDATES,
    cacheDir: DEFAULT_CACHE_DIR,
    noCache: false,
    verbose: false,
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
    "  --company         Korean company name (required)",
    "  --ticker          6-digit KRX ticker (required)",
    "  --output          Output JSON path (required)",
    "  --min-posts N     Minimum qualifying post count (default 3)",
    "  --max-candidates  Max bloggers to evaluate (default 10)",
    "  --cache-dir PATH  Cache root (default .tmp/naver-blog-cache)",
    "  --no-cache        Skip cache lookup for today",
    "  --verbose         Print debug output",
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

function dedupeBlogIds(searchResults) {
  const byId = new Map();
  for (const r of searchResults) {
    if (!r.blogId) continue;
    if (!byId.has(r.blogId)) byId.set(r.blogId, r);
  }
  return byId;
}

function mentionsCompany(text, company, ticker) {
  if (!text) return false;
  const haystack = text.toLowerCase();
  if (company && haystack.includes(company.toLowerCase())) return true;
  if (ticker && haystack.includes(ticker.toLowerCase())) return true;
  return false;
}

function rankBloggers(bloggers) {
  return bloggers.slice().sort((a, b) => {
    if (b.relevantPostCount !== a.relevantPostCount) {
      return b.relevantPostCount - a.relevantPostCount;
    }
    const ad = a.latestPostDate || "";
    const bd = b.latestPostDate || "";
    if (bd !== ad) return bd.localeCompare(ad);
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

  const queries = [
    `${opts.company} 투자 분석`,
    `${opts.company} 실적`,
    opts.ticker,
  ];

  const allResults = [];
  for (const q of queries) {
    if (opts.verbose) console.error(`[search] ${q}`);
    try {
      const hits = browseNaver.searchNaverBlog(q, { max: 10 });
      if (opts.verbose) console.error(`  → ${hits.length} hit(s)`);
      allResults.push(...hits);
    } catch (err) {
      console.error(`[search-failed] "${q}": ${err.message}`);
    }
  }

  const candidateMap = dedupeBlogIds(allResults);
  const candidates = Array.from(candidateMap.keys()).slice(0, opts.maxCandidates);

  const bloggers = [];
  let skipped = 0;
  for (const blogId of candidates) {
    if (opts.verbose) console.error(`[evaluate] ${blogId}`);
    let posts = [];
    try {
      posts = browseNaver.readBlogPostList(blogId, { max: 20 });
    } catch (err) {
      console.error(`[postlist-failed] ${blogId}: ${err.message}`);
      skipped += 1;
      continue;
    }
    if (!posts.length) {
      skipped += 1;
      continue;
    }

    const relevant = posts.filter((p) => mentionsCompany(p.title, opts.company, opts.ticker));
    const latestPostDate = posts
      .map((p) => p.date)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || null;

    bloggers.push({
      blogId,
      displayName: null,
      blogTitle: null,
      subscriberCount: null,
      relevantPostCount: relevant.length,
      latestPostDate,
      categories: [],
      profileSnippet: null,
    });
  }

  const qualified = bloggers.filter((b) => b.relevantPostCount >= opts.minPosts);
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
