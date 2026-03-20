#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") {
      result.input = argv[i + 1];
      i += 1;
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
    "  node valuation-bands.js --input valuation-history.json",
  ].join("\n");
}

function readJson(filePath) {
  const absolute = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function toPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function formatNumber(value, digits = 1, suffix = "x") {
  if (value === null) {
    return "-";
  }
  return `${value.toFixed(digits)}${suffix}`;
}

function percentileRank(values, current) {
  if (current === null || values.length === 0) {
    return null;
  }
  const count = values.filter((value) => value <= current).length;
  return (count / values.length) * 100;
}

function median(values) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function bandLabel(percentile) {
  if (percentile === null) {
    return "insufficient-data";
  }
  if (percentile <= 33) {
    return "lower";
  }
  if (percentile >= 67) {
    return "upper";
  }
  return "middle";
}

function renderBar(value, maxValue, width = 24) {
  if (value === null || maxValue === null || maxValue <= 0) {
    return "";
  }
  const barLength = Math.max(1, Math.round((value / maxValue) * width));
  return "#".repeat(barLength);
}

function renderMetricSection(metricKey, label, points) {
  const values = points.map((point) => point.value);
  const current = values[values.length - 1] ?? null;
  const minValue = values.length > 0 ? Math.min(...values) : null;
  const maxValue = values.length > 0 ? Math.max(...values) : null;
  const medianValue = median(values);
  const currentPercentile = percentileRank(values, current);

  console.log(`## ${label} Band`);
  console.log("");
  console.log("| Metric | Current | Min | Median | Max | Current Percentile |");
  console.log("| --- | --- | --- | --- | --- | --- |");
  console.log(
    `| ${label} | ${formatNumber(current)} | ${formatNumber(minValue)} | ${formatNumber(medianValue)} | ${formatNumber(maxValue)} | ${currentPercentile === null ? "-" : `${currentPercentile.toFixed(1)}%`} |`
  );
  console.log("");
  console.log("### ASCII Chart");
  console.log("");

  for (const point of points) {
    console.log(`${point.date} | ${renderBar(point.value, maxValue)} ${formatNumber(point.value)}`);
  }

  console.log("");
  console.log(
    `Current ${label} sits in the ${bandLabel(currentPercentile)} part of the historical range.${metricKey === "pe" ? " Treat periods with negative earnings as non-comparable and leave them out of the input." : ""}`
  );
  console.log("");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const data = readJson(args.input);
  if (!Array.isArray(data.series) || data.series.length === 0) {
    throw new Error("Input JSON must include a non-empty series array.");
  }

  const series = [...data.series].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const metrics = [
    { key: "pe", label: "P/E" },
    { key: "evEbitda", label: "EV/EBITDA" },
    { key: "pbr", label: "P/B" },
  ];

  const metricPoints = metrics.map((metric) => ({
    ...metric,
    points: series
      .map((entry) => ({ date: entry.date, value: toPositiveNumber(entry[metric.key]) }))
      .filter((entry) => entry.value !== null),
  }));

  if (metricPoints.every((metric) => metric.points.length === 0)) {
    throw new Error("Input JSON must include at least one positive valuation series for pe, evEbitda, or pbr.");
  }

  console.log(`# Historical Valuation Bands: ${data.ticker || "Unknown"}`);
  console.log("");
  if (data.name) {
    console.log(`- Name: ${data.name}`);
  }
  if (data.asOf) {
    console.log(`- As of: ${data.asOf}`);
  }
  if (data.historyYears) {
    console.log(`- History window: ${data.historyYears} year(s)`);
  }
  console.log("");

  for (const metric of metricPoints) {
    if (metric.points.length === 0) {
      console.log(`## ${metric.label} Band`);
      console.log("");
      console.log("Not enough positive, meaningful observations to render this band.");
      console.log("");
      continue;
    }
    renderMetricSection(metric.key, metric.label, metric.points);
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
