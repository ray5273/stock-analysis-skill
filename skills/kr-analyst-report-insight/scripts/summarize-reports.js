#!/usr/bin/env node

// kr-analyst-report-insight — render a Markdown digest from the
// extracted-text JSON produced by kr-analyst-report-fetch.

const fs = require("fs");
const path = require("path");

const DEFAULT_MAX_REPORTS = 10;
const DEFAULT_SNIPPET_CHARS = 1500;
const BULLET_MAX = 220;
const TP_DIVERGENCE = 0.15;
const SPARK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
const KEYWORD_TOKENS = [
  "목표주가",
  "투자의견",
  "실적",
  "매출",
  "영업이익",
  "가이던스",
  "BUY",
  "HOLD",
  "SELL",
];

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    maxReports: DEFAULT_MAX_REPORTS,
    snippetChars: DEFAULT_SNIPPET_CHARS,
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
      case "--max-reports":
        args.maxReports = parseInt(next(), 10);
        break;
      case "--snippet-chars":
        args.snippetChars = parseInt(next(), 10);
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
    `Usage: node summarize-reports.js --input <extracted.json> --output <path.md> [options]\n` +
      `\n` +
      `Required:\n` +
      `  --input <path>           Extracted JSON from kr-analyst-report-fetch.\n` +
      `  --output <path>          Markdown digest file to write.\n` +
      `\n` +
      `Optional:\n` +
      `  --max-reports <N>        Default ${DEFAULT_MAX_REPORTS}.\n` +
      `  --snippet-chars <N>      Per-report bullet-budget. Default ${DEFAULT_SNIPPET_CHARS}.\n` +
      `  --verbose                Extra logging to stderr.\n`
  );
}

function formatKrw(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `₩${Math.round(n).toLocaleString("en-US")}`;
}

function formatUsd(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${Number(n).toFixed(2)}`;
}

function formatPrice(n, currency) {
  if (n == null) return "—";
  return currency === "USD" ? formatUsd(n) : formatKrw(n);
}

function formatPct(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n * 100).toFixed(1)}%`;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mean(values) {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function sortReports(reports) {
  return [...reports].sort((a, b) => {
    if (a.publishedDate !== b.publishedDate) {
      return a.publishedDate < b.publishedDate ? 1 : -1;
    }
    if (a.broker !== b.broker) {
      return a.broker < b.broker ? -1 : 1;
    }
    return a.reportId < b.reportId ? -1 : 1;
  });
}

function computeConsensus(reports) {
  const withTp = reports.filter(
    (r) => typeof r.targetPrice === "number" && r.targetPrice > 0
  );
  const tps = withTp.map((r) => r.targetPrice);
  const ratings = { BUY: 0, HOLD: 0, SELL: 0, null: 0 };
  for (const r of reports) {
    const key = r.rating === "BUY" || r.rating === "HOLD" || r.rating === "SELL" ? r.rating : "null";
    ratings[key] += 1;
  }
  let modalRating = null;
  let modalCount = -1;
  for (const key of ["BUY", "HOLD", "SELL"]) {
    if (ratings[key] > modalCount) {
      modalCount = ratings[key];
      modalRating = key;
    }
  }
  if (modalCount <= 0) modalRating = null;
  const sorted = sortReports(reports);
  const latest = sorted[0] || null;
  const uniqueBrokers = new Set(reports.map((r) => r.broker)).size;
  return {
    tpCount: withTp.length,
    tpMedian: median(tps),
    tpMean: mean(tps),
    tpMin: tps.length ? Math.min(...tps) : null,
    tpMax: tps.length ? Math.max(...tps) : null,
    ratings,
    modalRating,
    latest,
    uniqueBrokers,
  };
}

function latestPerBroker(reports) {
  const sorted = sortReports(reports);
  const seen = new Map();
  for (const r of sorted) {
    if (!seen.has(r.broker)) seen.set(r.broker, r);
  }
  return [...seen.values()];
}

function tpDeltaForBroker(report, allReports) {
  // Compute (current − prior) / prior for the broker's immediately-prior TP.
  const brokerRows = allReports
    .filter(
      (r) =>
        r.broker === report.broker &&
        typeof r.targetPrice === "number" &&
        r.targetPrice > 0
    )
    .sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1));
  const idx = brokerRows.findIndex((r) => r.reportId === report.reportId);
  if (idx === -1) return null;
  const prior = brokerRows[idx + 1];
  if (!prior || !prior.targetPrice) return null;
  if (typeof report.targetPrice !== "number") return null;
  return (report.targetPrice - prior.targetPrice) / prior.targetPrice;
}

function resolveTextPath(textPath, inputPath) {
  if (!textPath) return null;
  if (path.isAbsolute(textPath)) return textPath;
  // fetch-reports.js writes textPath as cwd-relative, so try cwd first.
  const cwdResolved = path.resolve(textPath);
  if (fs.existsSync(cwdResolved)) return cwdResolved;
  // Fallback: resolve relative to the input JSON's directory for portability.
  const base = path.dirname(path.resolve(inputPath));
  return path.resolve(base, textPath);
}

function readReportText(report, inputPath) {
  const resolved = resolveTextPath(report.textPath, inputPath);
  if (!resolved || !fs.existsSync(resolved)) return "";
  try {
    return fs.readFileSync(resolved, "utf8");
  } catch {
    return "";
  }
}

function splitCandidateLines(text) {
  return text
    .split(/\r?\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 8 && s.length <= 400);
}

function digitWhitespaceRatio(line) {
  if (!line) return 0;
  const matches = line.match(/[\d\s,.()\-\/%]/g);
  return matches ? matches.length / line.length : 0;
}

function endsWithSentenceTerminator(line) {
  return /(?:다|음|함|됨)\.$|[.!?]$/.test(line);
}

function endsMidClause(line) {
  return /[,(]$/.test(line) || /\([^)]*$/.test(line);
}

function scoreLine(line) {
  let score = 0;
  if (line.includes("→")) score += 2;
  if (/\d/.test(line)) score += 1;
  for (const kw of KEYWORD_TOKENS) {
    if (line.includes(kw)) score += 1;
  }
  if (digitWhitespaceRatio(line) > 0.6) score -= 3;
  return score;
}

function scoreOneLiner(line) {
  let score = scoreLine(line);
  if (endsWithSentenceTerminator(line)) score += 1;
  if (endsMidClause(line)) score -= 1;
  return score;
}

function truncateBullet(line) {
  if (line.length <= BULLET_MAX) return line;
  return line.slice(0, BULLET_MAX - 1).trimEnd() + "…";
}

function selectBullets(text, snippetChars) {
  const lines = splitCandidateLines(text);
  const seen = new Set();
  const scored = [];
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    const score = scoreLine(line);
    scored.push({ line, score });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.line.localeCompare(b.line);
  });
  const picked = [];
  let used = 0;
  for (const entry of scored) {
    if (picked.length >= 8) break;
    const truncated = truncateBullet(entry.line);
    if (used + truncated.length > snippetChars && picked.length >= 5) break;
    picked.push(truncated);
    used += truncated.length;
    if (picked.length >= 5 && used >= snippetChars) break;
  }
  return picked;
}

function pickOneLiner(report, inputPath) {
  const text = readReportText(report, inputPath);
  if (text) {
    const lines = splitCandidateLines(text);
    const seen = new Set();
    const scored = [];
    for (const line of lines) {
      if (seen.has(line)) continue;
      seen.add(line);
      scored.push({ line, score: scoreOneLiner(line) });
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.line.localeCompare(b.line);
    });
    if (scored.length > 0 && scored[0].score > 0) {
      return truncateBullet(scored[0].line);
    }
  }
  return report.title || "—";
}

function computeLookbackDays(reports) {
  const dates = reports
    .map((r) => r.publishedDate)
    .filter(Boolean)
    .sort();
  if (dates.length === 0) return 0;
  const oldest = new Date(dates[0] + "T00:00:00Z").getTime();
  const newest = new Date(dates[dates.length - 1] + "T00:00:00Z").getTime();
  const diff = Math.round((newest - oldest) / (1000 * 60 * 60 * 24));
  return diff;
}

function uniqueSources(reports) {
  return [...new Set(reports.map((r) => r.sourceSite).filter(Boolean))].sort();
}

function renderHeader(payload) {
  const { company, ticker, fetchedAt, reports } = payload;
  const lookback = computeLookbackDays(reports);
  const sources = uniqueSources(reports);
  const lines = [];
  lines.push(`# Analyst Report Insight: ${company} (${ticker})`);
  lines.push("");
  lines.push(`기준일: ${fetchedAt}`);
  lines.push(`Lookback: ${lookback} days`);
  lines.push(`Sources: ${sources.length ? sources.join(", ") : "—"}`);
  lines.push(`Report count: ${reports.length}`);
  lines.push("");
  return lines.join("\n");
}

function renderConsensus(reports) {
  const c = computeConsensus(reports);
  const lines = [];
  lines.push("## Consensus Snapshot");
  lines.push("");
  if (c.tpCount < 2) {
    lines.push(
      `- Target price: insufficient data (${c.tpCount} report(s) with TP)`
    );
  } else {
    lines.push(
      `- Target price (KRW): median ${formatKrw(c.tpMedian)}, mean ${formatKrw(c.tpMean)}, range ${formatKrw(c.tpMin)} – ${formatKrw(c.tpMax)}  (${c.tpCount} reports with TP)`
    );
  }
  lines.push(
    `- Rating: BUY ${c.ratings.BUY} / HOLD ${c.ratings.HOLD} / SELL ${c.ratings.SELL} / N/A ${c.ratings.null}`
  );
  if (c.latest) {
    const analyst = c.latest.analyst || "unknown";
    lines.push(
      `- Latest report: ${c.latest.publishedDate} by ${c.latest.broker} (${analyst})`
    );
  } else {
    lines.push(`- Latest report: —`);
  }
  lines.push(`- Coverage brokers: ${c.uniqueBrokers} unique`);
  lines.push("");
  return lines.join("\n");
}

function renderBrokerTable(reports, inputPath) {
  const latest = latestPerBroker(reports).sort((a, b) => {
    if (a.publishedDate !== b.publishedDate) {
      return a.publishedDate < b.publishedDate ? 1 : -1;
    }
    return a.broker < b.broker ? -1 : 1;
  });
  const lines = [];
  lines.push("## Broker Coverage");
  lines.push("");
  lines.push("| Broker | Analyst | Date | Rating | Target | TP Δ | 1-liner |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const r of latest) {
    const analyst = r.analyst || "—";
    const rating = r.rating || "—";
    const target = formatPrice(r.targetPrice, r.currency || "KRW");
    const delta = formatPct(tpDeltaForBroker(r, reports));
    const oneLiner = pickOneLiner(r, inputPath).replace(/\|/g, "\\|");
    lines.push(
      `| ${r.broker} | ${analyst} | ${r.publishedDate} | ${rating} | ${target} | ${delta} | ${oneLiner} |`
    );
  }
  if (latest.length === 0) {
    lines.push("| — | — | — | — | — | — | — |");
  }
  lines.push("");
  return lines.join("\n");
}

function renderRecentReports(reports, maxReports, snippetChars, inputPath) {
  const sorted = sortReports(reports).slice(0, maxReports);
  const lines = [];
  lines.push("## Recent Reports");
  lines.push("");
  for (const r of sorted) {
    const analyst = r.analyst || "분석가 미상";
    lines.push(
      `### ${r.title || "(제목 없음)"} — ${r.broker} / ${analyst}  (${r.publishedDate})`
    );
    lines.push("");
    const rating = r.rating || "N/A";
    const target = formatPrice(r.targetPrice, r.currency || "KRW");
    lines.push(`Rating: ${rating}   Target: ${target}`);
    lines.push("");
    if (!r.extractionOk) {
      lines.push("*PDF text unavailable — see landing page.*");
    } else {
      const text = readReportText(r, inputPath);
      const bullets = selectBullets(text, snippetChars);
      if (bullets.length === 0) {
        lines.push("*No key-point bullets extracted from PDF text.*");
      } else {
        for (const b of bullets) lines.push(`- ${b}`);
      }
    }
    lines.push("");
    if (r.landingUrl) {
      lines.push(`📎 ${r.landingUrl}`);
      lines.push("");
    }
  }
  if (sorted.length === 0) {
    lines.push("No reports to display.");
    lines.push("");
  }
  return lines.join("\n");
}

function renderDivergences(reports) {
  const c = computeConsensus(reports);
  const latest = latestPerBroker(reports);
  const lines = [];
  lines.push("## Divergences");
  lines.push("");
  const items = [];
  if (c.tpMedian) {
    for (const r of latest) {
      if (typeof r.targetPrice !== "number" || r.targetPrice <= 0) continue;
      const delta = (r.targetPrice - c.tpMedian) / c.tpMedian;
      if (Math.abs(delta) > TP_DIVERGENCE) {
        items.push(
          `- **${r.broker}**: TP ${formatPrice(r.targetPrice, r.currency || "KRW")} is ${formatPct(delta)} vs consensus median (${formatKrw(c.tpMedian)}).`
        );
      }
    }
  }
  if (c.modalRating) {
    for (const r of latest) {
      if (r.rating && r.rating !== c.modalRating) {
        items.push(
          `- **${r.broker}**: Rating ${r.rating} vs modal ${c.modalRating}.`
        );
      }
    }
  }
  if (items.length === 0) {
    lines.push(
      "- No material divergences against consensus median / modal rating."
    );
  } else {
    lines.push(...items);
  }
  lines.push("");
  return lines.join("\n");
}

function buildMonthlyMedians(reports) {
  const buckets = new Map();
  for (const r of reports) {
    if (typeof r.targetPrice !== "number" || r.targetPrice <= 0) continue;
    if (!r.publishedDate) continue;
    const key = r.publishedDate.slice(0, 7); // YYYY-MM
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(r.targetPrice);
  }
  const rows = [...buckets.entries()]
    .map(([month, vals]) => ({ month, medianTp: median(vals) }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
  return rows;
}

function renderSparkline(rows) {
  if (rows.length === 0) return "";
  const values = rows.map((r) => r.medianTp);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const flat = SPARK_CHARS[3].repeat(rows.length);
    return `Sparkline: ${flat}   (flat at ${formatKrw(min)})`;
  }
  const range = max - min;
  const chars = values
    .map((v) => {
      const ratio = (v - min) / range;
      const idx = Math.min(
        SPARK_CHARS.length - 1,
        Math.max(0, Math.round(ratio * (SPARK_CHARS.length - 1)))
      );
      return SPARK_CHARS[idx];
    })
    .join("");
  return `Sparkline: ${chars}   (${formatKrw(min)} … ${formatKrw(max)})`;
}

function renderTrajectory(reports) {
  const qualifying = reports.filter(
    (r) =>
      r.publishedDate &&
      typeof r.targetPrice === "number" &&
      r.targetPrice > 0
  );
  const lines = [];
  lines.push("## TP Trajectory");
  lines.push("");
  if (qualifying.length < 6) {
    lines.push(
      `Insufficient dated TPs for a trajectory (${qualifying.length} qualifying reports; need ≥ 6).`
    );
    lines.push("");
    return lines.join("\n");
  }
  const rows = buildMonthlyMedians(qualifying);
  lines.push("| Month | Consensus TP (median) |");
  lines.push("|---|---|");
  for (const row of rows) {
    lines.push(`| ${row.month} | ${formatKrw(row.medianTp)} |`);
  }
  lines.push("");
  lines.push(renderSparkline(rows));
  lines.push("");
  return lines.join("\n");
}

function renderSourceQuality(payload) {
  const reports = payload.reports;
  const meta = payload.meta || {};
  const total = reports.length;
  const extractedOk = reports.filter((r) => r.extractionOk).length;
  const loginGated = reports.filter(
    (r) => r.error === "login-gated per discover index"
  ).length;
  const noPdf = reports.filter((r) => r.error === "no PDF URL in index").length;
  const failed = reports.filter(
    (r) =>
      !r.extractionOk &&
      r.error !== "login-gated per discover index" &&
      r.error !== "no PDF URL in index"
  ).length;
  const warnings = Array.isArray(meta.warnings) ? meta.warnings : [];
  const lines = [];
  lines.push("## Source Quality");
  lines.push("");
  lines.push(`- Extracted OK: ${extractedOk}/${total}`);
  lines.push(`- Skipped (login-gated): ${loginGated}`);
  lines.push(`- Skipped (no PDF URL): ${noPdf}`);
  lines.push(`- Extraction failed: ${failed}`);
  if (warnings.length === 0) {
    lines.push(`- Warnings: none`);
  } else {
    lines.push(`- Warnings:`);
    for (const w of warnings) {
      lines.push(`  - ${w}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function renderEmpty(payload) {
  const { company, ticker, fetchedAt } = payload;
  return [
    `# Analyst Report Insight: ${company} (${ticker})`,
    "",
    `기준일: ${fetchedAt}`,
    "",
    "No analyst reports in window.",
    "",
  ].join("\n");
}

function buildDigest(payload, args) {
  const reports = payload.reports || [];
  if (reports.length === 0) return renderEmpty(payload);
  const parts = [];
  parts.push(renderHeader(payload));
  parts.push(renderConsensus(reports));
  parts.push(renderBrokerTable(reports, args.input));
  parts.push(
    renderRecentReports(reports, args.maxReports, args.snippetChars, args.input)
  );
  parts.push(renderDivergences(reports));
  parts.push(renderTrajectory(reports));
  parts.push(renderSourceQuality(payload));
  return parts.join("\n");
}

function run(args) {
  if (!args.input) {
    console.error("--input is required.");
    process.exit(1);
  }
  if (!args.output) {
    console.error("--output is required.");
    process.exit(1);
  }
  if (!fs.existsSync(args.input)) {
    console.error(`Input file not found: ${args.input}`);
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(args.input, "utf8"));
  const md = buildDigest(payload, args);
  fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
  fs.writeFileSync(args.output, md, "utf8");
  console.log(args.output);
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  run(args);
}

module.exports = {
  parseArgs,
  buildDigest,
  computeConsensus,
  latestPerBroker,
  selectBullets,
  scoreLine,
  truncateBullet,
  sortReports,
  tpDeltaForBroker,
  buildMonthlyMedians,
  renderSparkline,
};
