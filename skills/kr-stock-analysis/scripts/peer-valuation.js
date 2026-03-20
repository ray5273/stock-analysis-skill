#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const result = { descending: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") {
      result.input = argv[i + 1];
      i += 1;
    } else if (arg === "--sort") {
      result.sort = argv[i + 1];
      i += 1;
    } else if (arg === "--descending") {
      result.descending = true;
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
    "  node peer-valuation.js --input peers.json [--sort pe|evEbitda|fcfYield|ps|revenueGrowth] [--descending]",
  ].join("\n");
}

function readJson(filePath) {
  const absolute = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatNumber(value, digits = 1, suffix = "") {
  if (value === null) {
    return "-";
  }
  return `${value.toFixed(digits)}${suffix}`;
}

function median(values) {
  const sorted = values.filter((value) => value !== null).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return null;
  }
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function compareBy(metric, descending) {
  return (left, right) => {
    const leftValue = toNumber(left[metric]);
    const rightValue = toNumber(right[metric]);
    if (leftValue === null && rightValue === null) {
      return 0;
    }
    if (leftValue === null) {
      return 1;
    }
    if (rightValue === null) {
      return -1;
    }
    return descending ? rightValue - leftValue : leftValue - rightValue;
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const data = readJson(args.input);
  if (!Array.isArray(data.companies) || data.companies.length === 0) {
    throw new Error("Input JSON must include a non-empty companies array.");
  }

  const sortMetric = args.sort || "pe";
  const companies = [...data.companies].sort(compareBy(sortMetric, args.descending));

  const headers = [
    "Ticker",
    "Name",
    "Price",
    `Mkt Cap (${data.marketCapLabel || "$B"})`,
    "P/E",
    "EV/EBITDA",
    "FCF Yield",
    "P/S",
    "Rev Growth",
    "Op Margin",
  ];

  const rows = companies.map((company) => [
    company.ticker || "-",
    company.name || "-",
    formatNumber(toNumber(company.price), 2),
    formatNumber(toNumber(company.marketCapB), 1),
    formatNumber(toNumber(company.pe), 1),
    formatNumber(toNumber(company.evEbitda), 1),
    formatNumber(toNumber(company.fcfYield), 1, "%"),
    formatNumber(toNumber(company.ps), 1),
    formatNumber(toNumber(company.revenueGrowth), 1, "%"),
    formatNumber(toNumber(company.opMargin), 1, "%"),
  ]);

  console.log(`# Peer Valuation${data.asOf ? ` (${data.asOf})` : ""}`);
  console.log("");
  console.log(`Sorted by \`${sortMetric}\`${args.descending ? " descending" : " ascending"}.`);
  console.log("");
  console.log(`| ${headers.join(" | ")} |`);
  console.log(`| ${headers.map(() => "---").join(" | ")} |`);
  for (const row of rows) {
    console.log(`| ${row.join(" | ")} |`);
  }
  console.log("");
  console.log("## Median Snapshot");
  console.log("");
  console.log(`- Median P/E: ${formatNumber(median(companies.map((item) => toNumber(item.pe))), 1)}`);
  console.log(`- Median EV/EBITDA: ${formatNumber(median(companies.map((item) => toNumber(item.evEbitda))), 1)}`);
  console.log(`- Median FCF Yield: ${formatNumber(median(companies.map((item) => toNumber(item.fcfYield))), 1, "%")}`);
  console.log(`- Median Revenue Growth: ${formatNumber(median(companies.map((item) => toNumber(item.revenueGrowth))), 1, "%")}`);
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
