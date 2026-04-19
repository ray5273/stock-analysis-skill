#!/usr/bin/env node

// kr-analyst-report-fetch — download PDFs from a kr-analyst-report-discover
// index, extract plain text via the shared pypdf helper from
// kr-stock-dart-analysis, and write a summary JSON.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const web = require("../../kr-web-browse/scripts/browse-web.js");

const DEFAULT_CACHE_DIR = ".tmp/analyst-report-cache";
const REQUEST_DELAY_MS = 1_000;
const EXTRACT_SCRIPT = path.resolve(
  __dirname,
  "..",
  "..",
  "kr-stock-dart-analysis",
  "scripts",
  "extract-pdf-text.py"
);

let lastDownloadAt = 0;

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    cacheDir: DEFAULT_CACHE_DIR,
    maxReports: 0,
    noCache: false,
    python3: "python3",
    verbose: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i];
    switch (token) {
      case "--input":
        args.input = next();
        break;
      case "--output":
        args.output = next();
        break;
      case "--cache-dir":
        args.cacheDir = next();
        break;
      case "--max-reports":
        args.maxReports = parseInt(next(), 10);
        break;
      case "--no-cache":
        args.noCache = true;
        break;
      case "--python3":
        args.python3 = next();
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
    `Usage: node fetch-reports.js --input <index.json> [options]\n` +
      `\n` +
      `Required:\n` +
      `  --input <path>           Output of kr-analyst-report-discover.\n` +
      `\n` +
      `Optional:\n` +
      `  --output <path>          Override output path.\n` +
      `  --cache-dir <path>       Default ${DEFAULT_CACHE_DIR}.\n` +
      `  --max-reports <N>        0 = unlimited (default).\n` +
      `  --no-cache               Ignore cached PDFs and re-download.\n` +
      `  --python3 <bin>          Default python3.\n` +
      `  --verbose                Extra logging.\n`
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

function sleepSync(ms) {
  if (ms <= 0) return;
  try {
    execFileSync("sh", ["-c", `sleep ${(ms / 1000).toFixed(3)}`], {
      stdio: "ignore",
    });
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* spin */
    }
  }
}

function enforceDownloadDelay() {
  const since = Date.now() - lastDownloadAt;
  if (since < REQUEST_DELAY_MS) {
    sleepSync(REQUEST_DELAY_MS - since);
  }
  lastDownloadAt = Date.now();
}

function extractText(pdfPath, txtPath, python3, { verbose }) {
  if (!fs.existsSync(EXTRACT_SCRIPT)) {
    throw new Error(
      `Shared PDF extractor missing: ${EXTRACT_SCRIPT}. Install kr-stock-dart-analysis first.`
    );
  }
  try {
    execFileSync(
      python3,
      [EXTRACT_SCRIPT, "--input", pdfPath, "--output", txtPath],
      {
        stdio: verbose ? ["ignore", "inherit", "inherit"] : ["ignore", "pipe", "pipe"],
        timeout: 120_000,
      }
    );
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString("utf8") : "";
    throw new Error(
      `extract-pdf-text.py failed: ${err.message}${stderr ? `\n${stderr}` : ""}`
    );
  }
}

function measureText(txtPath) {
  if (!fs.existsSync(txtPath)) return { pages: 0, textLength: 0 };
  const buf = fs.readFileSync(txtPath);
  const text = buf.toString("utf8");
  const pages = text
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0).length;
  return { pages, textLength: Buffer.byteLength(text, "utf8") };
}

async function processReport(report, { ticker, cacheDir, noCache, python3, verbose }) {
  const out = {
    reportId: report.reportId,
    broker: report.broker,
    analyst: report.analyst,
    publishedDate: report.publishedDate,
    title: report.title,
    rating: report.rating,
    ratingRaw: report.ratingRaw,
    targetPrice: report.targetPrice,
    currency: report.currency,
    sourceSite: report.sourceSite,
    landingUrl: report.landingUrl,
    pdfUrl: report.pdfUrl,
    textPath: null,
    pages: 0,
    textLength: 0,
    extractionOk: false,
    error: null,
    fromCache: false,
    downloadedThisRun: false,
  };

  if (report.requiresAuth) {
    out.error = "login-gated per discover index";
    return out;
  }
  if (!report.pdfUrl) {
    out.error = "no PDF URL in index";
    return out;
  }

  const textDir = path.resolve(path.join(cacheDir, "text", ticker));
  fs.mkdirSync(textDir, { recursive: true });
  const txtPath = path.join(textDir, `${report.reportId}.txt`);

  const haveCache = !noCache && fs.existsSync(txtPath);

  if (haveCache) {
    const measured = measureText(txtPath);
    out.textPath = txtPath;
    out.pages = measured.pages;
    out.textLength = measured.textLength;
    out.extractionOk = measured.textLength > 0;
    out.fromCache = true;
    if (!out.extractionOk) {
      out.error = "pypdf returned empty — likely image-only PDF";
    }
    return out;
  }

  // Download to a scratch tempfile; delete after extract.
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "analyst-pdf-"));
  const pdfPath = path.join(scratchDir, `${report.reportId}.pdf`);

  enforceDownloadDelay();
  try {
    const info = await web.downloadFile(report.pdfUrl, pdfPath, {
      timeoutMs: 90_000,
    });
    const contentType = (info.contentType || "").toLowerCase();
    if (contentType.includes("text/html")) {
      out.error = "content-type text/html — probable login wall";
      cleanupScratch(scratchDir);
      return out;
    }
    out.downloadedThisRun = true;
  } catch (err) {
    out.error = `download failed: ${err.message}`;
    cleanupScratch(scratchDir);
    return out;
  }

  // Extract, then delete the PDF — we only keep the .txt.
  try {
    extractText(pdfPath, txtPath, python3, { verbose });
  } catch (err) {
    out.error = err.message;
    cleanupScratch(scratchDir);
    return out;
  }
  cleanupScratch(scratchDir);

  const measured = measureText(txtPath);
  out.textPath = txtPath;
  out.pages = measured.pages;
  out.textLength = measured.textLength;
  out.extractionOk = measured.textLength > 0;
  if (!out.extractionOk) {
    out.error = "pypdf returned empty — likely image-only PDF";
  }
  return out;
}

function cleanupScratch(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

async function run(args) {
  if (!args.input) {
    console.error("--input is required.");
    process.exit(1);
  }
  if (!fs.existsSync(args.input)) {
    console.error(`Input file not found: ${args.input}`);
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(args.input, "utf8"));
  const ticker = index.ticker;
  if (!ticker) {
    console.error("Input index is missing `ticker` — cannot compute cache path.");
    process.exit(1);
  }

  const discoveredAt = index.discoveredAt;
  const fetchedAt = todaySeoulIso();
  const outputPath =
    args.output ||
    path.join(args.cacheDir, "extracted", ticker, `${fetchedAt}.json`);

  let reports = index.reports || [];
  if (args.maxReports > 0 && reports.length > args.maxReports) {
    reports = reports.slice(0, args.maxReports);
  }

  const out = [];
  const warnings = [];
  let skippedAuth = 0;
  let downloaded = 0;
  let extracted = 0;
  let failed = 0;
  let fromCache = 0;

  for (const r of reports) {
    if (args.verbose) console.error(`[fetch] ${r.reportId}`);
    const result = await processReport(r, {
      ticker,
      cacheDir: args.cacheDir,
      noCache: args.noCache,
      python3: args.python3,
      verbose: args.verbose,
    });
    out.push(result);

    if (r.requiresAuth) skippedAuth += 1;
    if (result.fromCache) fromCache += 1;
    if (result.downloadedThisRun) downloaded += 1;
    if (result.extractionOk) extracted += 1;
    if (!result.extractionOk && !r.requiresAuth) failed += 1;
    if (result.error && !r.requiresAuth) warnings.push(`${r.reportId}: ${result.error}`);
  }

  // Strip counter-only flags before writing — not schema fields.
  const serialized = out.map((r) => {
    const copy = { ...r };
    delete copy.fromCache;
    delete copy.downloadedThisRun;
    return copy;
  });

  const payload = {
    company: index.company,
    ticker,
    discoveredAt,
    fetchedAt,
    indexPath: path.resolve(args.input),
    reports: serialized,
    meta: {
      attempted: reports.length,
      downloaded,
      extracted,
      skippedAuth,
      failed,
      fromCache,
      warnings,
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
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
  measureText,
  todaySeoulIso,
};
