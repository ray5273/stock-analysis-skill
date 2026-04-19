#!/usr/bin/env node

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const {
  normalizeBars: normalizeTechnicalBars,
  requireValidBars: requireValidTechnicalBars,
  buildMetrics: buildTechnicalMetrics,
} = require("./lib/technical-core");

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

const JAMO_5X5 = {
  "ㄱ": ["11110", "10000", "10000", "10000", "00000"],
  "ㄴ": ["10000", "10000", "10000", "11110", "00000"],
  "ㄷ": ["11110", "10000", "10000", "11110", "00000"],
  "ㄹ": ["11110", "10000", "11110", "00010", "11110"],
  "ㅁ": ["11110", "10010", "10010", "11110", "00000"],
  "ㅂ": ["11110", "10010", "11110", "10010", "11110"],
  "ㅅ": ["00100", "01010", "10001", "00000", "00000"],
  "ㅇ": ["01110", "10001", "10001", "01110", "00000"],
  "ㅈ": ["11111", "00100", "01010", "10001", "00000"],
  "ㅊ": ["00100", "11111", "01010", "10001", "00000"],
  "ㅋ": ["11110", "10000", "11100", "10000", "00000"],
  "ㅌ": ["11110", "10000", "11110", "10000", "11110"],
  "ㅍ": ["10010", "10010", "11110", "10010", "10010"],
  "ㅎ": ["11111", "00100", "01110", "10001", "01110"],
  "ㅏ": ["00100", "00100", "11100", "00100", "00100"],
  "ㅐ": ["01100", "01100", "11100", "01100", "01100"],
  "ㅑ": ["00100", "11100", "00100", "11100", "00100"],
  "ㅒ": ["01100", "11100", "01100", "11100", "01100"],
  "ㅓ": ["00100", "00100", "00111", "00100", "00100"],
  "ㅔ": ["00110", "00110", "00111", "00110", "00110"],
  "ㅕ": ["00100", "00111", "00100", "00111", "00100"],
  "ㅖ": ["00110", "00111", "00110", "00111", "00110"],
  "ㅗ": ["11111", "00100", "00100", "00000", "00000"],
  "ㅛ": ["11111", "01010", "01010", "00000", "00000"],
  "ㅜ": ["00000", "00000", "00100", "00100", "11111"],
  "ㅠ": ["00000", "00000", "01010", "01010", "11111"],
  "ㅡ": ["00000", "00000", "11111", "00000", "00000"],
  "ㅣ": ["00100", "00100", "00100", "00100", "00100"],
};

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const HANGUL_INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const HANGUL_MEDIALS = [
  ["ㅏ"], ["ㅐ"], ["ㅑ"], ["ㅒ"], ["ㅓ"], ["ㅔ"], ["ㅕ"], ["ㅖ"], ["ㅗ"], ["ㅗ", "ㅏ"], ["ㅗ", "ㅐ"], ["ㅗ", "ㅣ"],
  ["ㅛ"], ["ㅜ"], ["ㅜ", "ㅓ"], ["ㅜ", "ㅔ"], ["ㅜ", "ㅣ"], ["ㅠ"], ["ㅡ"], ["ㅡ", "ㅣ"], ["ㅣ"],
];
const HANGUL_FINALS = [
  [], ["ㄱ"], ["ㄲ"], ["ㄱ", "ㅅ"], ["ㄴ"], ["ㄴ", "ㅈ"], ["ㄴ", "ㅎ"], ["ㄷ"], ["ㄹ"], ["ㄹ", "ㄱ"], ["ㄹ", "ㅁ"], ["ㄹ", "ㅂ"],
  ["ㄹ", "ㅅ"], ["ㄹ", "ㅌ"], ["ㄹ", "ㅍ"], ["ㄹ", "ㅎ"], ["ㅁ"], ["ㅂ"], ["ㅂ", "ㅅ"], ["ㅅ"], ["ㅆ"], ["ㅇ"], ["ㅈ"], ["ㅊ"], ["ㅋ"], ["ㅌ"], ["ㅍ"], ["ㅎ"],
];
const EXTERNAL_TEXT_HELPER_PY = path.resolve(__dirname, "render-text-mask.py");
const EXTERNAL_TEXT_HELPER_PS1 = path.resolve(__dirname, "render-text-mask.ps1");
const EXTERNAL_FONT_CANDIDATES = [
  process.env.KR_STOCK_CHART_FONT,
  "C:\\Windows\\Fonts\\malgun.ttf",
  "C:\\Windows\\Fonts\\malgunbd.ttf",
  "C:\\Windows\\Fonts\\NanumGothic.ttf",
  "C:\\Windows\\Fonts\\NotoSansKR-VF.ttf",
  "C:\\Windows\\Fonts\\notosanskr-medium.ttf",
  "/mnt/c/Windows/Fonts/malgun.ttf",
  "/mnt/c/Windows/Fonts/malgunbd.ttf",
  "/mnt/c/Windows/Fonts/NanumGothic.ttf",
  "/mnt/c/Windows/Fonts/NotoSansKR-VF.ttf",
  "/mnt/c/Windows/Fonts/NotoSerifKR-VF.ttf",
  "/System/Library/Fonts/AppleSDGothicNeo.ttc",
  "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
  "/Library/Fonts/AppleGothic.ttf",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJKkr-Regular.otf",
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
  "/usr/share/fonts/truetype/nanum/NanumBarunGothic.ttf",
  "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/google-noto-sans-cjk-vf/NotoSansCJK-VF.otf.ttc",
].filter(Boolean);
const KR_FONT_NAME_RE = /^(malgun|malgunbd|nanum|noto.*(kr|cjk))[^/\\]*\.(ttf|ttc|otf)$/i;
const EXTERNAL_TEXT_STATE = {
  checked: false,
  available: false,
  fontPath: null,
};
const EXTERNAL_TEXT_CACHE = new Map();

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
    "  - When --png-out is set, the script writes the main trend chart to that path and sibling overlay and momentum charts to *-overlay.png and *-momentum.png.",
    "  - The markdown output prints all three image snippets when PNG output is enabled.",
  ].join("\n");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function requireNamedChartInput(data, options) {
  if (!options.pngOut) {
    return;
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    throw new Error(
      "PNG chart rendering requires a company name in the input JSON. Pass `--name \"회사명\"` to fetch-kr-chart.js so the PNG title shows the stock name.",
    );
  }
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

function classifyMacd(macdData, latestIndex) {
  const macdValue = macdData.macd[latestIndex];
  const signalValue = macdData.signal[latestIndex];
  const histogramValue = macdData.histogram[latestIndex];
  const prevMacd = latestIndex > 0 ? macdData.macd[latestIndex - 1] : null;
  const prevSignal = latestIndex > 0 ? macdData.signal[latestIndex - 1] : null;
  const prevHistogram = latestIndex > 0 ? macdData.histogram[latestIndex - 1] : null;

  let crossState = "insufficient-data";
  if ([macdValue, signalValue, prevMacd, prevSignal].every(Number.isFinite)) {
    if (macdValue >= signalValue && prevMacd < prevSignal) {
      crossState = "bullish-cross";
    } else if (macdValue <= signalValue && prevMacd > prevSignal) {
      crossState = "bearish-cross";
    } else if (macdValue > signalValue) {
      crossState = "bullish";
    } else if (macdValue < signalValue) {
      crossState = "bearish";
    } else {
      crossState = "flat";
    }
  }

  let zeroState = "insufficient-data";
  if (Number.isFinite(macdValue)) {
    if (macdValue > 0) {
      zeroState = "above-zero";
    } else if (macdValue < 0) {
      zeroState = "below-zero";
    } else {
      zeroState = "at-zero";
    }
  }

  let histogramState = "insufficient-data";
  if ([histogramValue, prevHistogram].every(Number.isFinite)) {
    const latestMagnitude = Math.abs(histogramValue);
    const prevMagnitude = Math.abs(prevHistogram);
    if (latestMagnitude > prevMagnitude * 1.03) {
      histogramState = "expanding";
    } else if (latestMagnitude < prevMagnitude * 0.97) {
      histogramState = "contracting";
    } else {
      histogramState = "stable";
    }
  }

  return {
    macdValue,
    signalValue,
    histogramValue,
    crossState,
    zeroState,
    histogramState,
  };
}

function classifyAdx(adxData, latestIndex) {
  const adxValue = adxData.adx[latestIndex];
  const plusDiValue = adxData.plusDi[latestIndex];
  const minusDiValue = adxData.minusDi[latestIndex];
  const prevAdx = latestIndex > 0 ? adxData.adx[latestIndex - 1] : null;

  let directionState = "insufficient-data";
  if ([plusDiValue, minusDiValue].every(Number.isFinite)) {
    if (plusDiValue > minusDiValue) {
      directionState = "bullish";
    } else if (plusDiValue < minusDiValue) {
      directionState = "bearish";
    } else {
      directionState = "flat";
    }
  }

  let strengthState = "insufficient-data";
  if (Number.isFinite(adxValue)) {
    if (adxValue >= 25) {
      strengthState = "strong-trend";
    } else if (adxValue >= 20) {
      strengthState = "building-trend";
    } else {
      strengthState = "weak-trend";
    }
  }

  let slopeState = "insufficient-data";
  if ([adxValue, prevAdx].every(Number.isFinite)) {
    if (adxValue > prevAdx + 0.5) {
      slopeState = "rising";
    } else if (adxValue < prevAdx - 0.5) {
      slopeState = "falling";
    } else {
      slopeState = "flat";
    }
  }

  return {
    adxValue,
    plusDiValue,
    minusDiValue,
    directionState,
    strengthState,
    slopeState,
  };
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

  if (metrics.macd.crossState === "bullish-cross") {
    bullish += 1;
  } else if (metrics.macd.crossState === "bearish-cross") {
    bearish += 1;
  } else if (metrics.macd.crossState === "bullish" && metrics.macd.zeroState === "above-zero") {
    bullish += 1;
  } else if (metrics.macd.crossState === "bearish" && metrics.macd.zeroState === "below-zero") {
    bearish += 1;
  }

  if (metrics.volumeRatio >= 1.2) {
    if (metrics.latestClose >= metrics.ma20Value) {
      bullish += 1;
    } else {
      bearish += 1;
    }
  }

  if (metrics.adx.strengthState === "strong-trend" || metrics.adx.strengthState === "building-trend") {
    if (metrics.adx.directionState === "bullish") {
      bullish += 1;
    } else if (metrics.adx.directionState === "bearish") {
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

function clamp(value, minValue, maxValue) {
  return Math.min(Math.max(value, minValue), maxValue);
}

function containsHangul(text) {
  return /[\uac00-\ud7a3]/.test(String(text || ""));
}

function findKrFontByDirScan(dirs) {
  for (const dir of dirs) {
    if (!dir || !fs.existsSync(dir)) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const hit = entries.find((f) => KR_FONT_NAME_RE.test(f));
    if (hit) return path.join(dir, hit);
  }
  return null;
}

function discoverKrFontFallback() {
  if (process.platform === "win32") {
    return findKrFontByDirScan([
      "C:\\Windows\\Fonts",
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Microsoft\\Windows\\Fonts"),
    ]);
  }
  try {
    const out = execFileSync("fc-match", ["-f", "%{file}\n", ":lang=ko"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (out && fs.existsSync(out)) return out;
  } catch {
    // fc-match not installed
  }
  return null;
}

function resolveExternalTextRenderer() {
  if (EXTERNAL_TEXT_STATE.checked) {
    return EXTERNAL_TEXT_STATE;
  }

  EXTERNAL_TEXT_STATE.checked = true;
  const helperPath = process.platform === "win32" ? EXTERNAL_TEXT_HELPER_PS1 : EXTERNAL_TEXT_HELPER_PY;
  if (!fs.existsSync(helperPath)) {
    EXTERNAL_TEXT_STATE.reason = "helper-missing";
    return EXTERNAL_TEXT_STATE;
  }

  let fontPath = EXTERNAL_FONT_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!fontPath) {
    fontPath = discoverKrFontFallback();
  }
  if (!fontPath) {
    EXTERNAL_TEXT_STATE.reason = "no-korean-font-found";
    return EXTERNAL_TEXT_STATE;
  }

  EXTERNAL_TEXT_STATE.available = true;
  EXTERNAL_TEXT_STATE.fontPath = fontPath;
  return EXTERNAL_TEXT_STATE;
}

let EXTERNAL_TEXT_RENDER_OK = false;
function noteExternalRenderSucceeded() { EXTERNAL_TEXT_RENDER_OK = true; }
function noteExternalRenderFailed(reason) {
  EXTERNAL_TEXT_STATE.available = false;
  if (!EXTERNAL_TEXT_STATE.reason) EXTERNAL_TEXT_STATE.reason = reason || "helper-failed";
}
process.on("exit", () => {
  if (EXTERNAL_TEXT_RENDER_OK && EXTERNAL_TEXT_STATE.fontPath) {
    process.stderr.write(`[font] external=true path=${EXTERNAL_TEXT_STATE.fontPath}\n`);
    return;
  }
  if (!EXTERNAL_TEXT_STATE.checked) {
    try { resolveExternalTextRenderer(); } catch {}
  }
  if (EXTERNAL_TEXT_STATE.fontPath && !EXTERNAL_TEXT_STATE.reason) {
    process.stderr.write(`[font] external=available path=${EXTERNAL_TEXT_STATE.fontPath}\n`);
    return;
  }
  const reason = EXTERNAL_TEXT_STATE.reason || (EXTERNAL_TEXT_STATE.fontPath ? "not-invoked" : "no-korean-font-found");
  const path = EXTERNAL_TEXT_STATE.fontPath || "none";
  process.stderr.write(`[font] external=false path=${path} reason=${reason}\n`);
});

function externalFontSize(scale) {
  return Math.max(12, Math.round(scale * 9));
}

function normalizeExternalTextPayload(payloadText) {
  const payload = JSON.parse(String(payloadText || "").trim());
  return {
    width: payload.width,
    height: payload.height,
    alpha: Buffer.from(payload.alpha || "", "base64"),
  };
}

function loadExternalTextMask(text, scale = 1) {
  if (!containsHangul(text)) {
    return null;
  }

  const renderer = resolveExternalTextRenderer();
  if (!renderer.available || !renderer.fontPath) {
    return null;
  }

  const normalized = String(text);
  const cacheKey = `${renderer.fontPath}|${externalFontSize(scale)}|${normalized}`;
  if (EXTERNAL_TEXT_CACHE.has(cacheKey)) {
    return EXTERNAL_TEXT_CACHE.get(cacheKey);
  }

  try {
    const stdout =
      process.platform === "win32"
        ? execFileSync(
            "powershell",
            [
              "-ExecutionPolicy",
              "Bypass",
              "-File",
              EXTERNAL_TEXT_HELPER_PS1,
              "-FontPath",
              renderer.fontPath,
              "-FontSize",
              String(externalFontSize(scale)),
              "-Text",
              normalized,
            ],
            {
              encoding: "utf8",
              maxBuffer: 16 * 1024 * 1024,
            },
          )
        : execFileSync(
            "python3",
            [
              EXTERNAL_TEXT_HELPER_PY,
              "--font-path",
              renderer.fontPath,
              "--font-size",
              String(externalFontSize(scale)),
              "--text",
              normalized,
            ],
            {
              encoding: "utf8",
              maxBuffer: 16 * 1024 * 1024,
            },
          );
    const mask = normalizeExternalTextPayload(stdout);
    EXTERNAL_TEXT_CACHE.set(cacheKey, mask);
    noteExternalRenderSucceeded();
    return mask;
  } catch (error) {
    if (error && error.stdout) {
      try {
        const mask = normalizeExternalTextPayload(error.stdout);
        EXTERNAL_TEXT_CACHE.set(cacheKey, mask);
        noteExternalRenderSucceeded();
        return mask;
      } catch (_parseError) {
        // Fall through to the bitmap fallback if stdout is unusable.
      }
    }
    const stderrLines = error && error.stderr ? String(error.stderr).split("\n").map((s) => s.trim()).filter(Boolean) : [];
    const reason = stderrLines.length > 0 ? `helper-failed:${stderrLines[stderrLines.length - 1].slice(0, 80)}` : "helper-failed";
    noteExternalRenderFailed(reason);
    EXTERNAL_TEXT_STATE.fontPath = null;
    return null;
  }
}

function drawAlphaMask(buffer, width, height, x, y, mask, color) {
  if (!mask || mask.width <= 0 || mask.height <= 0) {
    return;
  }

  const alphaScale = color[3] === undefined ? 255 : color[3];
  for (let row = 0; row < mask.height; row += 1) {
    for (let col = 0; col < mask.width; col += 1) {
      const alpha = mask.alpha[row * mask.width + col];
      if (alpha > 0) {
        blendPixel(buffer, width, height, x + col, y + row, [
          color[0],
          color[1],
          color[2],
          Math.round((alpha * alphaScale) / 255),
        ]);
      }
    }
  }
}

function isHangulSyllable(character) {
  if (!character) {
    return false;
  }
  const code = character.codePointAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_END;
}

function normalizeConsonantParts(jamo) {
  const doubled = {
    "ㄲ": ["ㄱ", "ㄱ"],
    "ㄸ": ["ㄷ", "ㄷ"],
    "ㅃ": ["ㅂ", "ㅂ"],
    "ㅆ": ["ㅅ", "ㅅ"],
    "ㅉ": ["ㅈ", "ㅈ"],
  };
  return doubled[jamo] || [jamo];
}

function decomposeHangulSyllable(character) {
  if (!isHangulSyllable(character)) {
    return null;
  }

  const syllableIndex = character.codePointAt(0) - HANGUL_BASE;
  const initialIndex = Math.floor(syllableIndex / 588);
  const medialIndex = Math.floor((syllableIndex % 588) / 28);
  const finalIndex = syllableIndex % 28;

  const initials = normalizeConsonantParts(HANGUL_INITIALS[initialIndex]).slice(0, 2);
  const medials = HANGUL_MEDIALS[medialIndex].slice(0, 2);
  const finals = HANGUL_FINALS[finalIndex]
    .flatMap((jamo) => normalizeConsonantParts(jamo))
    .slice(0, 2);

  return { initials, medials, finals };
}

function hangulGlyphWidth() {
  return 17;
}

function drawBitmap(buffer, width, height, x, y, bitmap, color, scale = 1) {
  bitmap.forEach((row, rowIndex) => {
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      if (row[columnIndex] === "1") {
        fillRect(
          buffer,
          width,
          height,
          x + columnIndex * scale,
          y + rowIndex * scale,
          scale,
          scale,
          color,
        );
      }
    }
  });
}

function drawHangulGlyph(buffer, width, height, x, y, character, color, scale = 1) {
  const parts = decomposeHangulSyllable(character);
  if (!parts) {
    drawBitmap(buffer, width, height, x, y, FONT_5X7["?"], color, scale);
    return hangulGlyphWidth();
  }

  const initialXs = parts.initials.length > 1 ? [0, 3] : [0];
  const medialXs = parts.medials.length > 1 ? [6, 12] : [6];
  const finalXs = parts.finals.length > 1 ? [3, 9] : [6];

  parts.initials.forEach((jamo, index) => {
    const bitmap = JAMO_5X5[jamo];
    if (bitmap) {
      drawBitmap(buffer, width, height, x + initialXs[index] * scale, y, bitmap, color, scale);
    }
  });

  parts.medials.forEach((jamo, index) => {
    const bitmap = JAMO_5X5[jamo];
    if (bitmap) {
      drawBitmap(buffer, width, height, x + medialXs[index] * scale, y, bitmap, color, scale);
    }
  });

  parts.finals.forEach((jamo, index) => {
    const bitmap = JAMO_5X5[jamo];
    if (bitmap) {
      drawBitmap(buffer, width, height, x + finalXs[index] * scale, y + 6 * scale, bitmap, color, scale);
    }
  });

  return hangulGlyphWidth();
}

function measureCharacterWidth(character) {
  return isHangulSyllable(character) ? hangulGlyphWidth() : glyphWidth();
}

function measureText(text, scale = 1) {
  const externalMask = loadExternalTextMask(text, scale);
  if (externalMask) {
    return externalMask.width;
  }

  if (!text) {
    return 0;
  }
  const characters = Array.from(String(text));
  return characters.reduce((sum, character, index) => {
    const width = measureCharacterWidth(character);
    return sum + width * scale + (index === characters.length - 1 ? 0 : scale);
  }, 0);
}

function drawText(buffer, width, height, x, y, text, color, scale = 1, align = "left") {
  const externalMask = loadExternalTextMask(text, scale);
  const characters = Array.from(String(text));
  let cursorX = x;
  const totalWidth = externalMask ? externalMask.width : measureText(text, scale);
  if (align === "center") {
    cursorX -= Math.round(totalWidth / 2);
  } else if (align === "right") {
    cursorX -= totalWidth;
  }

  if (externalMask) {
    drawAlphaMask(buffer, width, height, Math.round(cursorX), Math.round(y), externalMask, color);
    return;
  }

  for (const character of characters) {
    if (isHangulSyllable(character)) {
      cursorX += drawHangulGlyph(buffer, width, height, cursorX, y, character, color, scale) * scale + scale;
      continue;
    }

    const glyphKey = /[a-z]/.test(character) ? character.toUpperCase() : character;
    const glyph = FONT_5X7[glyphKey] || FONT_5X7["?"];
    drawBitmap(buffer, width, height, cursorX, y, glyph, color, scale);
    cursorX += (glyphWidth() + 1) * scale;
  }
}

function drawLegendItem(buffer, width, height, x, y, color, label) {
  fillRect(buffer, width, height, x, y + 4, 16, 6, color);
  drawText(buffer, width, height, x + 24, y, label, [51, 65, 85, 255], 2);
  return x + 24 + measureText(label, 2) + 22;
}

function drawValueCallout(buffer, width, height, rightEdge, y, label, theme, panelTop, panelHeight) {
  const paddingX = 8;
  const boxHeight = 24;
  const boxWidth = measureText(label, 2) + paddingX * 2;
  const boxLeft = rightEdge - boxWidth;
  const boxTop = clamp(Math.round(y - boxHeight / 2), panelTop + 4, panelTop + panelHeight - boxHeight - 4);
  const fillColor = [255, 255, 255, 230];

  fillRect(buffer, width, height, boxLeft, boxTop, boxWidth, boxHeight, fillColor);
  drawLine(buffer, width, height, boxLeft, boxTop, boxLeft + boxWidth, boxTop, theme.border, 1);
  drawLine(buffer, width, height, boxLeft, boxTop + boxHeight, boxLeft + boxWidth, boxTop + boxHeight, theme.border, 1);
  drawLine(buffer, width, height, boxLeft, boxTop, boxLeft, boxTop + boxHeight, theme.border, 1);
  drawLine(buffer, width, height, boxLeft + boxWidth, boxTop, boxLeft + boxWidth, boxTop + boxHeight, theme.border, 1);
  drawText(buffer, width, height, boxLeft + paddingX, boxTop + 4, label, theme.close, 2);
}

function drawCandlesticks(buffer, width, height, bars, xForSlot, minValue, maxValue, top, panelHeight, theme) {
  const candleWidth = Math.max(4, Math.floor((width * 0.00042)));
  bars.forEach((bar, index) => {
    if (!Number.isFinite(bar.open) || !Number.isFinite(bar.high) || !Number.isFinite(bar.low) || !Number.isFinite(bar.close)) {
      return;
    }

    const x = xForSlot(index);
    const highY = valueToY(bar.high, minValue, maxValue, top, panelHeight);
    const lowY = valueToY(bar.low, minValue, maxValue, top, panelHeight);
    const openY = valueToY(bar.open, minValue, maxValue, top, panelHeight);
    const closeY = valueToY(bar.close, minValue, maxValue, top, panelHeight);
    const isUp = bar.close >= bar.open;
    const wickColor = isUp ? theme.candleUp : theme.candleDown;
    const bodyColor = isUp ? theme.candleUpFill : theme.candleDownFill;
    const bodyTop = Math.min(openY, closeY);
    const bodyBottom = Math.max(openY, closeY);
    const bodyHeight = Math.max(2, Math.round(bodyBottom - bodyTop));

    drawLine(buffer, width, height, x, highY, x, lowY, wickColor, 1);
    fillRect(
      buffer,
      width,
      height,
      x - Math.floor(candleWidth / 2),
      Math.round(bodyTop),
      candleWidth,
      bodyHeight,
      bodyColor,
    );
    drawLine(
      buffer,
      width,
      height,
      x - Math.floor(candleWidth / 2),
      Math.round(bodyTop),
      x + Math.floor(candleWidth / 2),
      Math.round(bodyTop),
      wickColor,
      1,
    );
    drawLine(
      buffer,
      width,
      height,
      x - Math.floor(candleWidth / 2),
      Math.round(bodyTop + bodyHeight),
      x + Math.floor(candleWidth / 2),
      Math.round(bodyTop + bodyHeight),
      wickColor,
      1,
    );
  });
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

function appendSuffixToPath(targetPath, suffix) {
  const extension = path.extname(targetPath);
  if (extension) {
    return `${targetPath.slice(0, -extension.length)}-${suffix}${extension}`;
  }
  return `${targetPath}-${suffix}.png`;
}

function buildChartPngs(data, bars, metrics, options) {
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
    lastPriceGuide: [30, 64, 175, 110],
    candleUp: [220, 38, 38, 255],
    candleUpFill: [248, 113, 113, 180],
    candleDown: [37, 99, 235, 255],
    candleDownFill: [96, 165, 250, 180],
    ma5: [34, 197, 94, 255],
    ma20: [239, 68, 68, 255],
    ma60: [249, 115, 22, 255],
    ma120: [147, 51, 234, 255],
    bollinger: [16, 185, 129, 255],
    bollingerFill: [16, 185, 129, 32],
    tenkan: [220, 38, 38, 255],
    kijun: [217, 119, 6, 255],
    senkouA: [34, 197, 94, 220],
    senkouB: [239, 68, 68, 220],
    cloudBull: [34, 197, 94, 42],
    cloudBear: [239, 68, 68, 42],
    volumeUp: [34, 197, 94, 255],
    volumeDown: [239, 68, 68, 255],
    rsi: [124, 58, 237, 255],
    rsiGuide: [148, 163, 184, 255],
    macd: [37, 99, 235, 255],
    signal: [249, 115, 22, 255],
    histogramPositive: [34, 197, 94, 220],
    histogramNegative: [239, 68, 68, 220],
    zeroGuide: [148, 163, 184, 255],
    adx: [30, 41, 59, 255],
    plusDi: [34, 197, 94, 255],
    minusDi: [239, 68, 68, 255],
    adxGuide: [148, 163, 184, 255],
  };

  const margin = { left: 100, right: 120, top: 84, bottom: 78 };
  const plotWidth = width - margin.left - margin.right;
  const headerHeight = 92;
  const gap = 26;
  const basePlotHeight = height - margin.top - margin.bottom - headerHeight;
  const dualPanelHeight = basePlotHeight - gap;
  const mainVolumeHeight = Math.max(90, Math.min(150, Math.round(dualPanelHeight * 0.22)));
  const mainPriceHeight = dualPanelHeight - mainVolumeHeight;
  const overlayRsiHeight = Math.max(90, Math.min(150, Math.round(dualPanelHeight * 0.22)));
  const overlayPriceHeight = dualPanelHeight - overlayRsiHeight;
  const momentumHistogramHeight = Math.max(80, Math.min(120, Math.round(dualPanelHeight * 0.22)));
  const momentumAdxHeight = Math.max(90, Math.min(140, Math.round(dualPanelHeight * 0.28)));
  const momentumLineHeight = dualPanelHeight - momentumHistogramHeight - momentumAdxHeight - gap;

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
    macd: metrics.macdSeriesData.macd.slice(startIndex),
    signal: metrics.macdSeriesData.signal.slice(startIndex),
    histogram: metrics.macdSeriesData.histogram.slice(startIndex),
    adx: metrics.adxSeriesData.adx.slice(startIndex),
    plusDi: metrics.adxSeriesData.plusDi.slice(startIndex),
    minusDi: metrics.adxSeriesData.minusDi.slice(startIndex),
  };

  const volumeMax = Math.max(...barsWindow.map((bar) => (Number.isFinite(bar.volume) ? bar.volume : 0)), 1);
  const buildPriceRange = (seriesCollection) => {
    const values = [];
    barsWindow.forEach((bar) => {
      ["high", "low", "close"].forEach((key) => {
        if (Number.isFinite(bar[key])) {
          values.push(bar[key]);
        }
      });
    });
    seriesCollection.forEach((series) => {
      series.forEach((value) => {
        if (Number.isFinite(value)) {
          values.push(value);
        }
      });
    });
    let priceMin = Math.min(...values);
    let priceMax = Math.max(...values);
    if (priceMin === priceMax) {
      priceMin -= 1;
      priceMax += 1;
    }
    const pricePadding = (priceMax - priceMin) * 0.08;
    return {
      min: priceMin - pricePadding,
      max: priceMax + pricePadding,
    };
  };

  const drawPriceAxis = (buffer, panelTop, panelHeight, priceMin, priceMax) => {
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = panelTop + (panelHeight * tick) / 4;
      drawLine(buffer, width, height, margin.left, y, margin.left + plotWidth, y, theme.grid, 1);
      const value = priceMax - ((priceMax - priceMin) * tick) / 4;
      drawText(buffer, width, height, margin.left + plotWidth + 10, y - 7, formatAxisNumber(value), theme.muted, 2);
    }
  };

  const drawVolumeAxis = (buffer, panelTop, panelHeight) => {
    for (let tick = 0; tick <= 2; tick += 1) {
      const y = panelTop + (panelHeight * tick) / 2;
      drawLine(buffer, width, height, margin.left, y, margin.left + plotWidth, y, theme.grid, 1);
      const value = Math.round(volumeMax - (volumeMax * tick) / 2);
      drawText(buffer, width, height, margin.left + plotWidth + 10, y - 7, formatAxisNumber(value), theme.muted, 2);
    }
  };

  const drawRsiAxis = (buffer, panelTop, panelHeight) => {
    [30, 50, 70].forEach((level) => {
      const y = valueToY(level, 0, 100, panelTop, panelHeight);
      drawLine(buffer, width, height, margin.left, y, margin.left + plotWidth, y, theme.rsiGuide, 1);
      drawText(buffer, width, height, margin.left + plotWidth + 10, y - 7, String(level), theme.muted, 2);
    });
  };

  const drawAdxAxis = (buffer, panelTop, panelHeight) => {
    [20, 25, 40].forEach((level) => {
      const y = valueToY(level, 0, 60, panelTop, panelHeight);
      drawLine(buffer, width, height, margin.left, y, margin.left + plotWidth, y, theme.adxGuide, 1);
      drawText(buffer, width, height, margin.left + plotWidth + 10, y - 7, String(level), theme.muted, 2);
    });
  };

  const buildIndicatorRange = (seriesCollection, options = {}) => {
    const values = [];
    seriesCollection.forEach((series) => {
      series.forEach((value) => {
        if (Number.isFinite(value)) {
          values.push(value);
        }
      });
    });
    if (options.includeZero) {
      values.push(0);
    }
    if (values.length === 0) {
      return { min: -1, max: 1 };
    }
    let minValue = Math.min(...values);
    let maxValue = Math.max(...values);
    if (minValue === maxValue) {
      minValue -= 1;
      maxValue += 1;
    }
    const padding = (maxValue - minValue) * 0.12;
    return {
      min: minValue - padding,
      max: maxValue + padding,
    };
  };

  const drawZeroGuide = (buffer, panelTop, panelHeight, range, color = theme.zeroGuide) => {
    if (!(range.min <= 0 && range.max >= 0)) {
      return;
    }
    const y = valueToY(0, range.min, range.max, panelTop, panelHeight);
    drawLine(buffer, width, height, margin.left, y, margin.left + plotWidth, y, color, 1);
    drawText(buffer, width, height, margin.left + plotWidth + 10, y - 7, "0", theme.muted, 2);
  };

  const drawDateTicks = (buffer, xForSlot, chartBottom, labelBottom, totalSlotsForGrid) => {
    const dateTickIndices = pickTickIndices(barsWindow.length, 6);
    dateTickIndices.forEach((index) => {
      const x = xForSlot(index);
      drawLine(buffer, width, height, x, margin.top + headerHeight, x, chartBottom, theme.grid, 1);
      drawText(buffer, width, height, x, labelBottom, dateLabel(barsWindow[index].date), theme.muted, 2, "center");
    });
    if (totalSlotsForGrid > barsWindow.length) {
      const latestX = xForSlot(barsWindow.length - 1);
      drawLine(buffer, width, height, latestX, margin.top + headerHeight, latestX, chartBottom, theme.border, 1);
    }
  };

  const writePng = (outputPath, rgbaBuffer) => {
    const png = encodePng(width, height, rgbaBuffer);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, png);
  };

  const chartPaths = {
    mainOutput: path.resolve(options.pngOut),
    overlayOutput: path.resolve(appendSuffixToPath(options.pngOut, "overlay")),
    momentumOutput: path.resolve(appendSuffixToPath(options.pngOut, "momentum")),
    mainImagePath: options.imagePath || path.basename(options.pngOut),
    overlayImagePath: options.imagePath
      ? appendSuffixToPath(options.imagePath, "overlay")
      : appendSuffixToPath(path.basename(options.pngOut), "overlay"),
    momentumImagePath: options.imagePath
      ? appendSuffixToPath(options.imagePath, "momentum")
      : appendSuffixToPath(path.basename(options.pngOut), "momentum"),
  };

  const buildMomentumChart = () => {
    const buffer = createRgbaBuffer(width, height, theme.background);
    const totalSlotsForMomentum = barsWindow.length;
    const chartTitle = String(data.name || data.ticker || "UNKNOWN");
    const xForSlot = (slot) => {
      if (totalSlotsForMomentum <= 1) {
        return margin.left + plotWidth / 2;
      }
      return margin.left + (plotWidth * slot) / (totalSlotsForMomentum - 1);
    };

    const macdTop = margin.top + headerHeight;
    const histogramTop = macdTop + momentumLineHeight + gap;
    const adxTop = histogramTop + momentumHistogramHeight + gap;
    const macdRange = buildIndicatorRange([priceSeries.macd, priceSeries.signal], { includeZero: true });
    const histogramRange = buildIndicatorRange([priceSeries.histogram], { includeZero: true });
    const adxRange = { min: 0, max: 60 };

    fillRect(buffer, width, height, margin.left, macdTop, plotWidth, momentumLineHeight, theme.panel);
    fillRect(buffer, width, height, margin.left, histogramTop, plotWidth, momentumHistogramHeight, theme.panel);
    fillRect(buffer, width, height, margin.left, adxTop, plotWidth, momentumAdxHeight, theme.panel);

    drawLine(buffer, width, height, margin.left, macdTop, margin.left + plotWidth, macdTop, theme.border, 1);
    drawLine(buffer, width, height, margin.left, macdTop + momentumLineHeight, margin.left + plotWidth, macdTop + momentumLineHeight, theme.border, 1);
    drawLine(buffer, width, height, margin.left, histogramTop, margin.left + plotWidth, histogramTop, theme.border, 1);
    drawLine(buffer, width, height, margin.left, histogramTop + momentumHistogramHeight, margin.left + plotWidth, histogramTop + momentumHistogramHeight, theme.border, 1);
    drawLine(buffer, width, height, margin.left, adxTop, margin.left + plotWidth, adxTop, theme.border, 1);
    drawLine(buffer, width, height, margin.left, adxTop + momentumAdxHeight, margin.left + plotWidth, adxTop + momentumAdxHeight, theme.border, 1);
    drawLine(buffer, width, height, margin.left, macdTop, margin.left, adxTop + momentumAdxHeight, theme.border, 1);
    drawLine(buffer, width, height, margin.left + plotWidth, macdTop, margin.left + plotWidth, adxTop + momentumAdxHeight, theme.border, 1);

    drawText(buffer, width, height, margin.left, margin.top + 4, chartTitle, theme.text, 3);
    drawText(buffer, width, height, margin.left, margin.top + 34, `${data.ticker || "UNKNOWN"} MACD momentum`, theme.muted, 2);
    drawText(buffer, width, height, margin.left + plotWidth, margin.top + 10, `As of ${metrics.latest.date}`, theme.muted, 2, "right");

    let legendX = margin.left;
    const legendY = margin.top + 56;
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.macd, "MACD");
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.signal, "Signal");
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.histogramPositive, "Histogram +");
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.histogramNegative, "Histogram -");
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.adx, "ADX");
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.plusDi, "+DI");
    drawLegendItem(buffer, width, height, legendX, legendY, theme.minusDi, "-DI");

    drawText(buffer, width, height, margin.left - 56, macdTop + 6, "MACD", theme.muted, 2);
    drawText(buffer, width, height, margin.left - 86, histogramTop + 6, "Histogram", theme.muted, 2);
    drawText(buffer, width, height, margin.left - 60, adxTop + 6, "ADX/DMI", theme.muted, 2);

    drawPriceAxis(buffer, macdTop, momentumLineHeight, macdRange.min, macdRange.max);
    drawPriceAxis(buffer, histogramTop, momentumHistogramHeight, histogramRange.min, histogramRange.max);
    drawAdxAxis(buffer, adxTop, momentumAdxHeight);
    drawZeroGuide(buffer, macdTop, momentumLineHeight, macdRange);
    drawZeroGuide(buffer, histogramTop, momentumHistogramHeight, histogramRange);
    drawDateTicks(buffer, xForSlot, adxTop + momentumAdxHeight, adxTop + momentumAdxHeight + 14, totalSlotsForMomentum);
    drawText(buffer, width, height, margin.left + plotWidth / 2, adxTop + momentumAdxHeight + 42, "Date", theme.muted, 2, "center");

    const macdPoints = mapSeriesToPoints(priceSeries.macd, xForSlot, 0, macdRange.min, macdRange.max, macdTop, momentumLineHeight, totalSlotsForMomentum);
    const signalPoints = mapSeriesToPoints(priceSeries.signal, xForSlot, 0, macdRange.min, macdRange.max, macdTop, momentumLineHeight, totalSlotsForMomentum);
    const histogramPoints = mapSeriesToPoints(
      priceSeries.histogram,
      xForSlot,
      0,
      histogramRange.min,
      histogramRange.max,
      histogramTop,
      momentumHistogramHeight,
      totalSlotsForMomentum,
    );
    const adxPoints = mapSeriesToPoints(priceSeries.adx, xForSlot, 0, adxRange.min, adxRange.max, adxTop, momentumAdxHeight, totalSlotsForMomentum);
    const plusDiPoints = mapSeriesToPoints(priceSeries.plusDi, xForSlot, 0, adxRange.min, adxRange.max, adxTop, momentumAdxHeight, totalSlotsForMomentum);
    const minusDiPoints = mapSeriesToPoints(priceSeries.minusDi, xForSlot, 0, adxRange.min, adxRange.max, adxTop, momentumAdxHeight, totalSlotsForMomentum);
    const histogramZeroY = valueToY(0, histogramRange.min, histogramRange.max, histogramTop, momentumHistogramHeight);

    const histogramBarWidth = Math.max(4, Math.floor(plotWidth / Math.max(totalSlotsForMomentum * 1.9, 1)));
    priceSeries.histogram.forEach((value, index) => {
      const point = histogramPoints[index];
      if (!point || !Number.isFinite(value)) {
        return;
      }
      const topY = Math.min(point.y, histogramZeroY);
      const barHeight = Math.max(2, Math.abs(point.y - histogramZeroY));
      fillRect(
        buffer,
        width,
        height,
        point.x - histogramBarWidth / 2,
        topY,
        histogramBarWidth,
        barHeight,
        value >= 0 ? theme.histogramPositive : theme.histogramNegative,
      );
    });

    drawSeries(buffer, width, height, macdPoints, theme.macd, 3);
    drawSeries(buffer, width, height, signalPoints, theme.signal, 3);
    drawSeries(buffer, width, height, adxPoints, theme.adx, 3);
    drawSeries(buffer, width, height, plusDiPoints, theme.plusDi, 2);
    drawSeries(buffer, width, height, minusDiPoints, theme.minusDi, 2);

    const latestMacdPoint = macdPoints[barsWindow.length - 1];
    if (latestMacdPoint) {
      fillRect(buffer, width, height, latestMacdPoint.x - 4, latestMacdPoint.y - 4, 8, 8, theme.macd);
      drawValueCallout(
        buffer,
        width,
        height,
        margin.left + plotWidth - 8,
        latestMacdPoint.y,
        `MACD ${formatAxisNumber(metrics.macd.macdValue)}`,
        theme,
        macdTop,
        momentumLineHeight,
      );
    }

    const latestSignalPoint = signalPoints[barsWindow.length - 1];
    if (latestSignalPoint) {
      fillRect(buffer, width, height, latestSignalPoint.x - 4, latestSignalPoint.y - 4, 8, 8, theme.signal);
    }

    const latestAdxPoint = adxPoints[barsWindow.length - 1];
    if (latestAdxPoint) {
      fillRect(buffer, width, height, latestAdxPoint.x - 4, latestAdxPoint.y - 4, 8, 8, theme.adx);
    }

    writePng(chartPaths.momentumOutput, buffer);
  };

  const buildMainTrendChart = () => {
    const buffer = createRgbaBuffer(width, height, theme.background);
    const totalSlotsForMain = barsWindow.length;
    const chartTitle = String(data.name || data.ticker || "UNKNOWN");
    const xForSlot = (slot) => {
      if (totalSlotsForMain <= 1) {
        return margin.left + plotWidth / 2;
      }
      return margin.left + (plotWidth * slot) / (totalSlotsForMain - 1);
    };

    const priceTop = margin.top + headerHeight;
    const volumeTop = priceTop + mainPriceHeight + gap;
    const priceRange = buildPriceRange([
      priceSeries.close,
      priceSeries.ma5,
      priceSeries.ma20,
      priceSeries.ma60,
      priceSeries.ma120,
    ]);

    fillRect(buffer, width, height, margin.left, priceTop, plotWidth, mainPriceHeight, theme.panel);
    fillRect(buffer, width, height, margin.left, volumeTop, plotWidth, mainVolumeHeight, theme.panel);

    drawLine(buffer, width, height, margin.left, priceTop, margin.left + plotWidth, priceTop, theme.border, 1);
    drawLine(buffer, width, height, margin.left, priceTop + mainPriceHeight, margin.left + plotWidth, priceTop + mainPriceHeight, theme.border, 1);
    drawLine(buffer, width, height, margin.left, volumeTop, margin.left + plotWidth, volumeTop, theme.border, 1);
    drawLine(buffer, width, height, margin.left, volumeTop + mainVolumeHeight, margin.left + plotWidth, volumeTop + mainVolumeHeight, theme.border, 1);
    drawLine(buffer, width, height, margin.left, priceTop, margin.left, volumeTop + mainVolumeHeight, theme.border, 1);
    drawLine(buffer, width, height, margin.left + plotWidth, priceTop, margin.left + plotWidth, volumeTop + mainVolumeHeight, theme.border, 1);

    drawText(buffer, width, height, margin.left, margin.top + 4, chartTitle, theme.text, 3);
    drawText(buffer, width, height, margin.left, margin.top + 34, `${data.ticker || "UNKNOWN"} 주가 추세`, theme.muted, 2);
    drawText(buffer, width, height, margin.left + plotWidth, margin.top + 10, `기준일 ${metrics.latest.date}`, theme.muted, 2, "right");

    const legendY = margin.top + 56;
    let legendX = margin.left;
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.candleUpFill, "캔들");
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.close, "종가선");
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.ma5, "5일선");
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.ma20, "20일선");
    legendX = drawLegendItem(buffer, width, height, legendX, legendY, theme.ma60, "60일선");
    drawLegendItem(buffer, width, height, legendX, legendY, theme.ma120, "120일선");

    drawText(buffer, width, height, margin.left - 54, priceTop + 6, "주가", theme.muted, 2);
    drawText(buffer, width, height, margin.left - 72, volumeTop + 6, "거래량", theme.muted, 2);

    drawPriceAxis(buffer, priceTop, mainPriceHeight, priceRange.min, priceRange.max);
    drawVolumeAxis(buffer, volumeTop, mainVolumeHeight);
    drawDateTicks(buffer, xForSlot, volumeTop + mainVolumeHeight, volumeTop + mainVolumeHeight + 14, totalSlotsForMain);
    drawText(buffer, width, height, margin.left + plotWidth / 2, volumeTop + mainVolumeHeight + 42, "날짜", theme.muted, 2, "center");

    const closePoints = mapSeriesToPoints(priceSeries.close, xForSlot, 0, priceRange.min, priceRange.max, priceTop, mainPriceHeight, totalSlotsForMain);
    const ma5Points = mapSeriesToPoints(priceSeries.ma5, xForSlot, 0, priceRange.min, priceRange.max, priceTop, mainPriceHeight, totalSlotsForMain);
    const ma20Points = mapSeriesToPoints(priceSeries.ma20, xForSlot, 0, priceRange.min, priceRange.max, priceTop, mainPriceHeight, totalSlotsForMain);
    const ma60Points = mapSeriesToPoints(priceSeries.ma60, xForSlot, 0, priceRange.min, priceRange.max, priceTop, mainPriceHeight, totalSlotsForMain);
    const ma120Points = mapSeriesToPoints(priceSeries.ma120, xForSlot, 0, priceRange.min, priceRange.max, priceTop, mainPriceHeight, totalSlotsForMain);

    drawCandlesticks(buffer, width, height, barsWindow, xForSlot, priceRange.min, priceRange.max, priceTop, mainPriceHeight, theme);
    drawSeries(buffer, width, height, closePoints, theme.close, 1);
    drawSeries(buffer, width, height, ma120Points, theme.ma120, 2);
    drawSeries(buffer, width, height, ma60Points, theme.ma60, 2);
    drawSeries(buffer, width, height, ma20Points, theme.ma20, 2);
    drawSeries(buffer, width, height, ma5Points, theme.ma5, 2);

    const latestClosePoint = closePoints[barsWindow.length - 1];
    if (latestClosePoint) {
      drawLine(
        buffer,
        width,
        height,
        margin.left,
        latestClosePoint.y,
        margin.left + plotWidth,
        latestClosePoint.y,
        theme.lastPriceGuide,
        1,
      );
      fillRect(buffer, width, height, latestClosePoint.x - 4, latestClosePoint.y - 4, 8, 8, theme.close);
      drawValueCallout(
        buffer,
        width,
        height,
        margin.left + plotWidth - 8,
        latestClosePoint.y,
        `현재가 ${formatAxisNumber(metrics.latestClose)}`,
        theme,
        priceTop,
        mainPriceHeight,
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
      const barHeight = Math.max(2, Math.round((bar.volume / volumeMax) * (mainVolumeHeight - 4)));
      fillRect(buffer, width, height, x - volumeBarWidth / 2, volumeTop + mainVolumeHeight - barHeight, volumeBarWidth, barHeight, color);
    });

    writePng(chartPaths.mainOutput, buffer);
  };

  const buildOverlayChart = () => {
    const buffer = createRgbaBuffer(width, height, theme.background);
    const chartTitle = String(data.name || data.ticker || "UNKNOWN");
    const xForSlot = (slot) => {
      if (totalSlots <= 1) {
        return margin.left + plotWidth / 2;
      }
      return margin.left + (plotWidth * slot) / (totalSlots - 1);
    };

    const priceTop = margin.top + headerHeight;
    const rsiTop = priceTop + overlayPriceHeight + gap;
    const priceRange = buildPriceRange([
      priceSeries.close,
      priceSeries.bbUpper,
      priceSeries.bbLower,
      priceSeries.tenkan,
      priceSeries.kijun,
      metrics.ichimokuSeriesData.senkouA.slice(startIndex),
      metrics.ichimokuSeriesData.senkouB.slice(startIndex),
    ]);

    fillRect(buffer, width, height, margin.left, priceTop, plotWidth, overlayPriceHeight, theme.panel);
    fillRect(buffer, width, height, margin.left, rsiTop, plotWidth, overlayRsiHeight, theme.panel);

    drawLine(buffer, width, height, margin.left, priceTop, margin.left + plotWidth, priceTop, theme.border, 1);
    drawLine(buffer, width, height, margin.left, priceTop + overlayPriceHeight, margin.left + plotWidth, priceTop + overlayPriceHeight, theme.border, 1);
    drawLine(buffer, width, height, margin.left, rsiTop, margin.left + plotWidth, rsiTop, theme.border, 1);
    drawLine(buffer, width, height, margin.left, rsiTop + overlayRsiHeight, margin.left + plotWidth, rsiTop + overlayRsiHeight, theme.border, 1);
    drawLine(buffer, width, height, margin.left, priceTop, margin.left, rsiTop + overlayRsiHeight, theme.border, 1);
    drawLine(buffer, width, height, margin.left + plotWidth, priceTop, margin.left + plotWidth, rsiTop + overlayRsiHeight, theme.border, 1);

    drawText(buffer, width, height, margin.left, margin.top + 4, chartTitle, theme.text, 3);
    drawText(buffer, width, height, margin.left, margin.top + 34, `${data.ticker || "UNKNOWN"} 보조지표`, theme.muted, 2);
    drawText(buffer, width, height, margin.left + plotWidth, margin.top + 10, `기준일 ${metrics.latest.date}`, theme.muted, 2, "right");

    const legendRow1Y = margin.top + 52;
    const legendRow2Y = margin.top + 72;
    let legendX = margin.left;
    legendX = drawLegendItem(buffer, width, height, legendX, legendRow1Y, theme.close, "종가선");
    legendX = drawLegendItem(buffer, width, height, legendX, legendRow1Y, theme.bollinger, "볼린저밴드");
    legendX = drawLegendItem(buffer, width, height, legendX, legendRow1Y, theme.tenkan, "전환선");
    drawLegendItem(buffer, width, height, legendX, legendRow1Y, theme.kijun, "기준선");

    legendX = margin.left;
    legendX = drawLegendItem(buffer, width, height, legendX, legendRow2Y, theme.senkouA, "선행스팬1");
    drawLegendItem(buffer, width, height, legendX, legendRow2Y, theme.senkouB, "선행스팬2");

    drawText(buffer, width, height, margin.left - 54, priceTop + 6, "주가", theme.muted, 2);
    drawText(buffer, width, height, margin.left - 86, rsiTop + 6, "상대강도", theme.muted, 2);

    drawPriceAxis(buffer, priceTop, overlayPriceHeight, priceRange.min, priceRange.max);
    drawRsiAxis(buffer, rsiTop, overlayRsiHeight);
    drawDateTicks(buffer, xForSlot, rsiTop + overlayRsiHeight, rsiTop + overlayRsiHeight + 14, totalSlots);
    drawText(buffer, width, height, margin.left + plotWidth / 2, rsiTop + overlayRsiHeight + 42, "날짜", theme.muted, 2, "center");

    const closePoints = mapSeriesToPoints(priceSeries.close, xForSlot, 0, priceRange.min, priceRange.max, priceTop, overlayPriceHeight, totalSlots);
    const bbUpperPoints = mapSeriesToPoints(priceSeries.bbUpper, xForSlot, 0, priceRange.min, priceRange.max, priceTop, overlayPriceHeight, totalSlots);
    const bbLowerPoints = mapSeriesToPoints(priceSeries.bbLower, xForSlot, 0, priceRange.min, priceRange.max, priceTop, overlayPriceHeight, totalSlots);
    const tenkanPoints = mapSeriesToPoints(priceSeries.tenkan, xForSlot, 0, priceRange.min, priceRange.max, priceTop, overlayPriceHeight, totalSlots);
    const kijunPoints = mapSeriesToPoints(priceSeries.kijun, xForSlot, 0, priceRange.min, priceRange.max, priceTop, overlayPriceHeight, totalSlots);
    const senkouAPoints = mapSeriesToPoints(metrics.ichimokuSeriesData.senkouA.slice(startIndex), xForSlot, 26, priceRange.min, priceRange.max, priceTop, overlayPriceHeight, totalSlots);
    const senkouBPoints = mapSeriesToPoints(metrics.ichimokuSeriesData.senkouB.slice(startIndex), xForSlot, 26, priceRange.min, priceRange.max, priceTop, overlayPriceHeight, totalSlots);
    const rsiPoints = mapSeriesToPoints(metrics.rsi14Series.slice(startIndex), xForSlot, 0, 0, 100, rsiTop, overlayRsiHeight, totalSlots);

    drawFilledBand(buffer, width, height, bbUpperPoints, bbLowerPoints, theme.bollingerFill);

    const cloudUpperPoints = [];
    const cloudLowerPoints = [];
    const cloudColors = [];
    for (let index = 0; index < totalSlots; index += 1) {
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

    for (let index = 0; index < totalSlots; index += 1) {
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
    drawSeries(buffer, width, height, tenkanPoints, theme.tenkan, 2);
    drawSeries(buffer, width, height, kijunPoints, theme.kijun, 2);
    drawSeries(buffer, width, height, closePoints, theme.close, 3);
    drawSeries(buffer, width, height, rsiPoints, theme.rsi, 3);

    const latestClosePoint = closePoints[barsWindow.length - 1];
    if (latestClosePoint) {
      drawLine(
        buffer,
        width,
        height,
        margin.left,
        latestClosePoint.y,
        margin.left + plotWidth,
        latestClosePoint.y,
        theme.lastPriceGuide,
        1,
      );
      fillRect(buffer, width, height, latestClosePoint.x - 4, latestClosePoint.y - 4, 8, 8, theme.close);
      drawValueCallout(
        buffer,
        width,
        height,
        margin.left + plotWidth - 8,
        latestClosePoint.y,
        `현재가 ${formatAxisNumber(metrics.latestClose)}`,
        theme,
        priceTop,
        overlayPriceHeight,
      );
    }

    const latestRsiPoint = rsiPoints[barsWindow.length - 1];
    if (latestRsiPoint) {
      fillRect(buffer, width, height, latestRsiPoint.x - 4, latestRsiPoint.y - 4, 8, 8, theme.rsi);
    }

    writePng(chartPaths.overlayOutput, buffer);
  };

  buildMainTrendChart();
  buildOverlayChart();
  buildMomentumChart();

  return {
    imagePaths: {
      main: chartPaths.mainImagePath,
      overlay: chartPaths.overlayImagePath,
      momentum: chartPaths.momentumImagePath,
    },
    chartBarsUsed: barsWindow.length,
    leadBarsUsed: leadSlots,
  };
}

function renderRead(metrics) {
  const formatLevel = (value) => (Number.isFinite(value) ? formatAxisNumber(value) : "n/a");
  const aboveLevels = ([
    metrics.ichimoku.tenkan,
    metrics.ma20Value,
    metrics.ichimoku.kijun,
    metrics.breakoutLevel,
    metrics.ichimoku.currentCloudA,
    metrics.ichimoku.currentCloudB,
  ])
    .filter((value) => Number.isFinite(value) && value > metrics.latestClose)
    .sort((left, right) => left - right);
  const belowLevels = ([
    metrics.breakdownLevel,
    metrics.bollinger.lower,
    metrics.ma120Value,
    metrics.ichimoku.currentCloudA,
    metrics.ichimoku.currentCloudB,
  ])
    .filter((value) => Number.isFinite(value) && value < metrics.latestClose)
    .sort((left, right) => right - left);
  const nearestRecovery = aboveLevels.length > 0 ? aboveLevels[0] : null;
  const nextRecovery = aboveLevels.length > 1 ? aboveLevels[1] : null;
  const nearestSupport = belowLevels.length > 0 ? belowLevels[0] : null;

  const trendLine = (() => {
    if (metrics.movingAverageStructure === "strong-bullish") {
      return `- Trend structure: price is above MA5, MA20, MA60, and MA120, so the trend stack is fully bullish.`;
    }
    if (metrics.movingAverageStructure === "strong-bearish") {
      return `- Trend structure: price is below MA5, MA20, MA60, and MA120, so the trend stack remains firmly bearish.`;
    }
    if (metrics.movingAverageStructure === "rebound-inside-downtrend") {
      return `- Trend structure: price has lifted above MA20 but still sits below MA60, so this is a rebound attempt inside a broader downtrend.`;
    }
    if (metrics.movingAverageStructure === "pullback-inside-uptrend") {
      return `- Trend structure: price is below MA20 but still above MA60, which keeps this closer to a pullback than a full trend break.`;
    }
    if (metrics.movingAverageStructure === "bullish") {
      return `- Trend structure: price is above the medium- and long-term averages, so the broader trend still leans constructive.`;
    }
    if (metrics.movingAverageStructure === "bearish") {
      return `- Trend structure: price is below MA20, MA60, and MA120, so rallies still need confirmation before they count as trend recovery.`;
    }
    return `- Trend structure: moving averages are mixed, so trend confirmation is still limited.`;
  })();

  const volatilityLine = (() => {
    let bandText = "price is around the middle of the Bollinger range";
    if (metrics.bollinger.state === "above-upper-band") {
      bandText = "price is pushing above the upper Bollinger band";
    } else if (metrics.bollinger.state === "below-lower-band") {
      bandText = "price is pressing below the lower Bollinger band";
    } else if (metrics.bollinger.state === "upper-half") {
      bandText = "price is in the upper half of the Bollinger range";
    } else if (metrics.bollinger.state === "lower-half") {
      bandText = "price is in the lower half of the Bollinger range";
    }

    let widthText = "band width is stable";
    if (metrics.bollinger.bandwidthRegime === "expanding") {
      widthText = "band width is expanding, so volatility is widening";
    } else if (metrics.bollinger.bandwidthRegime === "contracting") {
      widthText = "band width is contracting, so volatility is compressing";
    }

    return `- Volatility: ${bandText}, and ${widthText}.`;
  })();

  const cloudLine = (() => {
    const cloudText =
      metrics.ichimoku.cloudPosition === "above-cloud"
        ? "price is above the current cloud"
        : metrics.ichimoku.cloudPosition === "below-cloud"
          ? "price is below the current cloud"
          : metrics.ichimoku.cloudPosition === "inside-cloud"
            ? "price is inside the current cloud"
            : "current cloud positioning is unavailable";
    const tkText =
      metrics.ichimoku.tkCross === "bullish"
        ? "Tenkan is above Kijun"
        : metrics.ichimoku.tkCross === "bearish"
          ? "Tenkan is below Kijun"
          : metrics.ichimoku.tkCross === "flat"
            ? "Tenkan and Kijun are flat"
            : "Tenkan/Kijun positioning is unavailable";
    const futureText =
      metrics.ichimoku.futureCloudBias === "bullish"
        ? "the projected cloud is bullish"
        : metrics.ichimoku.futureCloudBias === "bearish"
          ? "the projected cloud is bearish"
          : metrics.ichimoku.futureCloudBias === "flat"
            ? "the projected cloud is flat"
            : "the projected cloud is unavailable";
    return `- Cloud read: ${cloudText}, ${tkText.toLowerCase()}, and ${futureText}.`;
  })();

  const momentumLine = (() => {
    const rsiText =
      metrics.rsiState === "overbought"
        ? `RSI14 is overbought at ${formatNumber(metrics.rsi14Value)}`
        : metrics.rsiState === "oversold"
          ? `RSI14 is oversold at ${formatNumber(metrics.rsi14Value)}`
          : metrics.rsiState === "neutral"
            ? `RSI14 is neutral at ${formatNumber(metrics.rsi14Value)}`
            : "RSI14 is unavailable";
    const macdCrossText =
      metrics.macd.crossState === "bullish-cross"
        ? "MACD has just crossed bullishly through signal"
        : metrics.macd.crossState === "bearish-cross"
          ? "MACD has just crossed bearishly through signal"
          : metrics.macd.crossState === "bullish"
            ? "MACD remains above signal"
            : metrics.macd.crossState === "bearish"
              ? "MACD remains below signal"
              : "MACD/signal relationship is limited";
    const zeroText =
      metrics.macd.zeroState === "above-zero"
        ? "MACD is above zero"
        : metrics.macd.zeroState === "below-zero"
          ? "MACD is below zero"
          : metrics.macd.zeroState === "at-zero"
            ? "MACD is sitting on zero"
            : "";
    const histogramText =
      metrics.macd.histogramState === "expanding"
        ? "histogram momentum is expanding"
        : metrics.macd.histogramState === "contracting"
          ? "histogram momentum is contracting"
          : metrics.macd.histogramState === "stable"
            ? "histogram momentum is stable"
            : "histogram trend is unavailable";
    const adxText =
      metrics.adx.strengthState === "strong-trend"
        ? `ADX shows a strong trend, with ${
            metrics.adx.directionState === "bullish"
              ? "+DI in front"
              : metrics.adx.directionState === "bearish"
                ? "-DI in front"
                : "directional lines overlapping"
          }`
        : metrics.adx.strengthState === "building-trend"
          ? `ADX shows a trend that is building, with ${
              metrics.adx.directionState === "bullish"
                ? "+DI slightly ahead"
                : metrics.adx.directionState === "bearish"
                  ? "-DI slightly ahead"
                  : "directional lines still close"
            }`
          : metrics.adx.strengthState === "weak-trend"
            ? "ADX still reads as a weak-trend environment"
            : "ADX trend-strength read is unavailable";
    const adxSlopeText =
      metrics.adx.slopeState === "rising"
        ? "trend strength is rising"
        : metrics.adx.slopeState === "falling"
          ? "trend strength is fading"
          : metrics.adx.slopeState === "flat"
            ? "trend strength is flat"
            : "trend-strength slope is unavailable";
    const volumeText =
      metrics.volumeRegime === "heavy"
        ? "volume is running heavy versus the 20-day average"
        : metrics.volumeRegime === "light"
          ? "volume is light versus the 20-day average"
          : metrics.volumeRegime === "normal"
            ? "volume is close to the 20-day average"
            : "volume comparison is unavailable";
    const macdSummary = zeroText ? `${macdCrossText}, and ${zeroText}` : macdCrossText;
    return `- Momentum and participation: ${rsiText}; ${macdSummary}; ${histogramText}; ${adxText}, and ${adxSlopeText}; ${volumeText}.`;
  })();

  const practicalLine = (() => {
    const recoveryText = Number.isFinite(nearestRecovery)
      ? `first recovery check is ${formatLevel(nearestRecovery)}`
      : "near-term recovery level is unavailable";
    const nextRecoveryText = Number.isFinite(nextRecovery)
      ? `then ${formatLevel(nextRecovery)}`
      : null;
    const supportText = Number.isFinite(nearestSupport)
      ? `nearest support watch is ${formatLevel(nearestSupport)}`
      : "support watch is unavailable";
    const breakoutText = Number.isFinite(metrics.breakoutLevel)
      ? `20-day breakout level sits at ${formatLevel(metrics.breakoutLevel)}`
      : "20-day breakout level is unavailable";
    const breakdownText = Number.isFinite(metrics.breakdownLevel)
      ? `20-day breakdown level sits at ${formatLevel(metrics.breakdownLevel)}`
      : "20-day breakdown level is unavailable";

    let flowText = "chart-only flow is range-bound or base-building";
    if (metrics.chartFlow === "bullish continuation") {
      flowText = "chart-only flow still reads as bullish continuation";
    } else if (metrics.chartFlow === "bearish continuation") {
      flowText = "chart-only flow still reads as bearish continuation";
    } else if (metrics.chartFlow === "technical rebound inside broader downtrend") {
      flowText = "chart-only flow looks like a technical rebound inside a broader downtrend";
    } else if (metrics.chartFlow === "pullback inside broader uptrend") {
      flowText = "chart-only flow looks like a pullback inside a broader uptrend";
    }

    return `- Practical checklist: ${supportText}; ${recoveryText}${nextRecoveryText ? `, ${nextRecoveryText}` : ""}; ${breakoutText}; ${breakdownText}; ${flowText}.`;
  })();

  console.log(trendLine);
  console.log(volatilityLine);
  console.log(cloudLine);
  console.log(momentumLine);
  console.log(practicalLine);
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
  requireNamedChartInput(data, args);
  const bars = normalizeTechnicalBars(data.bars || []);
  requireValidTechnicalBars(bars);
  const metrics = buildTechnicalMetrics(bars);
  const pngInfo = args.pngOut ? buildChartPngs(data, bars, metrics, args) : null;

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
  console.log(`- MACD state: ${metrics.macd.crossState} / ${metrics.macd.zeroState}`);
  console.log(`- ADX state: ${metrics.adx.strengthState} / ${metrics.adx.directionState} / ${metrics.adx.slopeState}`);
  console.log(`- Volume regime: ${metrics.volumeRegime}`);
  console.log(`- Chart-only flow: ${metrics.chartFlow}`);
  console.log("");

  if (pngInfo) {
    console.log("## Chart Images");
    console.log("");
    console.log(`![${data.name || data.ticker || "Chart"} main trend chart](${pngInfo.imagePaths.main})`);
    console.log("");
    console.log(`![${data.name || data.ticker || "Chart"} overlay chart](${pngInfo.imagePaths.overlay})`);
    console.log("");
    console.log(`![${data.name || data.ticker || "Chart"} momentum chart](${pngInfo.imagePaths.momentum})`);
    console.log("");
    console.log(
      `The main chart uses OHLC candlesticks with upper and lower wicks, plus MA5, MA20, MA60, MA120, and volume. The overlay chart separates Bollinger Bands, Ichimoku cloud lines, and RSI14, and reserves ${pngInfo.leadBarsUsed} forward slots for the projected cloud. The momentum chart focuses on MACD, signal, histogram, and ADX/DMI so crossovers, momentum acceleration, and trend strength are easier to see.`,
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
  console.log(`| MACD | ${formatNumber(metrics.macd.macdValue)} |`);
  console.log(`| Signal | ${formatNumber(metrics.macd.signalValue)} |`);
  console.log(`| Histogram | ${formatNumber(metrics.macd.histogramValue)} |`);
  console.log(`| MACD State | ${metrics.macd.crossState} / ${metrics.macd.zeroState} |`);
  console.log(`| Histogram State | ${metrics.macd.histogramState} |`);
  console.log(`| ADX 14 | ${formatNumber(metrics.adx.adxValue)} |`);
  console.log(`| +DI | ${formatNumber(metrics.adx.plusDiValue)} |`);
  console.log(`| -DI | ${formatNumber(metrics.adx.minusDiValue)} |`);
  console.log(`| ADX State | ${metrics.adx.strengthState} / ${metrics.adx.directionState} / ${metrics.adx.slopeState} |`);
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
