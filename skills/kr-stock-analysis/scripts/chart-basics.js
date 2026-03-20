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
    "  node chart-basics.js --input price-history.json",
  ].join("\n");
}

function readJson(filePath) {
  const absolute = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function average(values) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sma(values, period) {
  if (values.length < period) {
    return null;
  }
  return average(values.slice(-period));
}

function rsi(values, period = 14) {
  if (values.length <= period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let i = values.length - period; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(digits);
}

function formatPercent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(digits)}%`;
}

function classifyTrend(close, sma20Value, sma50Value) {
  if (sma20Value === null) {
    return "insufficient-data";
  }
  if (sma50Value === null) {
    if (close > sma20Value) {
      return "bullish";
    }
    if (close < sma20Value) {
      return "bearish";
    }
    return "mixed";
  }
  if (close > sma20Value && sma20Value > sma50Value) {
    return "bullish";
  }
  if (close < sma20Value && sma20Value < sma50Value) {
    return "bearish";
  }
  return "mixed";
}

function classifyRsi(rsiValue) {
  if (rsiValue === null) {
    return "insufficient-data";
  }
  if (rsiValue >= 70) {
    return "overbought";
  }
  if (rsiValue <= 30) {
    return "oversold";
  }
  return "neutral";
}

function classifyVolume(volumeRatio) {
  if (volumeRatio === null) {
    return "insufficient-data";
  }
  if (volumeRatio >= 1.5) {
    return "heavy";
  }
  if (volumeRatio <= 0.7) {
    return "light";
  }
  return "normal";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const data = readJson(args.input);
  if (!Array.isArray(data.bars) || data.bars.length < 15) {
    throw new Error("Input JSON must include at least 15 OHLCV bars.");
  }

  const bars = [...data.bars].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const closes = bars.map((bar) => Number(bar.close));
  const volumes = bars.map((bar) => Number(bar.volume));

  if (closes.some((value) => !Number.isFinite(value)) || volumes.some((value) => !Number.isFinite(value))) {
    throw new Error("Every bar must include numeric close and volume fields.");
  }

  const latest = bars[bars.length - 1];
  const latestClose = closes[closes.length - 1];
  const sma20Value = sma(closes, 20);
  const sma50Value = sma(closes, 50);
  const rsi14Value = rsi(closes, 14);
  const avgVolume20 = sma(volumes, 20);
  const volumeRatio = avgVolume20 ? latest.volume / avgVolume20 : null;
  const lookback = bars.slice(-21, -1);
  const breakoutLevel = lookback.length > 0 ? Math.max(...lookback.map((bar) => Number(bar.high))) : null;
  const breakdownLevel = lookback.length > 0 ? Math.min(...lookback.map((bar) => Number(bar.low))) : null;
  const trend = classifyTrend(latestClose, sma20Value, sma50Value);
  const momentum = classifyRsi(rsi14Value);
  const volumeRegime = classifyVolume(volumeRatio);

  console.log(`# Basic Chart Analysis: ${data.ticker || "Unknown"}`);
  console.log("");
  if (data.name) {
    console.log(`- Name: ${data.name}`);
  }
  console.log(`- Latest date: ${latest.date}`);
  console.log(`- Latest close: ${formatNumber(latestClose)}`);
  console.log(`- Trend: ${trend}`);
  console.log(`- Momentum: ${momentum}`);
  console.log(`- Volume regime: ${volumeRegime}`);
  console.log("");
  console.log("## Indicators");
  console.log("");
  console.log("| Metric | Value |");
  console.log("| --- | --- |");
  console.log(`| SMA 20 | ${formatNumber(sma20Value)} |`);
  console.log(`| SMA 50 | ${formatNumber(sma50Value)} |`);
  console.log(`| RSI 14 | ${formatNumber(rsi14Value)} |`);
  console.log(`| Avg Volume 20 | ${avgVolume20 === null ? "-" : Math.round(avgVolume20).toString()} |`);
  console.log(`| Volume vs Avg 20 | ${formatPercent(volumeRatio === null ? null : volumeRatio * 100, 1)} |`);
  console.log(`| 20D Breakout Level | ${formatNumber(breakoutLevel)} |`);
  console.log(`| 20D Breakdown Level | ${formatNumber(breakdownLevel)} |`);
  console.log("");
  console.log("## Read");
  console.log("");
  if (trend === "bullish") {
    if (sma50Value === null) {
      console.log("- Price is above the 20-day average, so the short-term trend is positive.");
    } else {
      console.log("- Price is above both the 20-day and 50-day averages, with the short average above the longer one.");
    }
  } else if (trend === "bearish") {
    if (sma50Value === null) {
      console.log("- Price is below the 20-day average, so the short-term trend is negative.");
    } else {
      console.log("- Price is below both the 20-day and 50-day averages, with the short average below the longer one.");
    }
  } else if (trend === "mixed") {
    console.log("- Trend is mixed; price and moving averages are not aligned cleanly.");
  } else {
    console.log("- Trend classification needs more history.");
  }

  if (breakoutLevel !== null && latestClose > breakoutLevel) {
    console.log("- Latest close is above the prior 20-day high, which indicates a short-term breakout.");
  } else if (breakdownLevel !== null && latestClose < breakdownLevel) {
    console.log("- Latest close is below the prior 20-day low, which indicates a short-term breakdown.");
  } else {
    console.log("- Latest close remains inside the prior 20-day range.");
  }

  if (momentum === "overbought") {
    console.log("- RSI is elevated, so momentum is strong but crowding risk is higher.");
  } else if (momentum === "oversold") {
    console.log("- RSI is weak enough to suggest washed-out short-term positioning.");
  } else if (momentum === "neutral") {
    console.log("- RSI is in a neutral range and does not show an extreme short-term condition.");
  }

  if (volumeRegime === "heavy") {
    console.log("- Volume is running well above the 20-day average, so the latest move has strong participation.");
  } else if (volumeRegime === "light") {
    console.log("- Volume is well below the 20-day average, so the latest move has weaker participation.");
  } else if (volumeRegime === "normal") {
    console.log("- Volume is close to the 20-day average.");
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
