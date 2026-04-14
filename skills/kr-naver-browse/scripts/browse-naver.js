#!/usr/bin/env node

// Reusable Naver browse helpers. Node stdlib only.
//
// Other KR Naver skills (kr-naver-blogger, kr-naver-insight) require this
// module. It wraps the gstack browse binary and encodes Naver-specific URL
// patterns that are known to render text in headless mode.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const DEFAULT_TIMEOUT_MS = 30_000;
const REQUEST_DELAY_MS = 1_000;
const EMPTY_RETRY_WAIT_MS = 5_000;
const MAX_BUFFER = 5 * 1024 * 1024;
const POST_TEXT_TRUNCATE = 3000;

let cachedBin = null;
let lastRequestAt = 0;

// ---------------------------------------------------------------------------
// Binary resolution
// ---------------------------------------------------------------------------

function executableCandidates(baseName) {
  if (process.platform === "win32") {
    return [`${baseName}.exe`, `${baseName}.cmd`, `${baseName}.bat`, baseName];
  }
  return [baseName];
}

function firstExecutableInDir(dirPath, baseName) {
  if (!dirPath) return null;
  for (const candidateName of executableCandidates(baseName)) {
    const candidate = path.join(dirPath, candidateName);
    if (!fs.existsSync(candidate)) continue;
    if (process.platform === "win32") return candidate;
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

function resolveBrowseBinary() {
  if (cachedBin) return cachedBin;

  if (process.env.GSTACK_BROWSE_BIN) {
    const explicit = path.resolve(process.env.GSTACK_BROWSE_BIN);
    if (fs.existsSync(explicit)) {
      cachedBin = explicit;
      return cachedBin;
    }
  }

  const candidateDirs = [
    path.join(__dirname, "..", "vendor", "gstack", "browse", "dist"),
    path.join(os.homedir(), ".codex", "skills", "gstack", "browse", "dist"),
    path.join(os.homedir(), ".claude", "skills", "gstack", "browse", "dist"),
  ];

  for (const candidateDir of candidateDirs) {
    const candidate = firstExecutableInDir(candidateDir, "browse");
    if (candidate) {
      cachedBin = candidate;
      return cachedBin;
    }
  }

  try {
    const out = execFileSync("browse", ["--help"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 3_000,
    });
    if (/gstack browse/i.test(out)) {
      cachedBin = "browse";
      return cachedBin;
    }
  } catch {
    // ignore
  }

  throw new Error(
    "gstack browse binary not found. Install gstack with:\n" +
      "  git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack\n" +
      "  cd ~/.claude/skills/gstack && ./setup --team\n" +
      "Or reinstall kr-naver-browse so its post-install hook can bootstrap a local runtime,\n" +
      "or set GSTACK_BROWSE_BIN to an absolute path."
  );
}

// ---------------------------------------------------------------------------
// Low-level browse command
// ---------------------------------------------------------------------------

function sleepSync(ms) {
  if (ms <= 0) return;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      execFileSync("sh", ["-c", `sleep ${(ms / 1000).toFixed(3)}`], {
        stdio: "ignore",
      });
      return;
    } catch {
      while (Date.now() < end) {
        /* spin */
      }
      return;
    }
  }
}

function enforceRequestDelay() {
  const since = Date.now() - lastRequestAt;
  if (since < REQUEST_DELAY_MS) {
    sleepSync(REQUEST_DELAY_MS - since);
  }
  lastRequestAt = Date.now();
}

function runBrowse(args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const bin = resolveBrowseBinary();
  try {
    return execFileSync(bin, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER,
    });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString("utf8") : "";
    const wrapped = new Error(
      `browse ${args.join(" ")} failed: ${err.message}${stderr ? `\n${stderr}` : ""}`
    );
    wrapped.cause = err;
    throw wrapped;
  }
}

function browseTextOnce(url, opts) {
  enforceRequestDelay();
  runBrowse(["goto", url], opts);
  try {
    runBrowse(["wait", "--load"], { timeoutMs: 10_000 });
  } catch {
    // non-fatal
  }
  const text = runBrowse(["text"], opts);
  return text ? text.trim() : "";
}

function browseText(url, opts = {}) {
  const normalized = normalizeNaverUrl(url);
  let text = "";
  try {
    text = browseTextOnce(normalized, opts);
  } catch (err) {
    if (opts.verbose) console.error(`[browse-naver] first attempt failed: ${err.message}`);
  }
  if (text && text.length > 50) return text;

  sleepSync(EMPTY_RETRY_WAIT_MS);
  try {
    text = browseTextOnce(normalized, opts);
  } catch (err) {
    if (opts.verbose) console.error(`[browse-naver] retry failed: ${err.message}`);
    return null;
  }
  return text && text.length > 50 ? text : null;
}

function browseLinksOnce(url, opts) {
  enforceRequestDelay();
  runBrowse(["goto", url], opts);
  try {
    runBrowse(["wait", "--load"], { timeoutMs: 10_000 });
  } catch {
    // non-fatal
  }
  const raw = runBrowse(["links"], opts);
  return raw ? raw.trim() : "";
}

function browseLinks(url, opts = {}) {
  const normalized = normalizeNaverUrl(url);
  let raw = "";
  try {
    raw = browseLinksOnce(normalized, opts);
  } catch (err) {
    if (opts.verbose) console.error(`[browse-naver] links first attempt failed: ${err.message}`);
  }
  if (raw && raw.length > 50) return raw;

  sleepSync(EMPTY_RETRY_WAIT_MS);
  try {
    raw = browseLinksOnce(normalized, opts);
  } catch (err) {
    if (opts.verbose) console.error(`[browse-naver] links retry failed: ${err.message}`);
    return null;
  }
  return raw && raw.length > 50 ? raw : null;
}

// ---------------------------------------------------------------------------
// URL normalization
// ---------------------------------------------------------------------------

function normalizeNaverUrl(url) {
  if (!url) return url;
  const trimmed = String(url).trim();

  const pathMatch = trimmed.match(
    /^https?:\/\/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d{6,})/
  );
  if (pathMatch) {
    const [, blogId, logNo] = pathMatch;
    return `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
  }

  if (/^https?:\/\/m\.blog\.naver\.com\//.test(trimmed)) {
    return trimmed.replace(/^https?:\/\/m\.blog\.naver\.com\//, "https://blog.naver.com/");
  }

  return trimmed;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function parseNaverSearchResults(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const urlRegex = /https?:\/\/(?:m\.)?blog\.naver\.com\/[A-Za-z0-9_?=&/-]+/g;
  const results = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i += 1) {
    const matches = lines[i].match(urlRegex);
    if (!matches) continue;

    for (const raw of matches) {
      const normalized = normalizeNaverUrl(raw);
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const ctx = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4));
      const blogIdMatch = normalized.match(/blogId=([A-Za-z0-9_-]+)/);
      const logNoMatch = normalized.match(/logNo=(\d+)/);
      const dateMatch = ctx.join(" ").match(/\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/);

      let title = "";
      for (let j = i - 1; j >= Math.max(0, i - 3); j -= 1) {
        const candidate = lines[j];
        if (!candidate) continue;
        if (/https?:\/\/(?:m\.)?blog\.naver\.com\//.test(candidate)) continue;
        if (candidate.length < 4) continue;
        title = candidate;
        break;
      }

      let snippet = "";
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 3); j += 1) {
        const candidate = lines[j];
        if (!candidate) continue;
        if (/https?:\/\/(?:m\.)?blog\.naver\.com\//.test(candidate)) continue;
        if (candidate.length < 10) continue;
        snippet = candidate;
        break;
      }

      results.push({
        blogId: blogIdMatch ? blogIdMatch[1] : null,
        logNo: logNoMatch ? logNoMatch[1] : null,
        url: normalized,
        title,
        snippet,
        date: dateMatch
          ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
          : null,
      });
    }
  }
  return results;
}

function parsePostList(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const results = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i += 1) {
    const logNoMatch = lines[i].match(/logNo=(\d{6,})/) || lines[i].match(/\/(\d{10,})\b/);
    if (!logNoMatch) continue;
    const logNo = logNoMatch[1];
    if (seen.has(logNo)) continue;
    seen.add(logNo);

    let title = "";
    for (let j = i - 1; j >= Math.max(0, i - 2); j -= 1) {
      if (lines[j] && !/logNo=|blog\.naver/.test(lines[j])) {
        title = lines[j];
        break;
      }
    }

    const ctx = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(" ");
    const dateMatch = ctx.match(/\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/);

    results.push({
      logNo,
      title,
      date: dateMatch
        ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
        : null,
    });
  }
  return results;
}

// Parse the `browse links` output from a blogger's PostList page.
// Each line looks like: "Post title → https://blog.naver.com/PostView.naver?blogId=...&logNo=..."
function parsePostListFromLinks(linksText) {
  if (!linksText) return [];
  const lines = linksText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results = [];
  const seen = new Set();

  for (const line of lines) {
    const logNoMatch = line.match(/logNo=(\d{6,})/);
    if (!logNoMatch) continue;
    const logNo = logNoMatch[1];
    if (seen.has(logNo)) continue;
    seen.add(logNo);

    const arrowIdx = line.indexOf(" → ");
    const title = arrowIdx > 0 ? line.slice(0, arrowIdx).trim() : "";
    if (!title || title.length < 4) continue;

    const dateMatch = line.match(/\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/);

    results.push({
      logNo,
      title,
      date: dateMatch
        ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
        : null,
    });
  }
  return results;
}

function parsePostView(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  let title = "";
  for (const line of lines.slice(0, 30)) {
    if (/^https?:/.test(line)) continue;
    if (/^(Category|Menu|URL|Share|Copy URL|Advertisement)/i.test(line)) continue;
    if (line.length >= 4 && line.length <= 120) {
      title = line;
      break;
    }
  }

  const dateMatch = text.match(/\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/);
  const date = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
    : null;

  const boilerplate = /^(Category|Menu|Share|Copy URL|Advertisement|URL)$/i;
  const body = lines
    .filter((line) => !/^https?:/.test(line))
    .filter((line) => !boilerplate.test(line))
    .join("\n")
    .trim();

  const truncated =
    body.length > POST_TEXT_TRUNCATE ? `${body.slice(0, POST_TEXT_TRUNCATE)}...` : body;

  return { title, date, text: truncated };
}

// Parse `browse links` output from a blogger's PostSearchList page.
// Post links there look like:
//   "title → https://blog.naver.com/<blogId>?Redirect=Log&logNo=<logNo>&from=postView&..."
// We filter to links where the blogId segment matches the target so unrelated
// navigation links (e.g. profile, category) cannot inflate the count.
function parseBlogSearchResults(linksText, blogId) {
  if (!linksText || !blogId) return [];
  const lines = linksText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const escId = blogId.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const rx = new RegExp(
    "https?://(?:m\\.)?blog\\.naver\\.com/" + escId + "(?:\\?|/)[^\\s]*logNo=(\\d{6,})"
  );
  const results = [];
  const seen = new Set();

  for (const line of lines) {
    const m = line.match(rx);
    if (!m) continue;
    const logNo = m[1];
    if (seen.has(logNo)) continue;
    seen.add(logNo);

    const arrowIdx = line.indexOf(" → ");
    const title = arrowIdx > 0 ? line.slice(0, arrowIdx).trim() : "";
    if (!title || title.length < 2) continue;

    results.push({
      blogId,
      logNo,
      title,
      url: `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`,
    });
  }
  return results;
}

// Count pagination links (`javascript:goPage(N)`) in a PostSearchList page.
// Used as a depth indicator / tie-break signal for blogger coverage.
function countBlogSearchPaginationPages(linksText) {
  if (!linksText) return 0;
  const matches = linksText.match(/javascript:goPage\(\d+\)/g);
  return matches ? matches.length : 0;
}

function parseNaverSearchLinks(linksText) {
  if (!linksText) return [];
  const lines = linksText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const blogUrlRegex = /https?:\/\/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d{6,})/;
  const results = [];
  const seen = new Set();

  for (const line of lines) {
    const match = line.match(blogUrlRegex);
    if (!match) continue;
    const [, blogId, logNo] = match;
    const normalized = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const urlIndex = line.indexOf("http");
    const title = urlIndex > 0 ? line.slice(0, urlIndex).replace(/\s+[-–>]+$/, "").trim() : "";
    const dateMatch = line.match(/\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/);

    results.push({
      blogId,
      logNo,
      url: normalized,
      title: title.length >= 4 ? title : "",
      snippet: "",
      date: dateMatch
        ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
        : null,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// High-level helpers
// ---------------------------------------------------------------------------

// Parse Naver's 연관검색어 (related queries) block from a blog search results
// page. Related-query links are the ones pointing back to search.naver.com
// with `sm=tab_she` in the querystring — that's Naver's marker for
// suggestions/related queries surfaced under the search box. Returns
// `[{ text, nickname, wholeQuery }]` where `nickname` is the text after the
// company prefix (or the whole text if it's attached as a suffix), and
// `wholeQuery` is true when no separable nickname could be extracted.
function parseRelatedQueries(linksText, company) {
  if (!linksText || !company) return [];
  const lines = linksText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results = [];
  const seen = new Set();

  for (const line of lines) {
    const arrowIdx = line.indexOf(" → ");
    if (arrowIdx < 0) continue;
    const text = line.slice(0, arrowIdx).trim();
    const url = line.slice(arrowIdx + 3).trim();
    if (!text || !url) continue;
    // Related-search URLs carry sm=tab_she (from the suggestion box).
    // Also require an ssc=tab.nx.all to avoid the "더보기" pagination links.
    if (!/sm=tab_she/.test(url)) continue;
    if (!/ssc=tab\.nx\.all/.test(url)) continue;
    // Text must start with the company name (space-separated OR suffix-attached).
    if (!text.startsWith(company)) continue;
    if (seen.has(text)) continue;
    seen.add(text);

    // Strip company prefix + any whitespace to extract the tail.
    let tail = text.slice(company.length).replace(/^[\s·]+/, "").trim();
    const wholeQuery = tail.length === 0;
    results.push({ text, nickname: wholeQuery ? null : tail, wholeQuery });
    if (results.length >= 20) break;
  }
  return results;
}

// Fetch Naver blog-search related queries for a company name. Returns an array
// of { text, nickname, wholeQuery } objects. May return an empty array if the
// 연관검색어 block is absent (quiet tickers).
function fetchRelatedQueries(company, opts = {}) {
  if (!company) return [];
  const url =
    `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(company)}`;
  const raw = browseLinks(url, opts);
  if (!raw) return [];
  return parseRelatedQueries(raw, company);
}

// Scan a blog post's full page text for references to other Naver blogs.
// Returns a deduped list of blogIds mentioned via `blog.naver.com/<blogId>`
// links (excluding the blogId of the post being read and Naver's own reserved
// segments like PostView / PostList). Used by discover-bloggers.js to mine
// seed blogIds from roundup posts like "3인 3색(무영, 강비호, 문벵이)".
const RESERVED_BLOG_PATH_SEGMENTS = new Set([
  "PostView",
  "PostList",
  "PostSearchList",
  "BuddyBlogList",
  "PostThumbnailList",
  "CategoryList",
  "api",
]);

function extractBlogIdRefs(pageText, { excludeBlogId = null } = {}) {
  if (!pageText) return [];
  const rx = /blog\.naver\.com\/([A-Za-z0-9_-]+)/g;
  const seen = new Set();
  let m;
  while ((m = rx.exec(pageText)) !== null) {
    const id = m[1];
    if (RESERVED_BLOG_PATH_SEGMENTS.has(id)) continue;
    if (excludeBlogId && id === excludeBlogId) continue;
    seen.add(id);
  }
  return [...seen];
}

function searchNaverBlog(query, { max = 10 } = {}) {
  const encoded = encodeURIComponent(query);
  const url = `https://search.naver.com/search.naver?where=blog&query=${encoded}`;

  const linksRaw = browseLinks(url);
  if (linksRaw) {
    const fromLinks = parseNaverSearchLinks(linksRaw);
    if (fromLinks.length > 0) return fromLinks.slice(0, max);
  }

  const text = browseText(url);
  if (!text) return [];
  return parseNaverSearchResults(text).slice(0, max);
}

function readBlogPostList(blogId, { max = 20 } = {}) {
  if (!blogId) return [];
  const url = `https://blog.naver.com/PostList.naver?blogId=${encodeURIComponent(blogId)}&categoryNo=0&from=postList`;

  const linksRaw = browseLinks(url);
  if (linksRaw) {
    const fromLinks = parsePostListFromLinks(linksRaw);
    if (fromLinks.length > 0) return fromLinks.slice(0, max);
  }

  const text = browseText(url);
  if (!text) return [];
  return parsePostList(text).slice(0, max);
}

// Search a single blogger's posts for a query via Naver's PostSearchList.
// Returns { posts: [{logNo, title, url, blogId}], paginationPages }.
// posts are the page-1 results (up to ~10). Callers should filter by title
// mention of the company to strip body-only matches.
function searchWithinBlog(blogId, query, { orderBy = "date" } = {}) {
  if (!blogId || !query) return { posts: [], paginationPages: 0 };
  const encoded = encodeURIComponent(query);
  const url =
    `https://blog.naver.com/PostSearchList.naver` +
    `?blogId=${encodeURIComponent(blogId)}` +
    `&SearchText=${encoded}` +
    `&orderBy=${orderBy}` +
    `&range=all`;

  const raw = browseLinks(url);
  if (!raw) return { posts: [], paginationPages: 0 };

  const posts = parseBlogSearchResults(raw, blogId);
  const paginationPages = countBlogSearchPaginationPages(raw);
  return { posts, paginationPages };
}

// Search Naver News for a query and return an array of headline/snippet strings.
// Used by build-query-set.js to extract trending keywords for a company.
// Returns up to `max` text fragments (default 30). Each element is a plain
// string (headline or snippet), not a structured object — callers tokenize
// the text downstream for keyword frequency analysis.
function searchNaverNews(query, { max = 30, verbose = false } = {}) {
  const encoded = encodeURIComponent(query);
  const url = `https://search.naver.com/search.naver?where=news&query=${encoded}&sort=1`;

  // browseLinks gives "snippet → publisher_url" lines, much cleaner than
  // browseText for news pages (which dumps everything as one blob).
  const raw = browseLinks(url);
  if (raw) {
    const headlines = parseNewsHeadlinesFromLinks(raw);
    if (headlines.length > 0) return headlines.slice(0, max);
  }

  // Fallback to browseText if links failed
  const text = browseText(url);
  if (!text) return [];
  return parseNewsHeadlines(text).slice(0, max);
}

// Parse news article text from the browseLinks output of a Naver news search.
// Each line is "text → url". We keep lines whose URL points to an external
// news publisher (not Naver internal pages) and return the text portion.
function parseNewsHeadlinesFromLinks(linksText) {
  if (!linksText) return [];
  const lines = linksText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results = [];
  const seen = new Set();

  // Naver internal URLs to exclude
  const internalRx =
    /search\.naver\.com|help\.naver\.com|nid\.naver\.com|section\.(blog|cafe)\.naver\.com|pay\.naver\.com|mail\.naver\.com|comic\.naver\.com|book\.naver\.com|kin\.naver\.com|stock\.naver\.com|dict\.naver\.com|calendar\.naver\.com|blog\.naver\.com|cafe\.naver\.com|news\.naver\.com$|chzzk\.naver\.com|point\.pay\.naver\.com|m\.notify\.naver\.com|talks\.naver\.com/;

  for (const line of lines) {
    const arrowIdx = line.indexOf(" → ");
    if (arrowIdx < 0) continue;
    const text = line.slice(0, arrowIdx).trim();
    const url = line.slice(arrowIdx + 3).trim();

    if (!url || !/^https?:/.test(url)) continue;
    // Keep only external publisher URLs (the actual news articles)
    if (internalRx.test(url)) continue;
    if (!text || text.length < 10) continue;
    if (!/[\uac00-\ud7af]/.test(text)) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    results.push(text);
  }
  return results;
}

// Fallback: extract news headlines from the browseText dump of a Naver news
// search page. The text is one big blob, so we split on "Keep에 저장Keep에
// 바로가기" markers which precede each article.
function parseNewsHeadlines(text) {
  if (!text) return [];
  // Split on article boundary markers
  const segments = text.split(/Keep에 저장Keep에 바로가기/);
  const results = [];
  const seen = new Set();

  for (const seg of segments) {
    if (!seg || seg.length < 20) continue;
    // Take the first sentence-like portion (up to first period + space/digit)
    const match = seg.match(/^(.{10,150}?)[.。]\s/);
    const candidate = match ? match[1].trim() : seg.slice(0, 100).trim();
    if (candidate.length < 10) continue;
    if (!/[\uac00-\ud7af]/.test(candidate)) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    results.push(candidate);
  }
  return results;
}

function readBlogPost(blogId, logNo) {
  if (!blogId || !logNo) return null;
  const url = `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(blogId)}&logNo=${encodeURIComponent(logNo)}`;
  const text = browseText(url);
  if (!text) return null;
  const parsed = parsePostView(text);
  if (!parsed) return null;
  return { ...parsed, url, blogId, logNo };
}

// ---------------------------------------------------------------------------
// CLI (smoke test)
// ---------------------------------------------------------------------------

function runSmokeTest() {
  try {
    const bin = resolveBrowseBinary();
    console.log(`browse binary: ${bin}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const query = "현대오토에버 주가";
  console.log(`Searching Naver blogs for: ${query}`);
  const results = searchNaverBlog(query, { max: 3 });
  if (!results.length) {
    console.error("No results returned. Either Naver blocked the request or the parser needs work.");
    process.exit(1);
  }
  for (const result of results) {
    console.log(`- [${result.blogId || "?"}] ${result.title || "(no title)"}`);
    console.log(`  ${result.url}`);
    if (result.date) console.log(`  date: ${result.date}`);
  }
  console.log(`OK - ${results.length} result(s).`);

  console.log(`\nFetching related queries for: 엘앤에프`);
  const related = fetchRelatedQueries("엘앤에프");
  if (!related.length) {
    console.error("No related queries parsed. Parser may need tuning.");
  } else {
    for (const r of related) {
      const tag = r.wholeQuery ? "(whole)" : `nickname=${r.nickname}`;
      console.log(`- ${r.text}  ${tag}`);
    }
    console.log(`OK - ${related.length} related query/queries.`);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes("--test")) {
    runSmokeTest();
  } else {
    console.log("browse-naver.js - Naver blog browse helpers.");
    console.log("Usage: node browse-naver.js --test");
    console.log("This module is designed to be required by other skills.");
  }
}

module.exports = {
  resolveBrowseBinary,
  browseText,
  browseLinks,
  searchNaverBlog,
  searchNaverNews,
  readBlogPostList,
  readBlogPost,
  searchWithinBlog,
  fetchRelatedQueries,
  parseRelatedQueries,
  extractBlogIdRefs,
  normalizeNaverUrl,
  parseNaverSearchResults,
  parseNaverSearchLinks,
  parseNewsHeadlines,
  parseNewsHeadlinesFromLinks,
  parsePostList,
  parsePostListFromLinks,
  parseBlogSearchResults,
  countBlogSearchPaginationPages,
  parsePostView,
};
