#!/usr/bin/env node

// fetch-blog-posts.js — read recent posts for a list of bloggers, filter by
// company/ticker mention, and return a posts JSON the summarizer can consume.

const fs = require("fs");
const path = require("path");

const browseNaver = require("../../kr-naver-browse/scripts/browse-naver.js");

const DEFAULT_MAX_POSTS = 5;
const DEFAULT_CACHE_DIR = ".tmp/naver-blog-cache";

function parseArgs(argv) {
  const opts = {
    maxPosts: DEFAULT_MAX_POSTS,
    cacheDir: DEFAULT_CACHE_DIR,
    noCache: false,
    bloggers: [],
    verbose: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--input") opts.input = next();
    else if (arg === "--company") opts.company = next();
    else if (arg === "--ticker") opts.ticker = next();
    else if (arg === "--bloggers") opts.bloggers = next().split(",").map((s) => s.trim()).filter(Boolean);
    else if (arg === "--max-posts") opts.maxPosts = parseInt(next(), 10) || DEFAULT_MAX_POSTS;
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
    "  node fetch-blog-posts.js --input bloggers.json --company <name> --output posts.json",
    "  node fetch-blog-posts.js --company <name> --ticker <code> --bloggers id1,id2 --output posts.json",
    "",
    "Options:",
    "  --input PATH      bloggers JSON from discover-bloggers.js",
    "  --company NAME    company name (required; overrides input if present)",
    "  --ticker CODE     6-digit ticker (required unless in --input)",
    "  --bloggers LIST   comma-separated blogger IDs (if no --input)",
    "  --max-posts N     posts per blogger (default 5)",
    "  --output PATH     output JSON path (required)",
    "  --cache-dir PATH  cache root (default .tmp/naver-blog-cache)",
    "  --no-cache        bypass post cache",
    "  --verbose         debug output",
  ].join("\n");
}

function todayYmd() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function writeJson(p, data) {
  ensureDir(p);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function cachePath(cacheDir, blogId, logNo) {
  return path.join(cacheDir, "posts", blogId, `${logNo}.json`);
}

function loadCachedPost(cacheDir, blogId, logNo) {
  const p = cachePath(cacheDir, blogId, logNo);
  if (!fs.existsSync(p)) return null;
  try {
    return readJson(p);
  } catch {
    return null;
  }
}

function mentionsCompany(text, company, ticker) {
  if (!text) return false;
  const haystack = text.toLowerCase();
  if (company && haystack.includes(company.toLowerCase())) return true;
  if (ticker && haystack.includes(ticker.toLowerCase())) return true;
  return false;
}

function resolveBloggersFromInput(opts) {
  const bloggerIds = new Set();
  let company = opts.company;
  let ticker = opts.ticker;

  if (opts.input) {
    const data = readJson(opts.input);
    company = company || data.company;
    ticker = ticker || data.ticker;
    if (Array.isArray(data.bloggers)) {
      for (const b of data.bloggers) {
        if (b.blogId) bloggerIds.add(b.blogId);
      }
    }
  }
  for (const id of opts.bloggers) bloggerIds.add(id);

  return { bloggerIds: Array.from(bloggerIds), company, ticker };
}

function fetch(opts) {
  if (!opts.output) {
    console.error("Error: --output is required");
    console.error(usage());
    process.exit(1);
  }

  const { bloggerIds, company, ticker } = resolveBloggersFromInput(opts);

  if (!company) {
    console.error("Error: --company is required (or pass --input with a company field)");
    process.exit(1);
  }
  if (!bloggerIds.length) {
    console.error("Error: no bloggers to fetch (pass --input or --bloggers)");
    process.exit(1);
  }

  const fetchedAt = todayYmd();
  const posts = [];
  const errors = [];
  let fromCache = 0;

  for (const blogId of bloggerIds) {
    if (opts.verbose) console.error(`[postlist] ${blogId}`);
    let list = [];
    try {
      list = browseNaver.readBlogPostList(blogId, { max: 20 });
    } catch (err) {
      errors.push({ blogId, logNo: null, message: err.message });
      continue;
    }

    const relevantFromTitle = list.filter((p) => mentionsCompany(p.title, company, ticker));
    // If titles don't match, we still consider the top-5 most recent for body match.
    const toInspect = relevantFromTitle.length >= opts.maxPosts
      ? relevantFromTitle.slice(0, opts.maxPosts)
      : relevantFromTitle.concat(
          list.filter((p) => !relevantFromTitle.includes(p)).slice(0, opts.maxPosts - relevantFromTitle.length)
        );

    const picked = [];
    for (const entry of toInspect) {
      if (picked.length >= opts.maxPosts) break;
      if (!entry.logNo) continue;

      let cached = opts.noCache ? null : loadCachedPost(opts.cacheDir, blogId, entry.logNo);
      if (cached) {
        if (opts.verbose) console.error(`  [cache] ${blogId}/${entry.logNo}`);
        fromCache += 1;
        if (mentionsCompany(cached.title + "\n" + (cached.text || "").slice(0, 500), company, ticker)) {
          picked.push(cached);
        }
        continue;
      }

      let post;
      try {
        post = browseNaver.readBlogPost(blogId, entry.logNo);
      } catch (err) {
        errors.push({ blogId, logNo: entry.logNo, message: err.message });
        continue;
      }
      if (!post) {
        errors.push({ blogId, logNo: entry.logNo, message: "empty text extraction" });
        continue;
      }

      const record = {
        blogId,
        bloggerName: null,
        logNo: entry.logNo,
        title: post.title || entry.title || "",
        date: post.date || entry.date || null,
        url: post.url,
        text: post.text || "",
        cachedAt: fetchedAt,
      };

      if (!opts.noCache) {
        writeJson(cachePath(opts.cacheDir, blogId, entry.logNo), record);
      }

      const head = (record.title || "") + "\n" + (record.text || "").slice(0, 500);
      if (mentionsCompany(head, company, ticker)) {
        picked.push(record);
      }
    }

    picked.sort((a, b) => {
      const ad = a.date || "";
      const bd = b.date || "";
      if (bd !== ad) return bd.localeCompare(ad);
      return String(b.logNo).localeCompare(String(a.logNo));
    });
    posts.push(...picked);
  }

  const output = {
    company,
    ticker: ticker || null,
    fetchedAt,
    posts,
    meta: {
      totalFetched: posts.length,
      fromCache,
      errors,
      generatedBy: "kr-naver-insight/fetch-blog-posts.js",
    },
  };

  writeJson(opts.output, output);
  console.log(
    `Fetched ${posts.length} post(s) from ${bloggerIds.length} blogger(s). Cache hits: ${fromCache}. Output: ${opts.output}`
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
  fetch(opts);
}

if (require.main === module) main();

module.exports = { fetch };
