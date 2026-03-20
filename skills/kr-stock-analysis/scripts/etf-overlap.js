#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const result = { top: 10 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--left") {
      result.left = argv[i + 1];
      i += 1;
    } else if (arg === "--right") {
      result.right = argv[i + 1];
      i += 1;
    } else if (arg === "--top") {
      result.top = Number(argv[i + 1]);
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
    "  node etf-overlap.js --left left.json --right right.json [--top 10]",
  ].join("\n");
}

function readJson(filePath) {
  const absolute = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function normalizeHoldings(holdings) {
  const map = new Map();
  for (const holding of holdings || []) {
    const symbol = String(holding.symbol || "").trim().toUpperCase();
    const weight = Number(holding.weight);
    if (!symbol || !Number.isFinite(weight)) {
      continue;
    }
    map.set(symbol, weight);
  }
  return map;
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.left || !args.right) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const left = readJson(args.left);
  const right = readJson(args.right);
  const leftMap = normalizeHoldings(left.holdings);
  const rightMap = normalizeHoldings(right.holdings);

  if (leftMap.size === 0 || rightMap.size === 0) {
    throw new Error("Both ETF files must include a non-empty holdings array.");
  }

  const overlaps = [];
  let weightedOverlap = 0;

  for (const [symbol, leftWeight] of leftMap.entries()) {
    if (!rightMap.has(symbol)) {
      continue;
    }
    const rightWeight = rightMap.get(symbol);
    const overlapWeight = Math.min(leftWeight, rightWeight);
    weightedOverlap += overlapWeight;
    overlaps.push({
      symbol,
      leftWeight,
      rightWeight,
      overlapWeight,
    });
  }

  overlaps.sort((a, b) => b.overlapWeight - a.overlapWeight);

  console.log(`# ETF Overlap: ${left.ticker || "LEFT"} vs ${right.ticker || "RIGHT"}`);
  console.log("");
  console.log(`- Left fund: ${left.name || left.ticker || "Unknown"} (${leftMap.size} holdings parsed)`);
  console.log(`- Right fund: ${right.name || right.ticker || "Unknown"} (${rightMap.size} holdings parsed)`);
  console.log(`- Common holdings: ${overlaps.length}`);
  console.log(`- Weighted overlap: ${formatPercent(weightedOverlap)}`);
  console.log(`- Left-only holdings: ${leftMap.size - overlaps.length}`);
  console.log(`- Right-only holdings: ${rightMap.size - overlaps.length}`);
  console.log("");
  console.log("## Top Overlapping Positions");
  console.log("");
  console.log("| Symbol | Left Weight | Right Weight | Overlap Weight |");
  console.log("| --- | --- | --- | --- |");
  for (const overlap of overlaps.slice(0, args.top)) {
    console.log(
      `| ${overlap.symbol} | ${formatPercent(overlap.leftWeight)} | ${formatPercent(overlap.rightWeight)} | ${formatPercent(overlap.overlapWeight)} |`
    );
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
