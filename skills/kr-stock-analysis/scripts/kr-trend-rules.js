#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const { normalizeBars, requireValidBars, buildMetrics } = require("./lib/technical-core");

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") {
      result.input = argv[index + 1];
      index += 1;
    } else if (arg === "--rs-cache") {
      result.rsCache = argv[index + 1];
      index += 1;
    } else if (arg === "--json-out") {
      result.jsonOut = argv[index + 1];
      index += 1;
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
    "  node kr-trend-rules.js --input <chart-data.json> [--rs-cache <cache.json>] [--json-out <path>]",
  ].join("\n");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return value.toFixed(digits);
}

function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${value.toFixed(digits)}%`;
}

function formatRatio(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${(value * 100).toFixed(digits)}%`;
}

function normalizeTicker(value) {
  const text = String(value || "").trim();
  const match = text.match(/(\d{6})/);
  return match ? match[1] : text;
}

function loadRsEntry(rsCachePath, ticker) {
  if (!rsCachePath) {
    return { status: "unavailable", reason: "RS cache not provided." };
  }

  try {
    const cache = readJson(rsCachePath);
    const entry = Array.isArray(cache.entries)
      ? cache.entries.find((item) => normalizeTicker(item.ticker || item.symbol) === ticker)
      : null;

    if (!entry || !Number.isFinite(entry.rsPercentile)) {
      return {
        status: "unavailable",
        reason: entry?.error || "Ticker not found or RS percentile unavailable in cache.",
        cacheDate: cache.date || null,
      };
    }

    return {
      status: "available",
      reason: null,
      cacheDate: cache.date || null,
      entry,
    };
  } catch (error) {
    return { status: "unavailable", reason: error.message };
  }
}

function buildMinerviniRules(metrics, rsLookup) {
  const latestIndex = metrics.ma200Series.length - 1;
  const ma200Past = latestIndex >= 20 ? metrics.ma200Series[latestIndex - 20] : null;
  const rules = [
    {
      label: "현재가 > SMA50/SMA150/SMA200",
      value: [metrics.latestClose, metrics.ma50Value, metrics.ma150Value, metrics.ma200Value].every(Number.isFinite)
        ? (metrics.latestClose > metrics.ma50Value && metrics.latestClose > metrics.ma150Value && metrics.latestClose > metrics.ma200Value)
        : null,
      detail: `현재가 ${formatNumber(metrics.latestClose)} / SMA50 ${formatNumber(metrics.ma50Value)} / SMA150 ${formatNumber(metrics.ma150Value)} / SMA200 ${formatNumber(metrics.ma200Value)}`,
    },
    {
      label: "SMA150 > SMA200",
      value: [metrics.ma150Value, metrics.ma200Value].every(Number.isFinite) ? metrics.ma150Value > metrics.ma200Value : null,
      detail: `SMA150 ${formatNumber(metrics.ma150Value)} / SMA200 ${formatNumber(metrics.ma200Value)}`,
    },
    {
      label: "SMA50 > SMA150 and SMA200",
      value: [metrics.ma50Value, metrics.ma150Value, metrics.ma200Value].every(Number.isFinite)
        ? (metrics.ma50Value > metrics.ma150Value && metrics.ma50Value > metrics.ma200Value)
        : null,
      detail: `SMA50 ${formatNumber(metrics.ma50Value)} / SMA150 ${formatNumber(metrics.ma150Value)} / SMA200 ${formatNumber(metrics.ma200Value)}`,
    },
    {
      label: "SMA200이 최근 20거래일 전보다 상승",
      value: [metrics.ma200Value, ma200Past].every(Number.isFinite) ? metrics.ma200Value > ma200Past : null,
      detail: `현재 SMA200 ${formatNumber(metrics.ma200Value)} / 20거래일 전 ${formatNumber(ma200Past)}`,
    },
    {
      label: "현재가 >= 52주 저가의 130%",
      value: [metrics.priceVs52WeekLowRatio].every(Number.isFinite) ? metrics.priceVs52WeekLowRatio >= 1.3 : null,
      detail: `현재가/52주 저가 ${formatRatio(metrics.priceVs52WeekLowRatio)}`,
    },
    {
      label: "현재가 >= 52주 고가의 75%",
      value: [metrics.priceVs52WeekHighRatio].every(Number.isFinite) ? metrics.priceVs52WeekHighRatio >= 0.75 : null,
      detail: `현재가/52주 고가 ${formatRatio(metrics.priceVs52WeekHighRatio)}`,
    },
    {
      label: "RS percentile >= 70",
      value: rsLookup.status === "available" ? rsLookup.entry.rsPercentile >= 70 : null,
      detail: rsLookup.status === "available"
        ? `RS percentile ${formatNumber(rsLookup.entry.rsPercentile, 1)}`
        : `RS percentile unavailable${rsLookup.reason ? ` (${rsLookup.reason})` : ""}`,
    },
  ];

  const unavailableCount = rules.filter((rule) => rule.value === null).length;
  const failedCount = rules.filter((rule) => rule.value === false).length;
  const passedCount = rules.filter((rule) => rule.value === true).length;
  const status = unavailableCount > 0 ? "incomplete" : failedCount === 0 ? "pass" : "fail";

  return { rules, status, unavailableCount, failedCount, passedCount };
}

function scoreByThreshold(value, bands) {
  if (!Number.isFinite(value)) {
    return null;
  }
  for (const band of bands) {
    if (value >= band.min) {
      return band.score;
    }
  }
  return 0;
}

function buildLeadershipScore(metrics, rsLookup) {
  const proximityPoints = scoreByThreshold(metrics.priceVs52WeekHighRatio, [
    { min: 0.95, score: 25 },
    { min: 0.9, score: 18 },
    { min: 0.85, score: 10 },
    { min: 0.75, score: 5 },
  ]);
  const recencyPoints = scoreByThreshold(Number.isFinite(metrics.daysSince52WeekHigh) ? -metrics.daysSince52WeekHigh : null, [
    { min: -20, score: 25 },
    { min: -60, score: 18 },
    { min: -120, score: 10 },
    { min: -252, score: 5 },
  ]);
  const frequencyPoints = scoreByThreshold(metrics.recent52WeekHighCount60, [
    { min: 3, score: 15 },
    { min: 2, score: 10 },
    { min: 1, score: 5 },
  ]);
  const rsPoints = rsLookup.status === "available"
    ? scoreByThreshold(rsLookup.entry.rsPercentile, [
        { min: 90, score: 20 },
        { min: 80, score: 15 },
        { min: 70, score: 10 },
        { min: 60, score: 5 },
      ])
    : null;

  let trendVolumePoints = null;
  if ([metrics.latestClose, metrics.ma50Value, metrics.ma150Value, metrics.ma200Value].every(Number.isFinite)) {
    trendVolumePoints = metrics.latestClose > metrics.ma50Value && metrics.ma50Value > metrics.ma150Value && metrics.ma150Value > metrics.ma200Value
      ? 10
      : 0;
    if (Number.isFinite(metrics.volumeRatio) && metrics.volumeRatio >= 1.2) {
      trendVolumePoints += 5;
    }
  } else if (Number.isFinite(metrics.volumeRatio)) {
    trendVolumePoints = metrics.volumeRatio >= 1.2 ? 5 : 0;
  }

  const components = [
    {
      label: "52주 고가 근접도",
      maxPoints: 25,
      points: proximityPoints,
      detail: `현재가/52주 고가 ${formatRatio(metrics.priceVs52WeekHighRatio)}`,
    },
    {
      label: "최근 신고가 recency",
      maxPoints: 25,
      points: recencyPoints,
      detail: Number.isFinite(metrics.daysSince52WeekHigh) ? `마지막 신고가 이후 ${metrics.daysSince52WeekHigh}거래일` : "52주 히스토리 부족",
    },
    {
      label: "최근 60거래일 신고가 경신 빈도",
      maxPoints: 15,
      points: frequencyPoints,
      detail: Number.isFinite(metrics.recent52WeekHighCount60) ? `${metrics.recent52WeekHighCount60}회` : "52주 히스토리 부족",
    },
    {
      label: "통합 KRX RS percentile",
      maxPoints: 20,
      points: rsPoints,
      detail: rsLookup.status === "available"
        ? `RS percentile ${formatNumber(rsLookup.entry.rsPercentile, 1)}`
        : `RS percentile unavailable${rsLookup.reason ? ` (${rsLookup.reason})` : ""}`,
    },
    {
      label: "추세/거래량 확인",
      maxPoints: 15,
      points: trendVolumePoints,
      detail: `정배열 ${[metrics.latestClose, metrics.ma50Value, metrics.ma150Value, metrics.ma200Value].every(Number.isFinite) && metrics.latestClose > metrics.ma50Value && metrics.ma50Value > metrics.ma150Value && metrics.ma150Value > metrics.ma200Value ? "yes" : "no"} / 거래량 ${formatRatio(metrics.volumeRatio)}`,
    },
  ];

  const unavailableCount = components.filter((component) => component.points === null).length;
  const visibleMaxPoints = components.reduce((sum, component) => sum + (component.points === null ? 0 : component.maxPoints), 0);
  const visiblePoints = components.reduce((sum, component) => sum + (component.points || 0), 0);
  const status = unavailableCount > 0 ? "partial" : "complete";
  const grade = unavailableCount > 0
    ? null
    : visiblePoints >= 85 ? "A" : visiblePoints >= 70 ? "B" : visiblePoints >= 55 ? "C" : "D";

  return {
    components,
    status,
    visiblePoints,
    visibleMaxPoints,
    score100: unavailableCount > 0 ? null : visiblePoints,
    grade,
    unavailableCount,
  };
}

function buildInterpretation(minervini, leadership, metrics, rsLookup) {
  const sentences = [];

  if (minervini.status === "pass") {
    sentences.push("Minervini Trend Template 기준으로는 현재 차트가 추세 리더 후보 조건을 모두 충족합니다.");
  } else if (minervini.status === "fail") {
    sentences.push(`Minervini Trend Template 기준으로는 ${minervini.failedCount}개 조건이 미충족이라 아직 엄격한 통과 구간은 아닙니다.`);
  } else {
    sentences.push("Minervini Trend Template 판정은 일부 데이터가 비어 있어 incomplete 상태입니다.");
  }

  if (leadership.status === "complete") {
    sentences.push(`한국형 52주 신고가 리더십 점수는 ${leadership.score100}/100, 등급 ${leadership.grade}입니다.`);
  } else {
    sentences.push(`한국형 52주 신고가 리더십 점수는 partial 상태이며 현재 확인 가능한 항목 기준 ${leadership.visiblePoints}/${leadership.visibleMaxPoints}점입니다.`);
  }

  if (rsLookup.status !== "available") {
    sentences.push("RS percentile이 비어 있으므로 시장 내 상대강도 해석은 보류하고, 52주 고가 근접도와 추세 구조만 우선 해석해야 합니다.");
  } else if (metrics.chartFlow) {
    sentences.push(`차트 흐름은 ${metrics.chartFlow} 쪽으로 읽히며, RS percentile ${formatNumber(rsLookup.entry.rsPercentile, 1)} 기준 시장 내 상대강도까지 함께 확인됩니다.`);
  }

  return sentences.slice(0, 3).join(" ");
}

function renderMarkdown(summary) {
  const lines = [];
  lines.push("### Rule Screen");
  lines.push("");
  lines.push(`- Minervini Trend Template: \`${summary.minervini.status}\`${summary.minervini.status === "incomplete" ? " (RS percentile unavailable 또는 장기 히스토리 부족 시 incomplete)" : ""}`);
  if (summary.leadership.status === "complete") {
    lines.push(`- KRX 52주 신고가 리더십 점수: \`${summary.leadership.score100}/100\` (Grade \`${summary.leadership.grade}\`)`);
  } else {
    lines.push(`- KRX 52주 신고가 리더십 점수: \`partial\` (${summary.leadership.visiblePoints}/${summary.leadership.visibleMaxPoints} visible points, RS percentile unavailable)`);
  }
  lines.push("");
  lines.push("| 항목 | 상태 | 세부 |");
  lines.push("| --- | --- | --- |");

  for (const rule of summary.minervini.rules) {
    const status = rule.value === true ? "pass" : rule.value === false ? "fail" : "unavailable";
    lines.push(`| Minervini / ${rule.label} | ${status} | ${rule.detail} |`);
  }
  for (const component of summary.leadership.components) {
    const status = component.points === null ? "unavailable" : `${component.points}/${component.maxPoints}`;
    lines.push(`| Leadership / ${component.label} | ${status} | ${component.detail} |`);
  }

  lines.push("");
  lines.push(summary.interpretation);
  return lines.join("\n");
}

function evaluateTrendRules(data, rsCachePath) {
  const ticker = normalizeTicker(data.ticker || data.symbol);
  const bars = normalizeBars(data.bars || []);
  requireValidBars(bars);
  const metrics = buildMetrics(bars);
  const rsLookup = loadRsEntry(rsCachePath, ticker);
  const minervini = buildMinerviniRules(metrics, rsLookup);
  const leadership = buildLeadershipScore(metrics, rsLookup);
  const interpretation = buildInterpretation(minervini, leadership, metrics, rsLookup);

  const summary = {
    ticker,
    symbol: data.ticker || data.symbol || ticker,
    name: data.name || null,
    latestDate: metrics.latest.date,
    rsCacheDate: rsLookup.cacheDate || null,
    minervini,
    leadership,
    interpretation,
  };

  return {
    summary,
    markdown: renderMarkdown(summary),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const data = readJson(args.input);
  const result = evaluateTrendRules(data, args.rsCache);

  if (args.jsonOut) {
    const absolute = path.resolve(args.jsonOut);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(result.summary, null, 2)}\n`);
  }

  console.log(result.markdown);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  evaluateTrendRules,
  buildMinerviniRules,
  buildLeadershipScore,
  loadRsEntry,
};
