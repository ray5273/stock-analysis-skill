#!/usr/bin/env node

// summarize-analyst-views.js — render the coverage JSON produced by
// fetch-analyst-coverage.js into a Markdown block that pastes directly under
// the `## Street / Alternative Views` section of a kr-stock-analysis memo.

const fs = require("fs");
const path = require("path");

const DEFAULT_MAX_VIEWS = 8;

function parseArgs(argv) {
  const opts = {
    maxViews: DEFAULT_MAX_VIEWS,
    headingLevel: 2,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--input") opts.input = next();
    else if (arg === "--output") opts.output = next();
    else if (arg === "--max-views") opts.maxViews = parseInt(next(), 10) || DEFAULT_MAX_VIEWS;
    else if (arg === "--heading-level") opts.headingLevel = parseInt(next(), 10);
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

function usage() {
  return [
    "Usage:",
    "  node summarize-analyst-views.js --input coverage.json [--output views.md]",
    "",
    "Options:",
    "  --input PATH         Coverage JSON from fetch-analyst-coverage.js (required)",
    "  --output PATH        Markdown output path (stdout if omitted)",
    "  --max-views N        Max Street view bullets before Bottom line (default 8)",
    "  --heading-level N    0 to omit heading, 2 for '##' (default 2)",
  ].join("\n");
}

const NUMBER_FMT = new Intl.NumberFormat("ko-KR");

function formatTP(value) {
  if (!Number.isFinite(value)) return null;
  return `${NUMBER_FMT.format(value)} KRW`;
}

function formatDate(iso) {
  if (!iso) return null;
  return iso;
}

function formatBullet(record) {
  const parts = [];
  if (record.reportDate) parts.push(record.reportDate);
  if (record.rating) parts.push(record.rating);
  if (Number.isFinite(record.targetPriceKrw)) parts.push(`TP ${formatTP(record.targetPriceKrw)}`);
  const meta = parts.length ? ` (${parts.join(", ")})` : "";

  const thesis = (record.snippet || "").trim() || "본문 snippet 추출 실패 — 원문 참고";

  const sourceBits = [];
  if (record.press) sourceBits.push(record.press);
  const asOf = record.articleDate || record.reportDate;
  if (asOf) sourceBits.push(asOf);
  if (record.articleUrl) sourceBits.push(record.articleUrl);
  const source = sourceBits.length ? ` — ${sourceBits.join(", ")}` : "";

  return `- \`Street view\`: ${record.broker}${meta}: ${thesis}${source}`;
}

function median(nums) {
  const sorted = nums.slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function buildBottomLine(records) {
  if (!records.length) return null;
  const tails = " Filing 확정 범위는 별도 확인 필요.";
  if (records.length === 1) {
    const r = records[0];
    const parts = [r.broker];
    if (r.rating) parts.push(`${r.rating} 의견`);
    if (Number.isFinite(r.targetPriceKrw)) parts.push(`TP ${formatTP(r.targetPriceKrw)}`);
    return `- \`Bottom line\`: 확인된 외국계 뷰는 ${parts.join(", ")} 한 건.${tails}`;
  }
  const ratings = records.map((r) => r.rating).filter(Boolean);
  const uniqRatings = Array.from(new Set(ratings));
  const tps = records.map((r) => r.targetPriceKrw).filter((v) => Number.isFinite(v));
  const tpMedian = median(tps);

  if (uniqRatings.length >= 2) {
    const byRating = {};
    for (const r of records) {
      if (!r.rating) continue;
      (byRating[r.rating] ||= []).push(r.broker);
    }
    const parts = Object.entries(byRating)
      .map(([rating, brokers]) => `${brokers.join(", ")}는 ${rating}`);
    const tpNote = tpMedian != null ? ` TP 중앙값 ${formatTP(tpMedian)}.` : "";
    return `- \`Bottom line\`: 외국계 뷰는 갈림 — ${parts.join("; ")}.${tpNote}${tails}`;
  }

  const consensus = uniqRatings[0];
  const tpNote = tpMedian != null ? `, TP 중앙값 ${formatTP(tpMedian)}` : "";
  if (consensus) {
    return `- \`Bottom line\`: 외국계 컨센서스는 ${consensus}${tpNote} (${records.length}개 커버리지).${tails}`;
  }
  return `- \`Bottom line\`: 외국계 커버리지 ${records.length}건, 등급 정보는 기사에서 확인되지 않음${tpNote}.${tails}`;
}

function render(data, opts) {
  const heading = opts.headingLevel > 0
    ? `${"#".repeat(opts.headingLevel)} Street / Alternative Views\n\n`
    : "";

  const coverage = Array.isArray(data.coverage) ? data.coverage : [];
  if (!coverage.length) {
    return (
      `${heading}- 외국계 커버리지가 Korean 뉴스에서 확인되지 않음 (기준일 ${data.fetchedAt || "N/A"}). 직접 검색 필요.\n`
    );
  }

  const visible = coverage.slice(0, opts.maxViews);
  const bullets = visible.map(formatBullet);
  const bottom = buildBottomLine(visible);
  const lines = [...bullets];
  if (bottom) lines.push(bottom);
  return `${heading}${lines.join("\n")}\n`;
}

function run(opts) {
  if (!opts.input) {
    console.error("Error: --input is required");
    console.error(usage());
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(opts.input, "utf8"));
  const md = render(data, opts);
  if (opts.output) {
    fs.mkdirSync(path.dirname(opts.output), { recursive: true });
    fs.writeFileSync(opts.output, md, "utf8");
    console.log(`Wrote ${opts.output}`);
  } else {
    process.stdout.write(md);
  }
}

function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); }
  catch (err) {
    console.error(err.message);
    console.error(usage());
    process.exit(1);
  }
  if (opts.help) {
    console.log(usage());
    process.exit(0);
  }
  run(opts);
}

if (require.main === module) main();

module.exports = { render, buildBottomLine, formatBullet };
