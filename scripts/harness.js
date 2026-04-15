#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");

const REQUIRED_SECTIONS = [
  "Decision Frame",
  "Summary",
  "Business and Thesis",
  "Revenue Mix",
  "What The Latest Results Say",
  "Street / Alternative Views",
  "Current Valuation Snapshot",
  "Historical Valuation Bands",
  "Chart and Positioning",
  "Governance and Structure",
  "Catalysts",
  "Risks",
  "Uncomfortable Questions",
  "Decision-Changing Issues",
  "Structured Stance",
  "Follow-up Research Prompts",
];

const VALUATION_KEYWORDS = [
  "price",
  "market cap",
  "per",
  "ev/ebitda",
  "pbr",
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const result = { range: "1y" };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--mode") {
      result.mode = argv[i + 1];
      i += 1;
    } else if (arg === "--ticker") {
      result.ticker = argv[i + 1];
      i += 1;
    } else if (arg === "--company") {
      result.company = argv[i + 1];
      i += 1;
    } else if (arg === "--range") {
      result.range = argv[i + 1];
      i += 1;
    } else if (arg === "--dart-input") {
      result.dartInput = argv[i + 1];
      i += 1;
    } else if (arg === "--bloggers") {
      result.bloggers = argv[i + 1];
      i += 1;
    } else if (arg === "--max-posts") {
      result.maxPosts = argv[i + 1];
      i += 1;
    } else if (arg === "--memo-path") {
      result.memoPath = argv[i + 1];
      i += 1;
    } else if (arg === "--output-dir") {
      result.outputDir = argv[i + 1];
      i += 1;
    } else if (arg === "--report-out") {
      result.reportOut = argv[i + 1];
      i += 1;
    } else if (arg === "--with-blog") {
      result.withBlog = true;
    } else if (arg === "--no-cache") {
      result.noCache = true;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    } else if (arg === "--verbose") {
      result.verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return result;
}

function usage() {
  return [
    "Usage:",
    "  node harness.js --mode chart   --ticker 066970 --company \"LG CNS\" [--range 1y]",
    "  node harness.js --mode dart    --ticker 066970 --company \"LG CNS\" --dart-input export.json",
    "  node harness.js --mode gate    --company \"LG CNS\" [--memo-path path/to/memo.md]",
    "  node harness.js --mode all     --ticker 066970 --company \"LG CNS\" [--dart-input export.json] [--with-blog]",
    "  node harness.js --mode blog    --ticker 066970 --company \"엘앤에프\" [--bloggers id1,id2]",
    "",
    "Modes:",
    "  chart    Fetch OHLCV and generate PNG charts in one step",
    "  dart     Run full DART browser export pipeline (normalize -> extract -> verify -> build-reference)",
    "  gate     Validate a finished memo against structural quality checks",
    "  blog     Discover Naver bloggers -> fetch posts -> summarize insights",
    "  all      Run chart + dart (if --dart-input) + blog (if --with-blog) + gate sequentially",
    "",
    "Options:",
    "  --ticker       KRX ticker code (e.g. 066970)",
    "  --company      Company name (used as directory name)",
    "  --range        Chart data range (default: 1y)",
    "  --dart-input   Path to browser DART export JSON",
    "  --bloggers     Comma-separated Naver blogger IDs (skips discovery)",
    "  --max-posts    Posts per blogger for --mode blog (default 5)",
    "  --with-blog    Include Naver blog pass in --mode all",
    "  --no-cache     Bypass Naver blog cache (forces fresh discovery + post fetches)",
    "  --memo-path    Override memo path (default: analysis-example/kr/<company>/memo.md)",
    "  --output-dir   Override output directory (default: analysis-example/kr/<company>/)",
    "  --report-out   Write JSON quality gate report to this path",
    "  --dry-run      Print what would run without executing",
    "  --verbose      Print each step's stdout",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function resolveOutputDir(opts) {
  if (opts.outputDir) return path.resolve(opts.outputDir);
  return path.join(REPO_ROOT, "analysis-example", "kr", opts.company);
}

function resolveAssetsDir() {
  return path.join(REPO_ROOT, "analysis-example", "kr", "assets");
}

function resolveMemoPath(opts) {
  if (opts.memoPath) return path.resolve(opts.memoPath);
  return path.join(resolveOutputDir(opts), "memo.md");
}

// ---------------------------------------------------------------------------
// Step runner
// ---------------------------------------------------------------------------

function runStep(label, scriptPath, args, opts) {
  if (opts.dryRun) {
    console.log(`  [dry-run] node ${path.relative(REPO_ROOT, scriptPath)} ${args.join(" ")}`);
    return "";
  }

  const start = Date.now();
  try {
    const stdout = execFileSync("node", [scriptPath, ...args], {
      cwd: REPO_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ${label} ... ok (${elapsed}s)`);
    const output = stdout.toString("utf8");
    if (opts.verbose && output.trim()) {
      console.log(output);
    }
    return output;
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`  ${label} ... FAILED (${elapsed}s)`);
    if (err.stderr) {
      console.error(err.stderr.toString("utf8"));
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Chart pipeline
// ---------------------------------------------------------------------------

function runChart(opts) {
  console.log("[chart] Running chart pipeline...");
  const outputDir = resolveOutputDir(opts);
  const assetsDir = resolveAssetsDir();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const chartDataPath = path.join(outputDir, "chart-data.json");
  const pngOut = path.join(assetsDir, `${opts.company}-chart.png`);
  const imagePath = `../assets/${opts.company}-chart.png`;

  const fetchScript = path.join(
    REPO_ROOT, "skills", "kr-stock-analysis", "scripts", "fetch-kr-chart.js"
  );
  const chartScript = path.join(
    REPO_ROOT, "skills", "kr-stock-analysis", "scripts", "chart-basics.js"
  );

  const fetchArgs = ["--ticker", opts.ticker, "--range", opts.range, "--output", chartDataPath];
  if (opts.company) {
    fetchArgs.push("--name", opts.company);
  }

  runStep("[chart 1/2] fetch-kr-chart.js", fetchScript, fetchArgs, opts);

  const chartArgs = ["--input", chartDataPath, "--png-out", pngOut, "--image-path", imagePath];
  const chartOutput = runStep("[chart 2/2] chart-basics.js", chartScript, chartArgs, opts);

  if (!opts.dryRun && chartOutput) {
    const analysisPath = path.join(outputDir, "chart-analysis.md");
    fs.writeFileSync(analysisPath, chartOutput, "utf8");
  }
}

// ---------------------------------------------------------------------------
// DART pipeline
// ---------------------------------------------------------------------------

function runDart(opts) {
  console.log("[dart] Running DART pipeline...");
  const outputDir = resolveOutputDir(opts);
  fs.mkdirSync(outputDir, { recursive: true });

  const dartBase = path.join(REPO_ROOT, "skills", "kr-stock-dart-analysis", "scripts");

  const dartText = path.join(outputDir, "dart-text.txt");
  const dartSections = path.join(outputDir, "dart-sections.json");
  const dartCoverage = path.join(outputDir, "dart-coverage.json");
  const dartReference = path.join(outputDir, "dart-reference.md");
  const dartCache = path.join(outputDir, "dart-cache.json");

  runStep(
    "[dart 1/4] normalize-browser-dart-export.js",
    path.join(dartBase, "normalize-browser-dart-export.js"),
    ["--input", path.resolve(opts.dartInput), "--output", dartText],
    opts
  );

  runStep(
    "[dart 2/4] extract-dart-sections.js",
    path.join(dartBase, "extract-dart-sections.js"),
    ["--input", dartText, "--output", dartSections],
    opts
  );

  runStep(
    "[dart 3/4] verify-dart-coverage.js",
    path.join(dartBase, "verify-dart-coverage.js"),
    ["--input", dartSections, "--output", dartCoverage],
    opts
  );

  const buildArgs = [
    "--sections", dartSections,
    "--coverage", dartCoverage,
    "--output", dartReference,
    "--cache-out", dartCache,
  ];
  if (opts.company) buildArgs.push("--company", opts.company);
  if (opts.ticker) buildArgs.push("--ticker", opts.ticker);

  runStep(
    "[dart 4/4] build-dart-reference.js",
    path.join(dartBase, "build-dart-reference.js"),
    buildArgs,
    opts
  );
}

// ---------------------------------------------------------------------------
// Naver blog pipeline
// ---------------------------------------------------------------------------

function runBlog(opts) {
  console.log("[blog] Running Naver blog pipeline...");
  if (!opts.company) {
    console.error("Error: --company is required for --mode blog");
    process.exit(1);
  }
  const outputDir = resolveOutputDir(opts);
  fs.mkdirSync(outputDir, { recursive: true });

  if (opts.noCache) {
    const cacheDir = path.join(REPO_ROOT, ".tmp", "naver-blog-cache");
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log(`  [blog] Cleared cache: ${path.relative(REPO_ROOT, cacheDir)}`);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const bloggersJson = path.join(outputDir, "naver-bloggers.json");
  const postsJson = path.join(outputDir, "naver-posts.json");
  const insightsMd = path.join(outputDir, "naver-insights.md");

  const maxPosts = opts.maxPosts || "5";

  if (opts.bloggers) {
    console.log("  [blog 0/2] skip discovery (using --bloggers override)");
  } else {
    if (!opts.ticker) {
      console.error("Error: --ticker is required for --mode blog unless --bloggers is provided");
      process.exit(1);
    }
    const discoverScript = path.join(
      REPO_ROOT, "skills", "kr-naver-blogger", "scripts", "discover-bloggers.js"
    );
    const discoverArgs = [
      "--company", opts.company,
      "--ticker", opts.ticker,
      "--output", bloggersJson,
    ];
    if (opts.noCache) discoverArgs.push("--no-cache");
    runStep("[blog 1/3] discover-bloggers.js", discoverScript, discoverArgs, opts);
  }

  const fetchScript = path.join(
    REPO_ROOT, "skills", "kr-naver-insight", "scripts", "fetch-blog-posts.js"
  );
  const fetchArgs = [
    "--company", opts.company,
    "--max-posts", String(maxPosts),
    "--output", postsJson,
  ];
  if (opts.ticker) fetchArgs.push("--ticker", opts.ticker);
  if (opts.bloggers) {
    fetchArgs.push("--bloggers", opts.bloggers);
  } else {
    fetchArgs.push("--input", bloggersJson);
  }
  if (opts.noCache) fetchArgs.push("--no-cache");
  runStep("[blog 2/3] fetch-blog-posts.js", fetchScript, fetchArgs, opts);

  const summarizeScript = path.join(
    REPO_ROOT, "skills", "kr-naver-insight", "scripts", "summarize-insights.js"
  );
  runStep(
    "[blog 3/3] summarize-insights.js",
    summarizeScript,
    ["--input", postsJson, "--output", insightsMd],
    opts
  );

  console.log(`  Insights digest: ${path.relative(REPO_ROOT, insightsMd)}`);
}

// ---------------------------------------------------------------------------
// Quality gate
// ---------------------------------------------------------------------------

function runGate(opts) {
  const memoPath = resolveMemoPath(opts);
  console.log(`[gate] Running quality checks on ${path.relative(REPO_ROOT, memoPath)}...`);

  if (!fs.existsSync(memoPath)) {
    console.error(`Error: memo not found at ${memoPath}`);
    process.exit(1);
  }

  const memo = fs.readFileSync(memoPath, "utf8");
  const memoDir = path.dirname(memoPath);
  const freshnessMemo = (() => {
    const base = memo.match(/기준일[:：]\s*`?(\d{4})[-/](\d{2})[-/](\d{2})`?/);
    const updated = memo.match(/최근 업데이트일[:：]\s*`?(\d{4})[-/](\d{2})[-/](\d{2})`?/);
    if (!base || !updated) return memo;
    return memo.replace(base[0], `기준일: ${updated[1]}-${updated[2]}-${updated[3]}`);
  })();
  const lines = memo.split(/\r?\n/);

  const checks = [];

  // --- Check 1: Required sections ---
  {
    const headings = lines
      .filter((l) => /^## /.test(l))
      .map((l) => l.replace(/^## /, "").trim());
    const missing = REQUIRED_SECTIONS.filter((s) => !headings.includes(s));
    checks.push({
      id: "required-sections",
      severity: "error",
      passed: missing.length === 0,
      message: missing.length === 0
        ? `All ${REQUIRED_SECTIONS.length} required sections present`
        : `Missing sections: ${missing.join(", ")}`,
      details: { missing },
    });
  }

  // --- Check 2: 기준일 present ---
  {
    const datePattern = /기준일[：:]\s*\d{4}[-/]\d{2}[-/]\d{2}/;
    const backtickPattern = /기준일[：:]\s*`\d{4}[-/]\d{2}[-/]\d{2}`/;
    const match = memo.match(datePattern) || memo.match(backtickPattern);
    checks.push({
      id: "base-date-present",
      severity: "error",
      passed: !!match,
      message: match ? `기준일 found: ${match[0]}` : "기준일 not found",
    });
  }

  // --- Check 3: 기준일 staleness ---
  {
    const dateMatch = freshnessMemo.match(/기준일[：:]\s*`?(\d{4})[-/](\d{2})[-/](\d{2})`?/);
    if (dateMatch) {
      const baseDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
      const now = new Date();
      const daysDiff = Math.floor((now - baseDate) / (1000 * 60 * 60 * 24));
      const stale = daysDiff > 14;
      checks.push({
        id: "base-date-staleness",
        severity: "warn",
        passed: !stale,
        message: stale
          ? `기준일 ${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]} is ${daysDiff} days old`
          : `기준일 is ${daysDiff} days old (within 14-day window)`,
      });
    } else {
      checks.push({
        id: "base-date-staleness",
        severity: "warn",
        passed: true,
        message: "Skipped (no 기준일 found)",
      });
    }
  }

  // --- Check 4: Empty sections ---
  {
    const emptySections = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^## /.test(lines[i])) {
        let j = i + 1;
        while (j < lines.length && /^\s*$/.test(lines[j])) j++;
        if (j < lines.length && /^## /.test(lines[j])) {
          emptySections.push(lines[i].replace(/^## /, "").trim());
        }
      }
    }
    checks.push({
      id: "no-empty-sections",
      severity: "warn",
      passed: emptySections.length === 0,
      message: emptySections.length === 0
        ? "No empty sections"
        : `Empty sections: ${emptySections.join(", ")}`,
      details: { emptySections },
    });
  }

  // --- Check 5: Chart PNG references exist ---
  {
    const imageRefs = [];
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let m;
    while ((m = imagePattern.exec(memo)) !== null) {
      imageRefs.push(m[2]);
    }
    const missingImages = imageRefs.filter((ref) => {
      const resolved = path.resolve(memoDir, ref);
      return !fs.existsSync(resolved);
    });
    checks.push({
      id: "chart-pngs-exist",
      severity: "error",
      passed: missingImages.length === 0,
      message: missingImages.length === 0
        ? `All ${imageRefs.length} image references resolve`
        : `Missing images: ${missingImages.join(", ")}`,
      details: { total: imageRefs.length, missing: missingImages },
    });
  }

  // --- Check 6: DART Recheck table exists (WARN) ---
  {
    const hasSection = lines.some((l) => /^## DART Recheck/.test(l));
    let hasTable = false;
    if (hasSection) {
      const idx = lines.findIndex((l) => /^## DART Recheck/.test(l));
      for (let k = idx + 1; k < Math.min(idx + 50, lines.length); k++) {
        if (/^## /.test(lines[k])) break;
        if (/^\|.+\|/.test(lines[k])) {
          hasTable = true;
          break;
        }
      }
    }
    checks.push({
      id: "dart-recheck-table",
      severity: "warn",
      passed: hasSection && hasTable,
      message: hasSection
        ? (hasTable ? "DART Recheck table found" : "DART Recheck section exists but no table found")
        : "DART Recheck section not found",
    });
  }

  // --- Check 7: DART Recheck minimum claims ---
  {
    const idx = lines.findIndex((l) => /^## DART Recheck/.test(l));
    let claimCount = 0;
    if (idx >= 0) {
      let inTable = false;
      for (let k = idx + 1; k < lines.length; k++) {
        if (/^## /.test(lines[k])) break;
        const line = lines[k];
        if (/^\|[-:| ]+\|$/.test(line.trim())) {
          inTable = true;
          continue;
        }
        if (inTable && /^\|.+\|/.test(line)) {
          claimCount++;
        }
        if (/^\|/.test(line) && !inTable) {
          // header row
          continue;
        }
      }
    }
    const skip = idx < 0;
    checks.push({
      id: "dart-recheck-claims",
      severity: "warn",
      passed: skip || claimCount >= 3,
      message: skip
        ? "Skipped (no DART Recheck section)"
        : `${claimCount} claim(s) in DART Recheck table`,
    });
  }

  // --- Check 8: Valuation required metrics ---
  {
    const valIdx = lines.findIndex((l) => /^## Current Valuation Snapshot/.test(l));
    let valText = "";
    if (valIdx >= 0) {
      for (let k = valIdx + 1; k < lines.length; k++) {
        if (/^## /.test(lines[k])) break;
        valText += lines[k].toLowerCase() + "\n";
      }
    }
    const missing = VALUATION_KEYWORDS.filter((kw) => !valText.includes(kw));
    checks.push({
      id: "valuation-metrics",
      severity: "warn",
      passed: missing.length === 0,
      message: missing.length === 0
        ? "All valuation metrics present"
        : `Missing valuation keywords: ${missing.join(", ")}`,
      details: { missing },
    });
  }

  // --- Check 9: Source date annotations ---
  {
    const valIdx = lines.findIndex((l) => /^## Current Valuation Snapshot/.test(l));
    let dateCount = 0;
    if (valIdx >= 0) {
      const dateRe = /\d{4}-\d{2}-\d{2}/g;
      for (let k = valIdx + 1; k < lines.length; k++) {
        if (/^## /.test(lines[k])) break;
        if (/^\|.+\|/.test(lines[k])) {
          const matches = lines[k].match(dateRe);
          if (matches) dateCount += matches.length;
        }
      }
    }
    checks.push({
      id: "source-dates",
      severity: "warn",
      passed: dateCount >= 3,
      message: dateCount >= 3
        ? `${dateCount} source date annotations found`
        : `Only ${dateCount} source date annotations found (need at least 3)`,
    });
  }

  // --- Report ---
  const errors = checks.filter((c) => !c.passed && c.severity === "error").length;
  const warns = checks.filter((c) => !c.passed && c.severity === "warn").length;
  const passed = checks.filter((c) => c.passed).length;

  for (const c of checks) {
    const icon = c.passed ? "\u2713" : (c.severity === "error" ? "\u2717" : "\u26A0");
    console.log(`  ${icon} ${c.id}: ${c.message}`);
  }

  console.log(`\nResult: ${errors > 0 ? "FAIL" : "PASS"} (${errors} error(s), ${warns} warning(s), ${passed} passed)`);

  const report = {
    passed: errors === 0,
    timestamp: new Date().toISOString(),
    memoPath: path.resolve(memoPath),
    checks,
    summary: { errors, warnings: warns, passed },
  };

  if (opts.reportOut) {
    fs.writeFileSync(path.resolve(opts.reportOut), JSON.stringify(report, null, 2), "utf8");
    console.log(`Report written to ${opts.reportOut}`);
  }

  return report;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log(usage());
    process.exit(0);
  }

  if (!opts.mode) {
    console.error("Error: --mode is required (chart, dart, gate, blog, all)");
    console.error(usage());
    process.exit(1);
  }

  if (!opts.company && !opts.memoPath) {
    console.error("Error: --company or --memo-path is required");
    process.exit(1);
  }

  const needsTicker = ["chart", "dart", "all"].includes(opts.mode);
  if (needsTicker && !opts.ticker) {
    if (opts.mode === "all") {
      // all mode can skip chart/dart if no ticker
    } else {
      console.error(`Error: --ticker is required for --mode ${opts.mode}`);
      process.exit(1);
    }
  }

  if (["dart"].includes(opts.mode) && !opts.dartInput) {
    console.error("Error: --dart-input is required for --mode dart");
    process.exit(1);
  }

  console.log("=== Stock Analysis Harness ===");
  console.log(`Company: ${opts.company || "(from memo-path)"}  Mode: ${opts.mode}${opts.ticker ? "  Ticker: " + opts.ticker : ""}${opts.dryRun ? "  [DRY RUN]" : ""}`);
  console.log("");

  if (opts.mode === "chart") {
    runChart(opts);
  } else if (opts.mode === "dart") {
    runDart(opts);
  } else if (opts.mode === "blog") {
    runBlog(opts);
  } else if (opts.mode === "gate") {
    const report = runGate(opts);
    process.exit(report.passed ? 0 : 1);
  } else if (opts.mode === "all") {
    if (opts.ticker) {
      runChart(opts);
      console.log("");
    }
    if (opts.dartInput) {
      runDart(opts);
      console.log("");
    } else {
      console.log("[dart] Skipped (no --dart-input provided)");
      console.log("");
    }
    if (opts.withBlog) {
      if (opts.ticker || opts.bloggers) {
        runBlog(opts);
        console.log("");
      } else {
        console.log("[blog] Skipped (--with-blog requires --ticker or --bloggers)");
        console.log("");
      }
    }
    const report = runGate(opts);
    process.exit(report.passed ? 0 : 1);
  } else {
    console.error(`Error: unknown mode '${opts.mode}'`);
    process.exit(1);
  }
}

main();
