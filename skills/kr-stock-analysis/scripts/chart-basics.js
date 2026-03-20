#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const FONT_5X7 = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00110", "00110"],
  ",": ["00000", "00000", "00000", "00000", "00110", "00110", "00100"],
  ":": ["00000", "00110", "00110", "00000", "00110", "00110", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "%": ["11001", "11010", "00100", "01000", "10110", "00110", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "11100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00001", "00001", "00001", "00001", "10001", "10001", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
};

function parseArgs(argv) {
  const result = {
    chartBars: 120,
    width: 1600,
    height: 1100,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") {
      result.input = argv[i + 1];
      i += 1;
    } else if (arg === "--png-out") {
      result.pngOut = argv[i + 1];
      i += 1;
    } else if (arg === "--image-path") {
      result.imagePath = argv[i + 1];
      i += 1;
    } else if (arg === "--chart-bars") {
      result.chartBars = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--width") {
      result.width = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--height") {
      result.height = Number(argv[i + 1]);
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
    "  node chart-basics.js --input price-history.json [--png-out chart.png] [--image-path relative/path.png] [--chart-bars 120] [--width 1600] [--height 1100]",
    "",
    "Notes:",
    "  - The input JSON must include bars with date and close.",
    "  - high and low are required for Bollinger and Ichimoku overlays to be fully useful.",
    "  - volume is optional but recommended for volume panel and participation read.",
    "  - When --png-out is set, the script writes a labeled PNG and prints a markdown image snippet.",
  ].join("\n");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeBars(rawBars) {
  return [...rawBars]
    .map((bar) => ({
      date: String(bar.date),
      open: toOptionalNumber(bar.open),
      high: toOptionalNumber(bar.high),
      low: toOptionalNumber(bar.low),
      close: toOptionalNumber(bar.close),
      volume: toOptionalNumber(bar.volume),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function requireValidBars(bars) {
  if (!Array.isArray(bars) || bars.length < 5) {
    throw new Error("Input JSON must include at least 5 price bars.");
  }

  for (const bar of bars) {
    if (!bar.date) {
      throw new Error("Every bar must include a date.");
    }
    if (!Number.isFinite(bar.close)) {
      throw new Error("Every bar must include a numeric close field.");
    }
  }
}

function average(values) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function standardDeviation(values) {
  if (values.length === 0) {
    return null;
  }
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function windowValues(values, endIndex, period) {
  if (endIndex + 1 < period) {
    return null;
  }
  const slice = values.slice(endIndex + 1 - period, endIndex + 1);
  return slice.every((value) => Number.isFinite(value)) ? slice : null;
}

function rollingAverageSeries(values, period) {
  return values.map((_, index) => {
    const window = windowValues(values, index, period);
    return window ? average(window) : null;
  });
}

function rollingMaxSeries(values, period) {
  return values.map((_, index) => {
    const window = windowValues(values, index, period);
    return window ? Math.max(...window) : null;
  });
}

function rollingMinSeries(values, period) {
  return values.map((_, index) => {
    const window = windowValues(values, index, period);
    return window ? Math.min(...window) : null;
  });
}

function rsiSeries(values, period = 14) {
  return values.map((_, index) => {
    if (index < period) {
      return null;
    }
    let gains = 0;
    let losses = 0;
    for (let cursor = index + 1 - period; cursor <= index; cursor += 1) {
      const change = values[cursor] - values[cursor - 1];
      if (!Number.isFinite(change)) {
        return null;
      }
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
  });
}

function bollingerSeries(values, period = 20, multiplier = 2) {
  const middle = rollingAverageSeries(values, period);
  const upper = values.map((_, index) => {
    const window = windowValues(values, index, period);
    if (!window) {
      return null;
    }
    const mean = middle[index];
    const deviation = standardDeviation(window);
    return mean + multiplier * deviation;
  });
  const lower = values.map((_, index) => {
    const window = windowValues(values, index, period);
    if (!window) {
      return null;
    }
    const mean = middle[index];
    const deviation = standardDeviation(window);
    return mean - multiplier * deviation;
  });
  const bandwidth = upper.map((value, index) => {
    if (!Number.isFinite(value) || !Number.isFinite(lower[index]) || !Number.isFinite(middle[index]) || middle[index] === 0) {
      return null;
    }
    return (value - lower[index]) / middle[index];
  });
  return { middle, upper, lower, bandwidth };
}

function midpoint(highs, lows, index, period) {
  const highWindow = windowValues(highs, index, period);
  const lowWindow = windowValues(lows, index, period);
  if (!highWindow || !lowWindow) {
    return null;
  }
  return (Math.max(...highWindow) + Math.min(...lowWindow)) / 2;
}

function ichimokuSeries(highs, lows, closes) {
  const tenkan = closes.map((_, index) => midpoint(highs, lows, index, 9));
  const kijun = closes.map((_, index) => midpoint(highs, lows, index, 26));
  const senkouA = closes.map((_, index) => {
    if (!Number.isFinite(tenkan[index]) || !Number.isFinite(kijun[index])) {
      return null;
    }
    return (tenkan[index] + kijun[index]) / 2;
  });
  const senkouB = closes.map((_, index) => midpoint(highs, lows, index, 52));
  const chikou = closes.map((value) => value);
  return {
    tenkan,
    kijun,
    senkouA,
    senkouB,
    chikou,
    shift: 26,
  };
}

function lastFinite(values) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (Number.isFinite(values[index])) {
      return values[index];
    }
  }
  return null;
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return value.toFixed(digits);
}

function formatInteger(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return Math.round(value).toString();
}

function formatPercentRatio(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${(value * 100).toFixed(digits)}%`;
}

function formatAxisNumber(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return Math.round(value).toLocaleString("en-US");
}

function relationLabel(left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return "insufficient-data";
  }
  if (left > right) {
    return "above";
  }
  if (left < right) {
    return "below";
  }
  return "at";
}

function classifyVolume(volumeRatio) {
  if (!Number.isFinite(volumeRatio)) {
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

function classifyRsi(rsiValue) {
  if (!Number.isFinite(rsiValue)) {
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

function classifyMovingAverageStructure(close, maValues) {
  const { ma5, ma20, ma60, ma120 } = maValues;
  if (![close, ma5, ma20, ma60, ma120].every(Number.isFinite)) {
    return "insufficient-data";
  }
  if (close > ma5 && ma5 > ma20 && ma20 > ma60 && ma60 > ma120) {
    return "strong-bullish";
  }
  if (close < ma5 && ma5 < ma20 && ma20 < ma60 && ma60 < ma120) {
    return "strong-bearish";
  }
  if (close > ma20 && ma20 > ma60 && ma60 > ma120) {
    return "bullish";
  }
  if (close < ma20 && ma20 < ma60 && ma60 < ma120) {
    return "bearish";
  }
  if (close > ma20 && close < ma60) {
    return "rebound-inside-downtrend";
  }
  if (close < ma20 && close > ma60) {
    return "pullback-inside-uptrend";
  }
  return "mixed";
}

function classifyBollinger(latestClose, bollinger, bandwidthMedian60) {
  const upper = lastFinite(bollinger.upper);
  const middle = lastFinite(bollinger.middle);
  const lower = lastFinite(bollinger.lower);
  const bandwidth = lastFinite(bollinger.bandwidth);

  if (![latestClose, upper, middle, lower].every(Number.isFinite)) {
    return {
      state: "insufficient-data",
      bandPosition: null,
      bandwidth,
      bandwidthRegime: "insufficient-data",
      upper,
      middle,
      lower,
    };
  }

  const bandPosition = upper === lower ? 0.5 : (latestClose - lower) / (upper - lower);
  let state = "inside-bands";
  if (latestClose > upper) {
    state = "above-upper-band";
  } else if (latestClose < lower) {
    state = "below-lower-band";
  } else if (bandPosition >= 0.65) {
    state = "upper-half";
  } else if (bandPosition <= 0.35) {
    state = "lower-half";
  } else {
    state = "mid-band";
  }

  let bandwidthRegime = "normal";
  if (!Number.isFinite(bandwidth) || !Number.isFinite(bandwidthMedian60)) {
    bandwidthRegime = "insufficient-data";
  } else if (bandwidth >= bandwidthMedian60 * 1.25) {
    bandwidthRegime = "expanding";
  } else if (bandwidth <= bandwidthMedian60 * 0.8) {
    bandwidthRegime = "contracting";
  }

  return {
    state,
    bandPosition,
    bandwidth,
    bandwidthRegime,
    upper,
    middle,
    lower,
  };
}

function classifyIchimoku(latestClose, ichimoku, barsLength) {
  const latestIndex = barsLength - 1;
  const currentCloudIndex = latestIndex - ichimoku.shift;
  const tenkan = ichimoku.tenkan[latestIndex];
  const kijun = ichimoku.kijun[latestIndex];
  const currentCloudA = currentCloudIndex >= 0 ? ichimoku.senkouA[currentCloudIndex] : null;
  const currentCloudB = currentCloudIndex >= 0 ? ichimoku.senkouB[currentCloudIndex] : null;
  const futureCloudA = ichimoku.senkouA[latestIndex];
  const futureCloudB = ichimoku.senkouB[latestIndex];

  let cloudPosition = "insufficient-data";
  if ([latestClose, currentCloudA, currentCloudB].every(Number.isFinite)) {
    const cloudTop = Math.max(currentCloudA, currentCloudB);
    const cloudBottom = Math.min(currentCloudA, currentCloudB);
    if (latestClose > cloudTop) {
      cloudPosition = "above-cloud";
    } else if (latestClose < cloudBottom) {
      cloudPosition = "below-cloud";
    } else {
      cloudPosition = "inside-cloud";
    }
  }

  let tkCross = "insufficient-data";
  if ([tenkan, kijun].every(Number.isFinite)) {
    if (tenkan > kijun) {
      tkCross = "bullish";
    } else if (tenkan < kijun) {
      tkCross = "bearish";
    } else {
      tkCross = "flat";
    }
  }

  let futureCloudBias = "insufficient-data";
  if ([futureCloudA, futureCloudB].every(Number.isFinite)) {
    if (futureCloudA > futureCloudB) {
      futureCloudBias = "bullish";
    } else if (futureCloudA < futureCloudB) {
      futureCloudBias = "bearish";
    } else {
      futureCloudBias = "flat";
    }
  }

  return {
    tenkan,
    kijun,
    currentCloudA,
    currentCloudB,
    futureCloudA,
    futureCloudB,
    cloudPosition,
    tkCross,
    futureCloudBias,
  };
}

function classifyChartFlow(metrics) {
  let bullish = 0;
  let bearish = 0;

  if (metrics.movingAverageStructure === "strong-bullish") {
    bullish += 3;
  } else if (metrics.movingAverageStructure === "bullish") {
    bullish += 2;
  } else if (metrics.movingAverageStructure === "strong-bearish") {
    bearish += 3;
  } else if (metrics.movingAverageStructure === "bearish") {
    bearish += 2;
  } else if (metrics.movingAverageStructure === "rebound-inside-downtrend") {
    bullish += 1;
    bearish += 2;
  } else if (metrics.movingAverageStructure === "pullback-inside-uptrend") {
    bullish += 2;
    bearish += 1;
  }

  if (metrics.ichimoku.cloudPosition === "above-cloud") {
    bullish += 2;
  } else if (metrics.ichimoku.cloudPosition === "below-cloud") {
    bearish += 2;
  }

  if (metrics.ichimoku.tkCross === "bullish") {
    bullish += 1;
  } else if (metrics.ichimoku.tkCross === "bearish") {
    bearish += 1;
  }

  if (metrics.ichimoku.futureCloudBias === "bullish") {
    bullish += 1;
  } else if (metrics.ichimoku.futureCloudBias === "bearish") {
    bearish += 1;
  }

  if (metrics.bollinger.state === "above-upper-band" || metrics.bollinger.state === "upper-half") {
    bullish += 1;
  } else if (metrics.bollinger.state === "below-lower-band" || metrics.bollinger.state === "lower-half") {
    bearish += 1;
  }

  if (metrics.rsi14Value >= 60) {
    bullish += 1;
  } else if (metrics.rsi14Value <= 40) {
    bearish += 1;
  }

  if (metrics.volumeRatio >= 1.2) {
    if (metrics.latestClose >= metrics.ma20Value) {
      bullish += 1;
    } else {
      bearish += 1;
    }
  }

  if (bearish >= bullish + 3) {
    return "bearish continuation";
  }
  if (bullish >= bearish + 3) {
    return "bullish continuation";
  }
  if (bullish > bearish && metrics.latestClose < metrics.ma120Value) {
    return "technical rebound inside broader downtrend";
  }
  if (bearish > bullish && metrics.latestClose > metrics.ma120Value) {
    return "pullback inside broader uptrend";
  }
  return "range-bound or base-building";
}

function buildMetrics(bars) {
  const closes = bars.map((bar) => bar.close);
  const highs = bars.map((bar) => bar.high);
  const lows = bars.map((bar) => bar.low);
  const volumes = bars.map((bar) => bar.volume);
  const latest = bars[bars.length - 1];
  const latestClose = latest.close;

  const ma5Series = rollingAverageSeries(closes, 5);
  const ma20Series = rollingAverageSeries(closes, 20);
  const ma60Series = rollingAverageSeries(closes, 60);
  const ma120Series = rollingAverageSeries(closes, 120);
  const rsi14Series = rsiSeries(closes, 14);
  const volume20Series = rollingAverageSeries(volumes, 20);
  const bollinger = bollingerSeries(closes, 20, 2);
  const ichimoku = ichimokuSeries(highs, lows, closes);

  const latestIndex = bars.length - 1;
  const volumeRatio =
    Number.isFinite(volume20Series[latestIndex]) && Number.isFinite(latest.volume) && volume20Series[latestIndex] !== 0
      ? latest.volume / volume20Series[latestIndex]
      : null;

  const highWindow = windowValues(highs.slice(0, -1), highs.length - 2, 20);
  const lowWindow = windowValues(lows.slice(0, -1), lows.length - 2, 20);
  const breakoutLevel = highWindow ? Math.max(...highWindow) : null;
  const breakdownLevel = lowWindow ? Math.min(...lowWindow) : null;
  const bandwidthMedian60 = median(bollinger.bandwidth.filter(Number.isFinite).slice(-60));

  const maValues = {
    ma5: ma5Series[latestIndex],
    ma20: ma20Series[latestIndex],
    ma60: ma60Series[latestIndex],
    ma120: ma120Series[latestIndex],
  };

  const metrics = {
    latest,
    latestClose,
    closes,
    ma5Series,
    ma20Series,
    ma60Series,
    ma120Series,
    ma5Value: maValues.ma5,
    ma20Value: maValues.ma20,
    ma60Value: maValues.ma60,
    ma120Value: maValues.ma120,
    movingAverageStructure: classifyMovingAverageStructure(latestClose, maValues),
    rsi14Series,
    rsi14Value: rsi14Series[latestIndex],
    rsiState: classifyRsi(rsi14Series[latestIndex]),
    avgVolume20: volume20Series[latestIndex],
    volumeRatio,
    volumeRegime: classifyVolume(volumeRatio),
    breakoutLevel,
    breakdownLevel,
    bollinger,
    bollinger: classifyBollinger(latestClose, bollinger, bandwidthMedian60),
    bollingerSeriesData: bollinger,
    ichimoku,
    ichimoku: classifyIchimoku(latestClose, ichimoku, bars.length),
    ichimokuSeriesData: ichimoku,
    hasVolumeHistory: Number.isFinite(volume20Series[latestIndex]),
    hasBreakoutHistory: Number.isFinite(breakoutLevel) && Number.isFinite(breakdownLevel),
  };

  metrics.chartFlow = classifyChartFlow(metrics);
  return metrics;
}

function createRgbaBuffer(width, height, background) {
  const buffer = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    buffer[offset] = background[0];
    buffer[offset + 1] = background[1];
    buffer[offset + 2] = background[2];
    buffer[offset + 3] = background[3];
  }
  return buffer;
}

function blendPixel(buffer, width, height, x, y, color) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }
  const offset = (Math.floor(y) * width + Math.floor(x)) * 4;
  const alpha = (color[3] ?? 255) / 255;
  const invAlpha = 1 - alpha;
  buffer[offset] = Math.round(color[0] * alpha + buffer[offset] * invAlpha);
  buffer[offset + 1] = Math.round(color[1] * alpha + buffer[offset + 1] * invAlpha);
  buffer[offset + 2] = Math.round(color[2] * alpha + buffer[offset + 2] * invAlpha);
  buffer[offset + 3] = 255;
}

function fillRect(buffer, width, height, x, y, rectWidth, rectHeight, color) {
  const startX = Math.max(0, Math.floor(x));
  const startY = Math.max(0, Math.floor(y));
  const endX = Math.min(width, Math.ceil(x + rectWidth));
  const endY = Math.min(height, Math.ceil(y + rectHeight));

  for (let row = startY; row < endY; row += 1) {
    for (let col = startX; col < endX; col += 1) {
      blendPixel(buffer, width, height, col, row, color);
    }
  }
}

function drawLine(buffer, width, height, x0, y0, x1, y1, color, thickness = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);

  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(x0 + (dx * step) / steps);
    const y = Math.round(y0 + (dy * step) / steps);
    for (let offsetX = -Math.floor(thickness / 2); offsetX <= Math.floor(thickness / 2); offsetX += 1) {
      for (let offsetY = -Math.floor(thickness / 2); offsetY <= Math.floor(thickness / 2); offsetY += 1) {
        blendPixel(buffer, width, height, x + offsetX, y + offsetY, color);
      }
    }
  }
}

function drawSeries(buffer, width, height, points, color, thickness = 2) {
  let previous = null;
  for (const point of points) {
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      if (previous) {
        drawLine(buffer, width, height, previous.x, previous.y, point.x, point.y, color, thickness);
      }
      previous = point;
    } else {
      previous = null;
    }
  }
}

function drawVerticalBand(buffer, width, height, x, y1, y2, color, thickness = 2) {
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  fillRect(buffer, width, height, x - Math.floor(thickness / 2), top, thickness, bottom - top + 1, color);
}

function drawFilledBand(buffer, width, height, upperPoints, lowerPoints, color) {
  for (let index = 0; index < upperPoints.length; index += 1) {
    const upper = upperPoints[index];
    const lower = lowerPoints[index];
    if (upper && lower && Number.isFinite(upper.x) && Number.isFinite(upper.y) && Number.isFinite(lower.y)) {
      drawVerticalBand(buffer, width, height, Math.round(upper.x), upper.y, lower.y, color, 2);
    }
  }
}

function glyphWidth() {
  return 5;
}

function measureText(text, scale = 1) {
  if (!text) {
    return 0;
  }
  return text.length * (glyphWidth() + 1) * scale - scale;
}

function drawText(buffer, width, height, x, y, text, color, scale = 1, align = "left") {
  const upper = String(text).toUpperCase();
  let cursorX = x;
  if (align === "center") {
    cursorX -= Math.round(measureText(upper, scale) / 2);
  } else if (align === "right") {
    cursorX -= measureText(upper, scale);
  }

  for (const character of upper) {
    const glyph = FONT_5X7[character] || FONT_5X7["?"];
    glyph.forEach((row, rowIndex) => {
      for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
        if (row[columnIndex] === "1") {
          fillRect(
            buffer,
            width,
            height,
            cursorX + columnIndex * scale,
            y + rowIndex * scale,
            scale,
            scale,
            color,
          );
        }
      }
    });
    cursorX += (glyphWidth() + 1) * scale;
  }
}

function drawLegendItem(buffer, width, height, x, y, color, label) {
  fillRect(buffer, width, height, x, y + 4, 16, 6, color);
  drawText(buffer, width, height, x + 24, y, label, [51, 65, 85, 255], 2);
  return x + 24 + measureText(label, 2) + 22;
}

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let current = index;
    for (let bit = 0; bit < 8; bit += 1) {
      if (current & 1) {
        current = 0xedb88320 ^ (current >>> 1);
      } else {
        current >>>= 1;
      }
    }
    table[index] = current >>> 0;
  }
  return table;
}

const CRC_TABLE = buildCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng(width, height, rgbaBuffer) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const rawOffset = row * (stride + 1);
    raw[rawOffset] = 0;
    rgbaBuffer.copy(raw, rawOffset + 1, row * stride, row * stride + stride);
  }

  return Buffer.concat([
    header,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", zlib.deflateSync(raw)),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pickTickIndices(length, count) {
  if (length <= 0) {
    return [];
  }
  const target = Math.min(count, length);
  const indices = new Set([0, length - 1]);
  if (target > 2) {
    for (let slot = 1; slot < target - 1; slot += 1) {
      indices.add(Math.round((slot * (length - 1)) / (target - 1)));
    }
  }
  return [...indices].sort((a, b) => a - b);
}

function dateLabel(dateString) {
  return dateString.slice(5);
}

function valueToY(value, minValue, maxValue, top, height) {
  return top + ((maxValue - value) / (maxValue - minValue)) * height;
}

function nonNullPoint(x, value, minValue, maxValue, top, height) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return {
    x,
    y: valueToY(value, minValue, maxValue, top, height),
  };
}

function mapSeriesToPoints(series, xForSlot, slotOffset, minValue, maxValue, top, height, totalSlots) {
  const points = Array.from({ length: totalSlots }, () => null);
  series.forEach((value, index) => {
    const slot = index + slotOffset;
    if (slot >= 0 && slot < totalSlots && Number.isFinite(value)) {
      points[slot] = nonNullPoint(xForSlot(slot), value, minValue, maxValue, top, height);
    }
  });
  return points;
}

function buildChartPng(data, bars, metrics, options) {
  const width = options.width;
  const height = options.height;
  const chartBars = Math.max(30, options.chartBars);
  const barsWindow = bars.slice(-Math.min(chartBars, bars.length));
  const startIndex = bars.length - barsWindow.length;
  const leadSlots = 26;
  const totalSlots = barsWindow.length + leadSlots;

  const theme = {
    background: [248, 250, 252, 255],
    panel: [255, 255, 255, 255],
    border: [203, 213, 225, 255],
    grid: [226, 232, 240, 255],
    text: [30, 41, 59, 255],
    muted: [100, 116, 139, 255],
    close: [30, 64, 175, 255],
    ma5: [234, 88, 12, 255],
    ma20: [14, 165, 233, 255],
    ma60: [126, 34, 206, 255],
    ma120: [71, 85, 105, 255],
    bollinger: [16, 185, 129, 255],
    bollingerFill: [16, 185, 129, 32],
    tenkan: [220, 38, 38, 255],
    kijun: [217, 119, 6, 255],
    senkouA: [34, 197, 94, 220],
    senkouB: [239, 68, 68, 220],
    cloudBull: [34, 197, 94, 42],
    cloudBear: [239, 68, 68, 42],
    chikou: [99, 102, 241, 150],
    volumeUp: [34, 197, 94, 255],
    volumeDown: [239, 68, 68, 255],
    rsi: [124, 58, 237, 255],
    rsiGuide: [148, 163, 184, 255],
  };

  const buffer = createRgbaBuffer(width, height, theme.background);
  const margin = { left: 100, right: 120, top: 84, bottom: 78 };
  const plotWidth = width - margin.left - margin.right;
  const headerHeight = 92;
  const gap = 26;
  const priceHeight = 520;
  const volumeHeight = 150;
  const rsiHeight = 150;
  const priceTop = margin.top + headerHeight;
  const volumeTop = priceTop + priceHeight + gap;
  const rsiTop = volumeTop + volumeHeight + gap;

  fillRect(buffer, width, height, margin.left, priceTop, plotWidth, priceHeight, theme.panel);
  fillRect(buffer, width, height, margin.left, volumeTop, plotWidth, volumeHeight, theme.panel);
  fillRect(buffer, width, height, margin.left, rsiTop, plotWidth, rsiHeight, theme.panel);

  drawLine(buffer, width, height, margin.left, priceTop, margin.left + plotWidth, priceTop, theme.border, 1);
  drawLine(buffer, width, height, margin.left, priceTop + priceHeight, margin.left + plotWidth, priceTop + priceHeight, theme.border, 1);
  drawLine(buffer, width, height, margin.left, volumeTop, margin.left + plotWidth, volumeTop, theme.border, 1);
  drawLine(buffer, width, height, margin.left, volumeTop + volumeHeight, margin.left + plotWidth, volumeTop + volumeHeight, theme.border, 1);
  drawLine(buffer, width, height, margin.left, rsiTop, margin.left + plotWidth, rsiTop, theme.border, 1);
  drawLine(buffer, width, height, margin.left, rsiTop + rsiHeight, margin.left + plotWidth, rsiTop + rsiHeight, theme.border, 1);
  drawLine(buffer, width, height, margin.left, priceTop, margin.left, rsiTop + rsiHeight, theme.border, 1);
  drawLine(buffer, width, height, margin.left + plotWidth, priceTop, margin.left + plotWidth, rsiTop + rsiHeight, theme.border, 1);

  const xForSlot = (slot) => {
    if (totalSlots <= 1) {
      return margin.left + plotWidth / 2;
    }
    return margin.left + (plotWidth * slot) / (totalSlots - 1);
  };

  const priceCandidateValues = [];
  const priceSeries = {
    close: barsWindow.map((bar) => bar.close),
    ma5: metrics.ma5Series.slice(startIndex),
    ma20: metrics.ma20Series.slice(startIndex),
    ma60: metrics.ma60Series.slice(startIndex),
    ma120: metrics.ma120Series.slice(startIndex),
    bbUpper: metrics.bollingerSeriesData.upper.slice(startIndex),
    bbLower: metrics.bollingerSeriesData.lower.slice(startIndex),
    tenkan: metrics.ichimokuSeriesData.tenkan.slice(startIndex),
    kijun: metrics.ichimokuSeriesData.kijun.slice(startIndex),
    chikou: metrics.ichimokuSeriesData.chikou.slice(startIndex),
  };

  barsWindow.forEach((bar) => {
    ["high", "low", "close"].forEach((key) => {
      if (Number.isFinite(bar[key])) {
        priceCandidateValues.push(bar[key]);
      }
    });
  });

  Object.values(priceSeries).forEach((series) => {
    series.forEach((value) => {
      if (Number.isFinite(value)) {
        priceCandidateValues.push(value);
      }
    });
  });

  metrics.ichimokuSeriesData.senkouA.slice(startIndex).forEach((value) => {
    if (Number.isFinite(value)) {
      priceCandidateValues.push(value);
    }
  });
  metrics.ichimokuSeriesData.senkouB.slice(startIndex).forEach((value) => {
    if (Number.isFinite(value)) {
      priceCandidateValues.push(value);
    }
  });

  let priceMin = Math.min(...priceCandidateValues);
  let priceMax = Math.max(...priceCandidateValues);
  if (priceMin === priceMax) {
    priceMin -= 1;
    priceMax += 1;
  }
  const pricePadding = (priceMax - priceMin) * 0.08;
  priceMin -= pricePadding;
  priceMax += pricePadding;

  const volumeMax = Math.max(...barsWindow.map((bar) => (Number.isFinite(bar.volume) ? bar.volume : 0)), 1);

  drawText(buffer, width, height, margin.left, margin.top + 4, `CHART ${data.ticker || "UNKNOWN"}`, theme.text, 3);
  drawText(buffer, width, height, margin.left, margin.top + 34, `AS OF ${metrics.latest.date}`, theme.muted, 2);
  drawText(buffer, width, height, margin.left + plotWidth, margin.top + 10, "PRICE / VOLUME / RSI", theme.muted, 2, "right");

  const legendRow1Y = margin.top + 52;
  const legendRow2Y = margin.top + 72;
  let legendX = margin.left;
  legendX = drawLegendItem(buffer, width, height, legendX, legendRow1Y, theme.close, "CLOSE");
  legendX = drawLegendItem(buffer, width, height, legendX, legendRow1Y, theme.ma5, "MA5");
  legendX = drawLegendItem(buffer, width, height, legendX, legendRow1Y, theme.ma20, "MA20");
  legendX = drawLegendItem(buffer, width, height, legendX, legendRow1Y, theme.ma60, "MA60");
  legendX = drawLegendItem(buffer, width, height, legendX, legendRow1Y, theme.ma120, "MA120");

  legendX = margin.left;
  legendX = drawLegendItem(buffer, width, height, legendX, legendRow2Y, theme.bollinger, "BB");
  legendX = drawLegendItem(buffer, width, height, legendX, legendRow2Y, theme.tenkan, "TENKAN");
  legendX = drawLegendItem(buffer, width, height, legendX, legendRow2Y, theme.kijun, "KIJUN");
  legendX = drawLegendItem(buffer, width, height, legendX, legendRow2Y, theme.senkouA, "SENKOU A");
  legendX = drawLegendItem(buffer, width, height, legendX, legendRow2Y, theme.senkouB, "SENKOU B");

  drawText(buffer, width, height, margin.left - 72, priceTop + 6, "PRICE", theme.muted, 2);
  drawText(buffer, width, height, margin.left - 78, volumeTop + 6, "VOLUME", theme.muted, 2);
  drawText(buffer, width, height, margin.left - 54, rsiTop + 6, "RSI14", theme.muted, 2);

  for (let tick = 0; tick <= 4; tick += 1) {
    const y = priceTop + (priceHeight * tick) / 4;
    drawLine(buffer, width, height, margin.left, y, margin.left + plotWidth, y, theme.grid, 1);
    const value = priceMax - ((priceMax - priceMin) * tick) / 4;
    drawText(buffer, width, height, margin.left + plotWidth + 10, y - 7, formatAxisNumber(value), theme.muted, 2);
  }

  for (let tick = 0; tick <= 2; tick += 1) {
    const y = volumeTop + (volumeHeight * tick) / 2;
    drawLine(buffer, width, height, margin.left, y, margin.left + plotWidth, y, theme.grid, 1);
    const value = Math.round(volumeMax - (volumeMax * tick) / 2);
    drawText(buffer, width, height, margin.left + plotWidth + 10, y - 7, formatAxisNumber(value), theme.muted, 2);
  }

  [30, 50, 70].forEach((level) => {
    const y = valueToY(level, 0, 100, rsiTop, rsiHeight);
    drawLine(buffer, width, height, margin.left, y, margin.left + plotWidth, y, theme.rsiGuide, 1);
    drawText(buffer, width, height, margin.left + plotWidth + 10, y - 7, String(level), theme.muted, 2);
  });

  const dateTickIndices = pickTickIndices(barsWindow.length, 6);
  dateTickIndices.forEach((index) => {
    const slot = index;
    const x = xForSlot(slot);
    drawLine(buffer, width, height, x, priceTop, x, rsiTop + rsiHeight, theme.grid, 1);
    drawText(buffer, width, height, x, rsiTop + rsiHeight + 14, dateLabel(barsWindow[index].date), theme.muted, 2, "center");
  });
  drawText(buffer, width, height, margin.left + plotWidth / 2, rsiTop + rsiHeight + 42, "DATE", theme.muted, 2, "center");

  const totalPoints = totalSlots;
  const closePoints = mapSeriesToPoints(priceSeries.close, xForSlot, 0, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const ma5Points = mapSeriesToPoints(priceSeries.ma5, xForSlot, 0, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const ma20Points = mapSeriesToPoints(priceSeries.ma20, xForSlot, 0, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const ma60Points = mapSeriesToPoints(priceSeries.ma60, xForSlot, 0, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const ma120Points = mapSeriesToPoints(priceSeries.ma120, xForSlot, 0, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const bbUpperPoints = mapSeriesToPoints(priceSeries.bbUpper, xForSlot, 0, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const bbLowerPoints = mapSeriesToPoints(priceSeries.bbLower, xForSlot, 0, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const tenkanPoints = mapSeriesToPoints(priceSeries.tenkan, xForSlot, 0, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const kijunPoints = mapSeriesToPoints(priceSeries.kijun, xForSlot, 0, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const chikouPoints = mapSeriesToPoints(priceSeries.chikou, xForSlot, -26, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const senkouAPoints = mapSeriesToPoints(metrics.ichimokuSeriesData.senkouA.slice(startIndex), xForSlot, 26, priceMin, priceMax, priceTop, priceHeight, totalPoints);
  const senkouBPoints = mapSeriesToPoints(metrics.ichimokuSeriesData.senkouB.slice(startIndex), xForSlot, 26, priceMin, priceMax, priceTop, priceHeight, totalPoints);

  drawFilledBand(buffer, width, height, bbUpperPoints, bbLowerPoints, theme.bollingerFill);
  const cloudUpperPoints = [];
  const cloudLowerPoints = [];
  const cloudColors = [];
  for (let index = 0; index < totalPoints; index += 1) {
    const aPoint = senkouAPoints[index];
    const bPoint = senkouBPoints[index];
    if (aPoint && bPoint) {
      cloudUpperPoints[index] = aPoint.y <= bPoint.y ? aPoint : bPoint;
      cloudLowerPoints[index] = aPoint.y > bPoint.y ? aPoint : bPoint;
      cloudColors[index] = aPoint.y <= bPoint.y ? theme.cloudBull : theme.cloudBear;
    } else {
      cloudUpperPoints[index] = null;
      cloudLowerPoints[index] = null;
      cloudColors[index] = null;
    }
  }
  for (let index = 0; index < totalPoints; index += 1) {
    if (cloudUpperPoints[index] && cloudLowerPoints[index]) {
      drawVerticalBand(
        buffer,
        width,
        height,
        Math.round(cloudUpperPoints[index].x),
        cloudUpperPoints[index].y,
        cloudLowerPoints[index].y,
        cloudColors[index],
        3,
      );
    }
  }

  drawSeries(buffer, width, height, bbUpperPoints, theme.bollinger, 2);
  drawSeries(buffer, width, height, bbLowerPoints, theme.bollinger, 2);
  drawSeries(buffer, width, height, senkouAPoints, theme.senkouA, 2);
  drawSeries(buffer, width, height, senkouBPoints, theme.senkouB, 2);
  drawSeries(buffer, width, height, chikouPoints, theme.chikou, 2);
  drawSeries(buffer, width, height, ma120Points, theme.ma120, 2);
  drawSeries(buffer, width, height, ma60Points, theme.ma60, 2);
  drawSeries(buffer, width, height, ma20Points, theme.ma20, 2);
  drawSeries(buffer, width, height, ma5Points, theme.ma5, 2);
  drawSeries(buffer, width, height, tenkanPoints, theme.tenkan, 2);
  drawSeries(buffer, width, height, kijunPoints, theme.kijun, 2);
  drawSeries(buffer, width, height, closePoints, theme.close, 3);

  const latestClosePoint = closePoints[barsWindow.length - 1];
  if (latestClosePoint) {
    fillRect(buffer, width, height, latestClosePoint.x - 4, latestClosePoint.y - 4, 8, 8, theme.close);
    drawText(
      buffer,
      width,
      height,
      margin.left + plotWidth + 10,
      latestClosePoint.y - 7,
      formatAxisNumber(metrics.latestClose),
      theme.close,
      2,
    );
  }

  const volumeBarWidth = Math.max(3, Math.floor(plotWidth / Math.max(barsWindow.length * 1.8, 1)));
  barsWindow.forEach((bar, index) => {
    if (!Number.isFinite(bar.volume)) {
      return;
    }
    const x = xForSlot(index);
    const previousClose = index === 0 ? bar.close : barsWindow[index - 1].close;
    const color = bar.close >= previousClose ? theme.volumeUp : theme.volumeDown;
    const barHeight = Math.max(2, Math.round((bar.volume / volumeMax) * (volumeHeight - 4)));
    fillRect(buffer, width, height, x - volumeBarWidth / 2, volumeTop + volumeHeight - barHeight, volumeBarWidth, barHeight, color);
  });

  const rsiPoints = mapSeriesToPoints(metrics.rsi14Series.slice(startIndex), xForSlot, 0, 0, 100, rsiTop, rsiHeight, totalPoints);
  drawSeries(buffer, width, height, rsiPoints, theme.rsi, 3);
  const latestRsiPoint = rsiPoints[barsWindow.length - 1];
  if (latestRsiPoint) {
    fillRect(buffer, width, height, latestRsiPoint.x - 4, latestRsiPoint.y - 4, 8, 8, theme.rsi);
  }

  const png = encodePng(width, height, buffer);
  fs.mkdirSync(path.dirname(options.pngOut), { recursive: true });
  fs.writeFileSync(options.pngOut, png);

  return {
    imagePath: options.imagePath || path.basename(options.pngOut),
    chartBarsUsed: barsWindow.length,
    leadBarsUsed: leadSlots,
  };
}

function renderRead(metrics) {
  const maLine = (() => {
    if (metrics.movingAverageStructure === "strong-bullish") {
      return `- Moving averages are stacked bullishly: price is above MA5, MA20, MA60, and MA120, which is a strong trend-following structure.`;
    }
    if (metrics.movingAverageStructure === "strong-bearish") {
      return `- Moving averages are stacked bearishly: price is below MA5, MA20, MA60, and MA120, so the primary trend is still down.`;
    }
    if (metrics.movingAverageStructure === "rebound-inside-downtrend") {
      return `- The short-term setup looks like a rebound attempt, but price still sits inside a broader downtrend when read against MA60 and MA120.`;
    }
    if (metrics.movingAverageStructure === "pullback-inside-uptrend") {
      return `- Price is pulling back inside a broader uptrend rather than breaking the long trend outright.`;
    }
    if (metrics.movingAverageStructure === "bullish") {
      return `- Price is above the medium and long moving averages, which keeps the trend constructive even if the very short-term line is noisy.`;
    }
    if (metrics.movingAverageStructure === "bearish") {
      return `- Price is below the medium and long moving averages, so rallies still need to prove they are more than short-term rebounds.`;
    }
    return `- Moving-average structure is mixed or incomplete, so trend confirmation is limited.`;
  })();

  const bollingerLine = (() => {
    if (metrics.bollinger.state === "above-upper-band") {
      return `- Bollinger Bands show price pushing above the upper band, which usually means strong momentum but also higher short-term crowding risk.`;
    }
    if (metrics.bollinger.state === "below-lower-band") {
      return `- Bollinger Bands show price below the lower band, which usually means breakdown pressure or a washed-out oversold condition.`;
    }
    const positionText =
      metrics.bollinger.state === "upper-half"
        ? "the upper half of the band"
        : metrics.bollinger.state === "lower-half"
          ? "the lower half of the band"
          : "the middle band";
    const widthText =
      metrics.bollinger.bandwidthRegime === "expanding"
        ? "Band width is expanding, so volatility is widening."
        : metrics.bollinger.bandwidthRegime === "contracting"
          ? "Band width is contracting, so volatility is compressing."
          : "Band width is not showing an extreme expansion or squeeze.";
    return `- Bollinger Bands place price near ${positionText}. ${widthText}`;
  })();

  const ichimokuLine = (() => {
    if (metrics.ichimoku.cloudPosition === "insufficient-data") {
      return `- Ichimoku read is limited because current cloud values need more high-low history.`;
    }
    const cloudText =
      metrics.ichimoku.cloudPosition === "above-cloud"
        ? "Price is above the current cloud"
        : metrics.ichimoku.cloudPosition === "below-cloud"
          ? "Price is below the current cloud"
          : "Price is inside the current cloud";
    const tkText =
      metrics.ichimoku.tkCross === "bullish"
        ? "Tenkan is above Kijun"
        : metrics.ichimoku.tkCross === "bearish"
          ? "Tenkan is below Kijun"
          : "Tenkan and Kijun are flat to each other";
    const futureText =
      metrics.ichimoku.futureCloudBias === "bullish"
        ? "the projected cloud is bullish"
        : metrics.ichimoku.futureCloudBias === "bearish"
          ? "the projected cloud is bearish"
          : "the projected cloud is flat or unclear";
    return `- Ichimoku shows that ${cloudText.toLowerCase()}, ${tkText.toLowerCase()}, and ${futureText}.`;
  })();

  const participationLine = (() => {
    const rsiText =
      metrics.rsiState === "overbought"
        ? "RSI is overbought"
        : metrics.rsiState === "oversold"
          ? "RSI is oversold"
          : metrics.rsiState === "neutral"
            ? "RSI is neutral"
            : "RSI is unavailable";
    const volumeText =
      metrics.volumeRegime === "heavy"
        ? "volume is running heavy versus the 20-day average"
        : metrics.volumeRegime === "light"
          ? "volume is light versus the 20-day average"
          : metrics.volumeRegime === "normal"
            ? "volume is close to the 20-day average"
            : "volume comparison is unavailable";
    return `- Momentum and participation: ${rsiText}, and ${volumeText}.`;
  })();

  const flowLine = (() => {
    if (metrics.chartFlow === "bullish continuation") {
      return `- Chart-only flow: this still reads like bullish continuation rather than a late counter-trend bounce.`;
    }
    if (metrics.chartFlow === "bearish continuation") {
      return `- Chart-only flow: this still reads like bearish continuation, and the stock has not yet regained a reliable trend-following structure.`;
    }
    if (metrics.chartFlow === "technical rebound inside broader downtrend") {
      return `- Chart-only flow: this looks like a technical rebound attempt inside a larger downtrend, so resistance levels matter more than breakout excitement.`;
    }
    if (metrics.chartFlow === "pullback inside broader uptrend") {
      return `- Chart-only flow: this looks more like a pullback inside a bigger uptrend than a full trend break.`;
    }
    return `- Chart-only flow: this looks range-bound or base-building, so confirmation matters more than prediction.`;
  })();

  console.log(maLine);
  console.log(bollingerLine);
  console.log(ichimokuLine);
  console.log(participationLine);
  console.log(flowLine);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  if (!Number.isInteger(args.chartBars) || args.chartBars < 30) {
    throw new Error("--chart-bars must be an integer of at least 30.");
  }
  if (!Number.isInteger(args.width) || args.width < 800) {
    throw new Error("--width must be an integer of at least 800.");
  }
  if (!Number.isInteger(args.height) || args.height < 700) {
    throw new Error("--height must be an integer of at least 700.");
  }

  const data = readJson(args.input);
  const bars = normalizeBars(data.bars || []);
  requireValidBars(bars);
  const metrics = buildMetrics(bars);
  const pngInfo = args.pngOut ? buildChartPng(data, bars, metrics, args) : null;

  console.log(`# Advanced Chart Analysis: ${data.ticker || "Unknown"}`);
  console.log("");
  if (data.name) {
    console.log(`- Name: ${data.name}`);
  }
  console.log(`- Latest date: ${metrics.latest.date}`);
  console.log(`- Latest close: ${formatNumber(metrics.latestClose)}`);
  console.log(`- Moving-average structure: ${metrics.movingAverageStructure}`);
  console.log(`- Bollinger read: ${metrics.bollinger.state}`);
  console.log(`- Ichimoku read: ${metrics.ichimoku.cloudPosition}`);
  console.log(`- RSI state: ${metrics.rsiState}`);
  console.log(`- Volume regime: ${metrics.volumeRegime}`);
  console.log(`- Chart-only flow: ${metrics.chartFlow}`);
  console.log("");

  if (pngInfo) {
    console.log("## Chart Image");
    console.log("");
    console.log(`![${data.name || data.ticker || "Chart"} price chart](${pngInfo.imagePath})`);
    console.log("");
    console.log(
      `The PNG includes labeled price, volume, and RSI panels, plus MA5, MA20, MA60, MA120, Bollinger Bands, and Ichimoku overlays. The price panel also reserves ${pngInfo.leadBarsUsed} forward slots for the projected Ichimoku cloud.`,
    );
    console.log("");
  }

  console.log("## Indicators");
  console.log("");
  console.log("| Metric | Value |");
  console.log("| --- | --- |");
  console.log(`| MA 5 | ${formatNumber(metrics.ma5Value)} |`);
  console.log(`| MA 20 | ${formatNumber(metrics.ma20Value)} |`);
  console.log(`| MA 60 | ${formatNumber(metrics.ma60Value)} |`);
  console.log(`| MA 120 | ${formatNumber(metrics.ma120Value)} |`);
  console.log(`| Bollinger Upper | ${formatNumber(metrics.bollinger.upper)} |`);
  console.log(`| Bollinger Middle | ${formatNumber(metrics.bollinger.middle)} |`);
  console.log(`| Bollinger Lower | ${formatNumber(metrics.bollinger.lower)} |`);
  console.log(`| Bollinger Width | ${formatPercentRatio(metrics.bollinger.bandwidth, 2)} |`);
  console.log(`| Tenkan | ${formatNumber(metrics.ichimoku.tenkan)} |`);
  console.log(`| Kijun | ${formatNumber(metrics.ichimoku.kijun)} |`);
  console.log(`| Current Cloud A | ${formatNumber(metrics.ichimoku.currentCloudA)} |`);
  console.log(`| Current Cloud B | ${formatNumber(metrics.ichimoku.currentCloudB)} |`);
  console.log(`| Future Cloud A | ${formatNumber(metrics.ichimoku.futureCloudA)} |`);
  console.log(`| Future Cloud B | ${formatNumber(metrics.ichimoku.futureCloudB)} |`);
  console.log(`| RSI 14 | ${formatNumber(metrics.rsi14Value)} |`);
  console.log(`| Avg Volume 20 | ${formatInteger(metrics.avgVolume20)} |`);
  console.log(`| Volume vs Avg 20 | ${formatPercentRatio(metrics.volumeRatio, 1)} |`);
  console.log(`| 20D Breakout Level | ${formatNumber(metrics.breakoutLevel)} |`);
  console.log(`| 20D Breakdown Level | ${formatNumber(metrics.breakdownLevel)} |`);
  console.log("");

  console.log("## Read");
  console.log("");
  renderRead(metrics);
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
