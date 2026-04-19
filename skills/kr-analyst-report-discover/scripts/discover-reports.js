#!/usr/bin/env node

// kr-analyst-report-discover — discover sell-side analyst reports for a KRX
// ticker from Hankyung Consensus (primary) and Naver Pay Research (fallback).
// Writes a dated JSON index to .tmp/analyst-report-cache/index/<ticker>/<YYYY-MM-DD>.json.

const fs = require("fs");
const path = require("path");

const web = require("../../kr-web-browse/scripts/browse-web.js");
const hankyung = require("./lib/hankyung.js");
const naver = require("./lib/naver-research.js");

const DEFAULT_LOOKBACK_DAYS = 365;
const DEFAULT_CACHE_DIR = ".tmp/analyst-report-cache";
const MAX_PAGES = 50;

function parseArgs(argv) {
  const args = {
    company: null,
    ticker: null,
    lookbackDays: DEFAULT_LOOKBACK_DAYS,
    source: "hankyung",
    maxReports: 0,
    cacheDir: DEFAULT_CACHE_DIR,
    noCache: false,
    noProbeAuth: false,
    output: null,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i];
    switch (token) {
      case "--company":
        args.company = next();
        break;
      case "--ticker":
        args.ticker = next();
        break;
      case "--lookback-days":
        args.lookbackDays = parseInt(next(), 10);
        break;
      case "--source":
        args.source = next();
        break;
      case "--max-reports":
        args.maxReports = parseInt(next(), 10);
        break;
      case "--cache-dir":
        args.cacheDir = next();
        break;
      case "--no-cache":
        args.noCache = true;
        break;
      case "--no-probe-auth":
        args.noProbeAuth = true;
        break;
      case "--output":
        args.output = next();
        break;
      case "--verbose":
        args.verbose = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown argument: ${token}`);
        process.exit(1);
    }
  }
  return args;
}

function printHelp() {
  console.log(
    `Usage: node discover-reports.js --company "<name>" --ticker <6-digit> [options]\n` +
      `\n` +
      `Required:\n` +
      `  --company <name>          KRX-listed company name (Korean).\n` +
      `  --ticker <6-digit>        KRX ticker code (no .KS/.KQ suffix).\n` +
      `\n` +
      `Optional:\n` +
      `  --lookback-days <N>       Default ${DEFAULT_LOOKBACK_DAYS}.\n` +
      `  --source <s>              hankyung (default) | naver | both.\n` +
      `  --max-reports <N>         0 = unlimited (default).\n` +
      `  --cache-dir <path>        Default ${DEFAULT_CACHE_DIR}.\n` +
      `  --output <path>           Override output path.\n` +
      `  --no-cache                Ignore today's cached index.\n` +
      `  --no-probe-auth           Skip the per-PDF auth probe.\n` +
      `  --verbose                 Extra logging.\n`
  );
}

function todaySeoulIso() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const seoul = new Date(utc + 9 * 60 * 60_000);
  const y = seoul.getUTCFullYear();
  const m = String(seoul.getUTCMonth() + 1).padStart(2, "0");
  const d = String(seoul.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function subtractDaysIso(iso, days) {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const base = Date.UTC(y, m - 1, d);
  const sub = new Date(base - days * 24 * 60 * 60 * 1000);
  const yy = sub.getUTCFullYear();
  const mm = String(sub.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(sub.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function isoBefore(a, b) {
  return a < b;
}

function resolveOutputPath(args, discoveredAt) {
  if (args.output) return args.output;
  return path.join(
    args.cacheDir,
    "index",
    args.ticker,
    `${discoveredAt}.json`
  );
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function probePdfAuth(url, { verbose } = {}) {
  if (!url) return { requiresAuth: false, ok: false };
  return new Promise((resolve) => {
    const { URL } = require("url");
    const https = require("https");
    const http = require("http");
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve({ requiresAuth: false, ok: false });
      return;
    }
    const lib = parsed.protocol === "http:" ? http : https;
    const req = lib.request(
      {
        method: "GET",
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname + parsed.search,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
          Range: "bytes=0-4095",
          Accept: "*/*",
        },
        timeout: 15_000,
      },
      (res) => {
        const status = res.statusCode || 0;
        const contentType = (res.headers["content-type"] || "").toLowerCase();
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          if (body.length < 1024) body += chunk;
        });
        res.on("end", () => {
          if (status === 401 || status === 403) {
            resolve({ requiresAuth: true, ok: false });
            return;
          }
          if (status >= 300 && status < 400) {
            // Redirects to login pages usually carry text/html targets.
            const loc = res.headers.location || "";
            if (/login|로그인/i.test(loc)) {
              resolve({ requiresAuth: true, ok: false });
              return;
            }
            resolve({ requiresAuth: false, ok: true });
            return;
          }
          if (status >= 400) {
            resolve({ requiresAuth: false, ok: false });
            return;
          }
          if (contentType.includes("text/html")) {
            if (/로그인|login/i.test(body)) {
              resolve({ requiresAuth: true, ok: false });
              return;
            }
            // HTML but no login wall — unusual, but not auth-gated.
            resolve({ requiresAuth: false, ok: false });
            return;
          }
          resolve({ requiresAuth: false, ok: true });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", (err) => {
      if (verbose) console.error(`[probe] ${url} ${err.message}`);
      resolve({ requiresAuth: false, ok: false });
    });
    req.end();
  });
}

async function scrapeHankyung({ company, startDate, endDate, verbose }) {
  const reports = [];
  let pagesScraped = 0;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = hankyung.buildListUrl({
      company,
      startDate,
      endDate,
      page,
    });
    if (verbose) console.error(`[hankyung] page ${page}: ${url}`);
    const linksText = web.browseLinks(url, { verbose });
    const plainText = web.browseText(url, { verbose });
    pagesScraped += 1;
    if (!linksText && !plainText) {
      if (verbose) console.error(`[hankyung] page ${page}: empty response`);
      break;
    }
    const pageReports = hankyung.parseListPage(linksText || "", plainText || "");
    if (pageReports.length === 0) {
      if (verbose) console.error(`[hankyung] page ${page}: zero rows parsed`);
      break;
    }

    let crossedWindow = false;
    for (const r of pageReports) {
      if (r.publishedDate && isoBefore(r.publishedDate, startDate)) {
        crossedWindow = true;
        continue;
      }
      reports.push(r);
    }
    if (crossedWindow) break;
  }
  return { reports, pagesScraped };
}

async function scrapeNaver({ ticker, startDate, endDate, verbose }) {
  const reports = [];
  let pagesScraped = 0;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = naver.buildListUrl({ ticker, startDate, endDate, page });
    if (verbose) console.error(`[naver] page ${page}: ${url}`);
    const linksText = web.browseLinks(url, { verbose });
    const plainText = web.browseText(url, { verbose });
    pagesScraped += 1;
    if (!linksText && !plainText) break;
    const pageReports = naver.parseListPage(linksText || "", plainText || "");
    if (pageReports.length === 0) break;

    let crossedWindow = false;
    for (const r of pageReports) {
      if (r.publishedDate && isoBefore(r.publishedDate, startDate)) {
        crossedWindow = true;
        continue;
      }
      reports.push(r);
    }
    if (crossedWindow) break;
  }
  return { reports, pagesScraped };
}

function normalizeTitleForDedup(s) {
  if (!s) return "";
  return String(s)
    .replace(/\s+/g, " ")
    .replace(/^\s*\[[^\]]+\]\s*/g, "")
    .trim()
    .toLowerCase();
}

function dedupe(rows) {
  const seen = new Map();
  const out = [];
  for (const r of rows) {
    const key = `${r.broker || ""}|${r.publishedDate || ""}|${normalizeTitleForDedup(r.title)}`;
    if (seen.has(key)) {
      const prior = seen.get(key);
      // Prefer Hankyung over Naver on conflict.
      if (prior.sourceSite === "hankyung") continue;
      // Replace the prior Naver row with the Hankyung one.
      const priorIndex = out.indexOf(prior);
      if (r.sourceSite === "hankyung" && priorIndex >= 0) {
        out[priorIndex] = r;
        seen.set(key, r);
        continue;
      }
      continue;
    }
    seen.set(key, r);
    out.push(r);
  }
  return out;
}

function sortReports(rows) {
  return rows.slice().sort((a, b) => {
    const ad = a.publishedDate || "";
    const bd = b.publishedDate || "";
    if (ad !== bd) return ad > bd ? -1 : 1;
    const ab = a.broker || "";
    const bb = b.broker || "";
    if (ab !== bb) return ab < bb ? -1 : 1;
    return a.reportId < b.reportId ? -1 : a.reportId > b.reportId ? 1 : 0;
  });
}

async function run(args) {
  if (!args.company || !args.ticker) {
    console.error("Both --company and --ticker are required.");
    process.exit(1);
  }
  if (!["hankyung", "naver", "both"].includes(args.source)) {
    console.error(`--source must be hankyung | naver | both (got: ${args.source})`);
    process.exit(1);
  }

  const discoveredAt = todaySeoulIso();
  const windowEnd = discoveredAt;
  const windowStart = subtractDaysIso(windowEnd, args.lookbackDays);
  const outputPath = resolveOutputPath(args, discoveredAt);

  if (!args.noCache && fs.existsSync(outputPath)) {
    if (args.verbose) console.error(`[cache] reusing ${outputPath}`);
    console.log(outputPath);
    return;
  }

  const warnings = [];
  let allReports = [];
  let primaryReports = [];
  let fallbackReports = [];
  let primaryPages = 0;
  let fallbackPages = 0;
  let fallbackReason = null;

  if (args.source === "hankyung" || args.source === "both") {
    try {
      const res = await scrapeHankyung({
        company: args.company,
        startDate: windowStart,
        endDate: windowEnd,
        verbose: args.verbose,
      });
      primaryReports = res.reports;
      primaryPages = res.pagesScraped;
    } catch (err) {
      warnings.push(`hankyung scrape failed: ${err.message}`);
      fallbackReason = "hankyung scrape error";
    }
  }

  const needFallback =
    args.source === "naver" ||
    args.source === "both" ||
    (args.source === "hankyung" && primaryReports.length === 0);

  if (needFallback) {
    if (args.source === "hankyung" && primaryReports.length === 0 && !fallbackReason) {
      fallbackReason = "hankyung returned zero rows";
    }
    try {
      const res = await scrapeNaver({
        ticker: args.ticker,
        startDate: windowStart,
        endDate: windowEnd,
        verbose: args.verbose,
      });
      fallbackReports = res.reports;
      fallbackPages = res.pagesScraped;
    } catch (err) {
      warnings.push(`naver scrape failed: ${err.message}`);
    }
  }

  if (args.source === "naver") {
    allReports = fallbackReports;
  } else if (args.source === "both") {
    allReports = dedupe([...primaryReports, ...fallbackReports]);
  } else {
    allReports = primaryReports.length > 0 ? primaryReports : fallbackReports;
  }

  if (allReports.length === 0) {
    console.error(
      "Discovery returned zero reports. Either the sources are empty for this ticker/window, " +
        "or the page markup changed and the parsers need updating. Not writing an empty index."
    );
    process.exit(2);
  }

  if (args.maxReports > 0 && allReports.length > args.maxReports) {
    allReports = allReports.slice(0, args.maxReports);
  }

  if (!args.noProbeAuth) {
    for (const r of allReports) {
      if (!r.pdfUrl) continue;
      const probe = await probePdfAuth(r.pdfUrl, { verbose: args.verbose });
      if (probe.requiresAuth) {
        r.requiresAuth = true;
        r.pdfUrl = null;
      }
    }
  }

  allReports = sortReports(allReports);

  const countsRequiresAuth = allReports.filter((r) => r.requiresAuth).length;
  const countsWithPdf = allReports.filter((r) => r.pdfUrl).length;

  const payload = {
    company: args.company,
    ticker: args.ticker,
    discoveredAt,
    lookbackDays: args.lookbackDays,
    windowStart,
    windowEnd,
    source:
      args.source === "both"
        ? "both"
        : allReports.length === primaryReports.length && primaryReports.length > 0
          ? "hankyung"
          : args.source,
    fallbackUsed:
      args.source === "hankyung" &&
      primaryReports.length === 0 &&
      fallbackReports.length > 0,
    reports: allReports,
    meta: {
      queriesRun:
        (args.source === "hankyung" || args.source === "both" ? 1 : 0) +
        (args.source === "naver" || args.source === "both" || needFallback ? 1 : 0),
      pagesScraped: primaryPages + fallbackPages,
      counts: {
        total: allReports.length,
        withPdf: countsWithPdf,
        requiresAuth: countsRequiresAuth,
      },
      warnings,
      fallbackReason,
    },
  };

  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(outputPath);
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  run(args).catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  todaySeoulIso,
  subtractDaysIso,
  dedupe,
  sortReports,
  normalizeTitleForDedup,
};
