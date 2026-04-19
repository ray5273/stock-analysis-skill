#!/usr/bin/env node

// Reusable generic-web browse helpers. Node stdlib only.
//
// Sibling of kr-naver-browse. Use this for arbitrary (non-Naver) public web
// pages and direct PDF downloads. The gstack browse binary is vendored by
// kr-naver-browse — this module does not vendor its own copy.

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const zlib = require("zlib");
const { URL } = require("url");
const { execFileSync } = require("child_process");

const DEFAULT_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
const REQUEST_DELAY_MS = 1_000;
const EMPTY_RETRY_WAIT_MS = 5_000;
const MAX_BUFFER = 5 * 1024 * 1024;
const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

let cachedBin = null;
let lastRequestAt = 0;

// ---------------------------------------------------------------------------
// Binary resolution (shared layout with kr-naver-browse, but we do not
// require() that module to avoid coupling).
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

function assertGstackBrowseBinary(binPath) {
  if (!binPath || !fs.existsSync(binPath)) return false;
  if (process.platform !== "win32") {
    try {
      fs.accessSync(binPath, fs.constants.X_OK);
    } catch {
      return false;
    }
  }
  try {
    const out = execFileSync(binPath, ["--help"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5_000,
      maxBuffer: MAX_BUFFER,
    });
    return /gstack browse|Usage:\s*browse/i.test(out);
  } catch {
    return false;
  }
}

function resolveBrowseBinary() {
  if (cachedBin) return cachedBin;

  if (process.env.GSTACK_BROWSE_BIN) {
    const explicit = path.resolve(process.env.GSTACK_BROWSE_BIN);
    if (assertGstackBrowseBinary(explicit)) {
      cachedBin = explicit;
      return cachedBin;
    }
    throw new Error(
      `GSTACK_BROWSE_BIN is not a usable gstack browse binary: ${explicit}`
    );
  }

  // Source-repo layout: skills/kr-web-browse/scripts → ../../kr-naver-browse/vendor/...
  const siblingVendor = path.join(
    __dirname,
    "..",
    "..",
    "kr-naver-browse",
    "vendor",
    "gstack",
    "browse",
    "dist"
  );
  const siblingBin = firstExecutableInDir(siblingVendor, "browse");
  if (assertGstackBrowseBinary(siblingBin)) {
    cachedBin = siblingBin;
    return cachedBin;
  }

  // Installed-skill fallbacks (Claude / Codex homes).
  if (process.platform === "darwin" || process.platform === "linux") {
    const codexHome =
      process.env.CODEX_HOME || path.join(process.env.HOME || "", ".codex");
    const claudeHome =
      process.env.CLAUDE_HOME || path.join(process.env.HOME || "", ".claude");
    const installFallbacks = [
      path.join(
        claudeHome,
        "skills",
        "kr-naver-browse",
        "vendor",
        "gstack",
        "browse",
        "dist"
      ),
      path.join(
        codexHome,
        "skills",
        "kr-naver-browse",
        "vendor",
        "gstack",
        "browse",
        "dist"
      ),
      path.join(claudeHome, "skills", "gstack", "browse", "dist"),
      path.join(codexHome, "skills", "gstack", "browse", "dist"),
    ];
    for (const dir of installFallbacks) {
      const candidate = firstExecutableInDir(dir, "browse");
      if (assertGstackBrowseBinary(candidate)) {
        cachedBin = candidate;
        return cachedBin;
      }
    }
  }

  throw new Error(
    "gstack browse binary not found or not executable.\n" +
      "kr-web-browse reuses the binary vendored by kr-naver-browse.\n" +
      "Fix: run  bash scripts/install-skill.sh kr-naver-browse  or\n" +
      "      bash scripts/install-claude-skill.sh kr-naver-browse  first,\n" +
      "or set GSTACK_BROWSE_BIN to an existing gstack browse binary path."
  );
}

// ---------------------------------------------------------------------------
// Low-level browse command
// ---------------------------------------------------------------------------

function sleepSync(ms) {
  if (ms <= 0) return;
  const end = Date.now() + ms;
  try {
    execFileSync("sh", ["-c", `sleep ${(ms / 1000).toFixed(3)}`], {
      stdio: "ignore",
    });
    return;
  } catch {
    while (Date.now() < end) {
      /* spin */
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
      `${bin} ${args.join(" ")} failed: ${err.message}${stderr ? `\n${stderr}` : ""}`
    );
    wrapped.cause = err;
    throw wrapped;
  }
}

function isFatalBrowseError(err) {
  const message = err && err.message ? err.message : "";
  return /gstack browse (?:binary|runtime) not found|GSTACK_BROWSE_BIN|not a usable gstack browse binary|ENOENT/.test(
    message
  );
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
  if (!url) return null;
  let text = "";
  try {
    text = browseTextOnce(url, opts);
  } catch (err) {
    if (isFatalBrowseError(err)) throw err;
    if (opts.verbose) console.error(`[browse-web] first attempt failed: ${err.message}`);
  }
  if (text && text.length > 50) return text;

  sleepSync(EMPTY_RETRY_WAIT_MS);
  try {
    text = browseTextOnce(url, opts);
  } catch (err) {
    if (isFatalBrowseError(err)) throw err;
    if (opts.verbose) console.error(`[browse-web] retry failed: ${err.message}`);
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
  if (!url) return null;
  let raw = "";
  try {
    raw = browseLinksOnce(url, opts);
  } catch (err) {
    if (isFatalBrowseError(err)) throw err;
    if (opts.verbose) console.error(`[browse-web] links first attempt failed: ${err.message}`);
  }
  if (raw && raw.length > 50) return raw;

  sleepSync(EMPTY_RETRY_WAIT_MS);
  try {
    raw = browseLinksOnce(url, opts);
  } catch (err) {
    if (isFatalBrowseError(err)) throw err;
    if (opts.verbose) console.error(`[browse-web] links retry failed: ${err.message}`);
    return null;
  }
  return raw && raw.length > 50 ? raw : null;
}

// ---------------------------------------------------------------------------
// PDF / binary download via Node stdlib
// ---------------------------------------------------------------------------

function downloadFile(url, destPath, opts = {}) {
  const maxRedirects = opts.maxRedirects != null ? opts.maxRedirects : 5;
  const timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : DOWNLOAD_TIMEOUT_MS;
  const headers = { "User-Agent": DEFAULT_UA, Accept: "*/*", ...(opts.headers || {}) };

  return new Promise((resolve, reject) => {
    const visited = new Set();

    function request(targetUrl, redirectsLeft) {
      if (visited.has(targetUrl)) {
        reject(new Error(`Redirect loop while downloading ${url}`));
        return;
      }
      visited.add(targetUrl);

      let parsed;
      try {
        parsed = new URL(targetUrl);
      } catch (err) {
        reject(new Error(`Invalid URL: ${targetUrl}`));
        return;
      }

      const lib = parsed.protocol === "http:" ? http : https;
      const reqOpts = {
        method: "GET",
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname + parsed.search,
        headers: { ...headers, "Accept-Encoding": "gzip, deflate" },
        timeout: timeoutMs,
      };

      const req = lib.request(reqOpts, (res) => {
        const status = res.statusCode || 0;

        if (
          status >= 300 &&
          status < 400 &&
          res.headers.location &&
          redirectsLeft > 0
        ) {
          res.resume();
          const next = new URL(res.headers.location, targetUrl).toString();
          request(next, redirectsLeft - 1);
          return;
        }

        if (status >= 400) {
          res.resume();
          reject(
            new Error(`HTTP ${status} while downloading ${targetUrl}`)
          );
          return;
        }

        const encoding = (res.headers["content-encoding"] || "").toLowerCase();
        let stream = res;
        if (encoding === "gzip") {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === "deflate") {
          stream = res.pipe(zlib.createInflate());
        }

        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        const tmp = `${destPath}.part`;
        const out = fs.createWriteStream(tmp);

        stream.on("error", (err) => {
          out.destroy();
          try {
            fs.unlinkSync(tmp);
          } catch {}
          reject(err);
        });
        out.on("error", (err) => {
          try {
            fs.unlinkSync(tmp);
          } catch {}
          reject(err);
        });
        out.on("finish", () => {
          try {
            fs.renameSync(tmp, destPath);
            resolve({
              path: destPath,
              bytes: fs.statSync(destPath).size,
              contentType: res.headers["content-type"] || null,
              status,
            });
          } catch (err) {
            reject(err);
          }
        });

        stream.pipe(out);
      });

      req.on("timeout", () => {
        req.destroy(new Error(`Timeout after ${timeoutMs}ms downloading ${targetUrl}`));
      });
      req.on("error", (err) => reject(err));
      req.end();
    }

    request(url, maxRedirects);
  });
}

// ---------------------------------------------------------------------------
// Simple HTML link extractor — many generic list pages render fine through
// the gstack `links` command, but fallbacks are useful when the page ships
// its anchors inside the raw HTML.
// ---------------------------------------------------------------------------

function extractAnchors(html) {
  if (!html) return [];
  const out = [];
  const rx = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = rx.exec(html)) !== null) {
    const href = m[1];
    const text = m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!href) continue;
    out.push({ href, text });
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

function runSmokeTest() {
  try {
    const bin = resolveBrowseBinary();
    console.log(`browse binary: ${bin}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const url = "https://example.com";
  console.log(`Fetching text from: ${url}`);
  const text = browseText(url);
  if (!text || !/Example Domain/i.test(text)) {
    console.error(
      "Smoke test failed: did not see 'Example Domain' in browseText output."
    );
    process.exit(1);
  }
  console.log("OK - browseText returned expected content.");

  const tmp = path.join(
    process.env.TMPDIR || "/tmp",
    `kr-web-browse-smoke-${Date.now()}.html`
  );
  console.log(`Downloading: ${url} -> ${tmp}`);
  downloadFile(url, tmp)
    .then((info) => {
      console.log(`OK - downloaded ${info.bytes} bytes (${info.contentType}).`);
      try {
        fs.unlinkSync(tmp);
      } catch {}
    })
    .catch((err) => {
      console.error(`Smoke test download failed: ${err.message}`);
      process.exit(1);
    });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes("--test")) {
    runSmokeTest();
  } else {
    console.log("browse-web.js - generic web browse + download helpers.");
    console.log("Usage: node browse-web.js --test");
    console.log("This module is designed to be required by other skills.");
  }
}

module.exports = {
  resolveBrowseBinary,
  browseText,
  browseLinks,
  downloadFile,
  extractAnchors,
};
