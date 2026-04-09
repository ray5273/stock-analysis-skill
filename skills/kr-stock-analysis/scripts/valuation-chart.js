#!/usr/bin/env node

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ---------------------------------------------------------------------------
// Bitmap font tables (copied from chart-basics.js for self-containment)
// ---------------------------------------------------------------------------

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
  "\u3131": ["11110", "10000", "10000", "10000", "00000"],
  "\u3134": ["10000", "10000", "10000", "11110", "00000"],
  "\u3137": ["11110", "10000", "10000", "11110", "00000"],
  "\u3139": ["11110", "10000", "11110", "00010", "11110"],
  "\u3141": ["11110", "10010", "10010", "11110", "00000"],
  "\u3142": ["11110", "10010", "11110", "10010", "11110"],
  "\u3145": ["00100", "01010", "10001", "00000", "00000"],
  "\u3147": ["01110", "10001", "10001", "01110", "00000"],
  "\u3148": ["11111", "00100", "01010", "10001", "00000"],
  "\u314A": ["00100", "11111", "01010", "10001", "00000"],
  "\u314B": ["11110", "10000", "11100", "10000", "00000"],
  "\u314C": ["11110", "10000", "11110", "10000", "11110"],
  "\u314D": ["10010", "10010", "11110", "10010", "10010"],
  "\u314E": ["11111", "00100", "01110", "10001", "01110"],
  "\u314F": ["00100", "00100", "11100", "00100", "00100"],
  "\u3150": ["01100", "01100", "11100", "01100", "01100"],
  "\u3151": ["00100", "11100", "00100", "11100", "00100"],
  "\u3152": ["01100", "11100", "01100", "11100", "01100"],
  "\u3153": ["00100", "00100", "00111", "00100", "00100"],
  "\u3154": ["00110", "00110", "00111", "00110", "00110"],
  "\u3155": ["00100", "00111", "00100", "00111", "00100"],
  "\u3156": ["00110", "00111", "00110", "00111", "00110"],
  "\u3157": ["11111", "00100", "00100", "00000", "00000"],
  "\u315B": ["11111", "01010", "01010", "00000", "00000"],
  "\u315C": ["00000", "00000", "00100", "00100", "11111"],
  "\u3160": ["00000", "00000", "01010", "01010", "11111"],
  "\u3161": ["00000", "00000", "11111", "00000", "00000"],
  "\u3163": ["00100", "00100", "00100", "00100", "00100"],
};

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const HANGUL_INITIALS = ["\u3131", "\u3132", "\u3134", "\u3137", "\u3138", "\u3139", "\u3141", "\u3142", "\u3143", "\u3145", "\u3146", "\u3147", "\u3148", "\u3149", "\u314A", "\u314B", "\u314C", "\u314D", "\u314E"];
const HANGUL_MEDIALS = [
  ["\u314F"], ["\u3150"], ["\u3151"], ["\u3152"], ["\u3153"], ["\u3154"], ["\u3155"], ["\u3156"], ["\u3157"], ["\u3157", "\u314F"], ["\u3157", "\u3150"], ["\u3157", "\u3163"],
  ["\u315B"], ["\u315C"], ["\u315C", "\u3153"], ["\u315C", "\u3154"], ["\u315C", "\u3163"], ["\u3160"], ["\u3161"], ["\u3161", "\u3163"], ["\u3163"],
];
const HANGUL_FINALS = [
  [], ["\u3131"], ["\u3132"], ["\u3131", "\u3145"], ["\u3134"], ["\u3134", "\u3148"], ["\u3134", "\u314E"], ["\u3137"], ["\u3139"], ["\u3139", "\u3131"], ["\u3139", "\u3141"], ["\u3139", "\u3142"],
  ["\u3139", "\u3145"], ["\u3139", "\u314C"], ["\u3139", "\u314D"], ["\u3139", "\u314E"], ["\u3141"], ["\u3142"], ["\u3142", "\u3145"], ["\u3145"], ["\u3146"], ["\u3147"], ["\u3148"], ["\u314A"], ["\u314B"], ["\u314C"], ["\u314D"], ["\u314E"],
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
].filter(Boolean);
const EXTERNAL_TEXT_STATE = { checked: false, available: false, fontPath: null };
const EXTERNAL_TEXT_CACHE = new Map();

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") { result.input = argv[++i]; }
    else if (arg === "--png-out") { result.pngOut = argv[++i]; }
    else if (arg === "--image-path") { result.imagePath = argv[++i]; }
    else if (arg === "--width") { result.width = parseInt(argv[++i], 10); }
    else if (arg === "--height") { result.height = parseInt(argv[++i], 10); }
    else if (arg === "--help" || arg === "-h") { result.help = true; }
    else { throw new Error(`Unknown argument: ${arg}`); }
  }
  return result;
}

function usage() {
  return [
    "Usage:",
    "  node valuation-chart.js --input data.json --png-out valuation.png [--image-path <md-path>] [--width 1200] [--height 800]",
    "",
    "Generates PER, PBR, and EV/EBITDA time-series PNG charts from historical valuation data.",
    "Requires at least 3 years of data for each metric; defaults to 5-year window.",
    "Output files: <base>-per.png, <base>-pbr.png, <base>-evEbitda.png",
  ].join("\n");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

// ---------------------------------------------------------------------------
// Stat helpers (from valuation-bands.js)
// ---------------------------------------------------------------------------

function toPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function formatNumber(value, digits = 1, suffix = "x") {
  if (value === null) { return "-"; }
  return `${value.toFixed(digits)}${suffix}`;
}

function percentileRank(values, current) {
  if (current === null || values.length === 0) { return null; }
  const count = values.filter((v) => v <= current).length;
  return (count / values.length) * 100;
}

function median(values) {
  if (values.length === 0) { return null; }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function bandLabel(percentile) {
  if (percentile === null) { return "insufficient-data"; }
  if (percentile <= 33) { return "lower"; }
  if (percentile >= 67) { return "upper"; }
  return "middle";
}

// ---------------------------------------------------------------------------
// Period policy helpers
// ---------------------------------------------------------------------------

function spanYears(points) {
  if (points.length < 2) { return 0; }
  const first = new Date(points[0].date);
  const last = new Date(points[points.length - 1].date);
  return (last - first) / (365.25 * 24 * 60 * 60 * 1000);
}

function hasMinimumSpan(points, minYears = 3) {
  return spanYears(points) >= minYears;
}

function computeActualYears(points) {
  const years = spanYears(points);
  return Math.round(years);
}

// ---------------------------------------------------------------------------
// Pixel buffer primitives (from chart-basics.js)
// ---------------------------------------------------------------------------

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
  if (x < 0 || x >= width || y < 0 || y >= height) { return; }
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
    for (let ox = -Math.floor(thickness / 2); ox <= Math.floor(thickness / 2); ox += 1) {
      for (let oy = -Math.floor(thickness / 2); oy <= Math.floor(thickness / 2); oy += 1) {
        blendPixel(buffer, width, height, x + ox, y + oy, color);
      }
    }
  }
}

function drawDashedLine(buffer, width, height, x0, y0, x1, y1, color, thickness, dashOn, dashOff) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const totalLength = Math.sqrt(dx * dx + dy * dy);
  if (totalLength === 0) { return; }
  const ux = dx / totalLength;
  const uy = dy / totalLength;
  let pos = 0;
  while (pos < totalLength) {
    const segEnd = Math.min(pos + dashOn, totalLength);
    drawLine(
      buffer, width, height,
      Math.round(x0 + ux * pos), Math.round(y0 + uy * pos),
      Math.round(x0 + ux * segEnd), Math.round(y0 + uy * segEnd),
      color, thickness,
    );
    pos = segEnd + dashOff;
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

function drawMarker(buffer, width, height, x, y, size, color) {
  const half = Math.floor(size / 2);
  fillRect(buffer, width, height, x - half, y - half, size, size, color);
}

// ---------------------------------------------------------------------------
// Text rendering (from chart-basics.js)
// ---------------------------------------------------------------------------

function glyphWidth() { return 5; }

function clamp(value, minValue, maxValue) {
  return Math.min(Math.max(value, minValue), maxValue);
}

function containsHangul(text) {
  return /[\uac00-\ud7a3]/.test(String(text || ""));
}

function resolveExternalTextRenderer() {
  if (EXTERNAL_TEXT_STATE.checked) { return EXTERNAL_TEXT_STATE; }
  EXTERNAL_TEXT_STATE.checked = true;
  const helperPath = process.platform === "win32" ? EXTERNAL_TEXT_HELPER_PS1 : EXTERNAL_TEXT_HELPER_PY;
  if (!fs.existsSync(helperPath)) { return EXTERNAL_TEXT_STATE; }
  const fontPath = EXTERNAL_FONT_CANDIDATES.find((c) => fs.existsSync(c));
  if (!fontPath) { return EXTERNAL_TEXT_STATE; }
  EXTERNAL_TEXT_STATE.available = true;
  EXTERNAL_TEXT_STATE.fontPath = fontPath;
  return EXTERNAL_TEXT_STATE;
}

function externalFontSize(scale) {
  return Math.max(12, Math.round(scale * 9));
}

function normalizeExternalTextPayload(payloadText) {
  const payload = JSON.parse(String(payloadText || "").trim());
  return { width: payload.width, height: payload.height, alpha: Buffer.from(payload.alpha || "", "base64") };
}

function loadExternalTextMask(text, scale = 1) {
  if (!containsHangul(text)) { return null; }
  const renderer = resolveExternalTextRenderer();
  if (!renderer.available || !renderer.fontPath) { return null; }
  const normalized = String(text);
  const cacheKey = `${renderer.fontPath}|${externalFontSize(scale)}|${normalized}`;
  if (EXTERNAL_TEXT_CACHE.has(cacheKey)) { return EXTERNAL_TEXT_CACHE.get(cacheKey); }
  try {
    const stdout =
      process.platform === "win32"
        ? execFileSync("powershell", ["-ExecutionPolicy", "Bypass", "-File", EXTERNAL_TEXT_HELPER_PS1, "-FontPath", renderer.fontPath, "-FontSize", String(externalFontSize(scale)), "-Text", normalized], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
        : execFileSync("python3", [EXTERNAL_TEXT_HELPER_PY, "--font-path", renderer.fontPath, "--font-size", String(externalFontSize(scale)), "--text", normalized], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    const mask = normalizeExternalTextPayload(stdout);
    EXTERNAL_TEXT_CACHE.set(cacheKey, mask);
    return mask;
  } catch (error) {
    if (error && error.stdout) {
      try { const mask = normalizeExternalTextPayload(error.stdout); EXTERNAL_TEXT_CACHE.set(cacheKey, mask); return mask; } catch (_) { /* fall through */ }
    }
    EXTERNAL_TEXT_STATE.available = false;
    EXTERNAL_TEXT_STATE.fontPath = null;
    return null;
  }
}

function drawAlphaMask(buffer, width, height, x, y, mask, color) {
  if (!mask || mask.width <= 0 || mask.height <= 0) { return; }
  const alphaScale = color[3] === undefined ? 255 : color[3];
  for (let row = 0; row < mask.height; row += 1) {
    for (let col = 0; col < mask.width; col += 1) {
      const alpha = mask.alpha[row * mask.width + col];
      if (alpha > 0) {
        blendPixel(buffer, width, height, x + col, y + row, [color[0], color[1], color[2], Math.round((alpha * alphaScale) / 255)]);
      }
    }
  }
}

function isHangulSyllable(character) {
  if (!character) { return false; }
  const code = character.codePointAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_END;
}

function normalizeConsonantParts(jamo) {
  const doubled = { "\u3132": ["\u3131", "\u3131"], "\u3138": ["\u3137", "\u3137"], "\u3143": ["\u3142", "\u3142"], "\u3146": ["\u3145", "\u3145"], "\u3149": ["\u3148", "\u3148"] };
  return doubled[jamo] || [jamo];
}

function decomposeHangulSyllable(character) {
  if (!isHangulSyllable(character)) { return null; }
  const syllableIndex = character.codePointAt(0) - HANGUL_BASE;
  const initialIndex = Math.floor(syllableIndex / 588);
  const medialIndex = Math.floor((syllableIndex % 588) / 28);
  const finalIndex = syllableIndex % 28;
  return {
    initials: normalizeConsonantParts(HANGUL_INITIALS[initialIndex]).slice(0, 2),
    medials: HANGUL_MEDIALS[medialIndex].slice(0, 2),
    finals: HANGUL_FINALS[finalIndex].flatMap((j) => normalizeConsonantParts(j)).slice(0, 2),
  };
}

function hangulGlyphWidth() { return 17; }

function drawBitmap(buffer, width, height, x, y, bitmap, color, scale = 1) {
  bitmap.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col += 1) {
      if (row[col] === "1") { fillRect(buffer, width, height, x + col * scale, y + rowIndex * scale, scale, scale, color); }
    }
  });
}

function drawHangulGlyph(buffer, width, height, x, y, character, color, scale = 1) {
  const parts = decomposeHangulSyllable(character);
  if (!parts) { drawBitmap(buffer, width, height, x, y, FONT_5X7["?"], color, scale); return hangulGlyphWidth(); }
  const initialXs = parts.initials.length > 1 ? [0, 3] : [0];
  const medialXs = parts.medials.length > 1 ? [6, 12] : [6];
  const finalXs = parts.finals.length > 1 ? [3, 9] : [6];
  parts.initials.forEach((jamo, i) => { const b = JAMO_5X5[jamo]; if (b) drawBitmap(buffer, width, height, x + initialXs[i] * scale, y, b, color, scale); });
  parts.medials.forEach((jamo, i) => { const b = JAMO_5X5[jamo]; if (b) drawBitmap(buffer, width, height, x + medialXs[i] * scale, y, b, color, scale); });
  parts.finals.forEach((jamo, i) => { const b = JAMO_5X5[jamo]; if (b) drawBitmap(buffer, width, height, x + finalXs[i] * scale, y + 6 * scale, b, color, scale); });
  return hangulGlyphWidth();
}

function measureCharacterWidth(character) {
  return isHangulSyllable(character) ? hangulGlyphWidth() : glyphWidth();
}

function measureText(text, scale = 1) {
  const externalMask = loadExternalTextMask(text, scale);
  if (externalMask) { return externalMask.width; }
  if (!text) { return 0; }
  const characters = Array.from(String(text));
  return characters.reduce((sum, ch, i) => sum + measureCharacterWidth(ch) * scale + (i === characters.length - 1 ? 0 : scale), 0);
}

function drawText(buffer, width, height, x, y, text, color, scale = 1, align = "left") {
  const externalMask = loadExternalTextMask(text, scale);
  const characters = Array.from(String(text));
  let cursorX = x;
  const totalWidth = externalMask ? externalMask.width : measureText(text, scale);
  if (align === "center") { cursorX -= Math.round(totalWidth / 2); }
  else if (align === "right") { cursorX -= totalWidth; }
  if (externalMask) { drawAlphaMask(buffer, width, height, Math.round(cursorX), Math.round(y), externalMask, color); return; }
  for (const character of characters) {
    if (isHangulSyllable(character)) { cursorX += drawHangulGlyph(buffer, width, height, cursorX, y, character, color, scale) * scale + scale; continue; }
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

function drawValueCallout(buffer, width, height, rightEdge, y, label, borderColor, textColor, panelTop, panelHeight) {
  const paddingX = 8;
  const boxHeight = 24;
  const boxWidth = measureText(label, 2) + paddingX * 2;
  const boxLeft = rightEdge - boxWidth;
  const boxTop = clamp(Math.round(y - boxHeight / 2), panelTop + 4, panelTop + panelHeight - boxHeight - 4);
  const fillColor = [255, 255, 255, 230];
  fillRect(buffer, width, height, boxLeft, boxTop, boxWidth, boxHeight, fillColor);
  drawLine(buffer, width, height, boxLeft, boxTop, boxLeft + boxWidth, boxTop, borderColor, 1);
  drawLine(buffer, width, height, boxLeft, boxTop + boxHeight, boxLeft + boxWidth, boxTop + boxHeight, borderColor, 1);
  drawLine(buffer, width, height, boxLeft, boxTop, boxLeft, boxTop + boxHeight, borderColor, 1);
  drawLine(buffer, width, height, boxLeft + boxWidth, boxTop, boxLeft + boxWidth, boxTop + boxHeight, borderColor, 1);
  drawText(buffer, width, height, boxLeft + paddingX, boxTop + 4, label, textColor, 2);
}

// ---------------------------------------------------------------------------
// PNG encoding (from chart-basics.js)
// ---------------------------------------------------------------------------

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let b = 0; b < 8; b += 1) { c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; }
    table[i] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = buildCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) { crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8); }
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
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const rawOffset = row * (stride + 1);
    raw[rawOffset] = 0;
    rgbaBuffer.copy(raw, rawOffset + 1, row * stride, row * stride + stride);
  }
  return Buffer.concat([header, makeChunk("IHDR", ihdr), makeChunk("IDAT", zlib.deflateSync(raw)), makeChunk("IEND", Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function pickTickIndices(length, count) {
  if (length <= 0) { return []; }
  const target = Math.min(count, length);
  const indices = new Set([0, length - 1]);
  if (target > 2) {
    for (let slot = 1; slot < target - 1; slot += 1) {
      indices.add(Math.round((slot * (length - 1)) / (target - 1)));
    }
  }
  return [...indices].sort((a, b) => a - b);
}

function valueToY(value, minValue, maxValue, top, height) {
  if (maxValue === minValue) { return top + height / 2; }
  return top + ((maxValue - value) / (maxValue - minValue)) * height;
}

function appendSuffixToPath(targetPath, suffix) {
  const ext = path.extname(targetPath);
  if (ext) { return `${targetPath.slice(0, -ext.length)}-${suffix}${ext}`; }
  return `${targetPath}-${suffix}.png`;
}

// ---------------------------------------------------------------------------
// Chart builder
// ---------------------------------------------------------------------------

function buildValuationChart(data, metricKey, label, pngPath, options) {
  const width = options.width || 1200;
  const height = options.height || 800;

  const series = [...data.series].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const points = series
    .map((entry) => ({ date: entry.date, value: toPositiveNumber(entry[metricKey]) }))
    .filter((p) => p.value !== null);

  if (points.length < 2) {
    return { skipped: true, reason: "insufficient data points" };
  }

  if (!hasMinimumSpan(points)) {
    return { skipped: true, reason: "less than 3 years of data" };
  }

  const actualYears = computeActualYears(points);
  const values = points.map((p) => p.value);
  const current = values[values.length - 1];
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const medianValue = median(values);
  const pctile = percentileRank(values, current);

  // Layout constants
  const margin = { top: 100, right: 100, bottom: 80, left: 100 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Value range with 8% padding
  const range = maxValue - minValue || 1;
  const padding = range * 0.08;
  const yMin = minValue - padding;
  const yMax = maxValue + padding;

  // Theme
  const theme = {
    background: [248, 250, 252, 255],
    panel: [255, 255, 255, 255],
    border: [209, 213, 219, 255],
    grid: [229, 231, 235, 128],
    text: [51, 65, 85, 255],
    textLight: [100, 116, 139, 255],
    seriesLine: [30, 64, 175, 255],
    medianLine: [234, 88, 12, 255],
    bandFill: [37, 99, 235, 28],
    bandBorder: [37, 99, 235, 60],
    marker: [30, 64, 175, 255],
    currentMarker: [220, 38, 38, 255],
  };

  const buf = createRgbaBuffer(width, height, theme.background);

  // Panel background
  fillRect(buf, width, height, margin.left, margin.top, plotWidth, plotHeight, theme.panel);

  // Panel border
  drawLine(buf, width, height, margin.left, margin.top, margin.left + plotWidth, margin.top, theme.border, 1);
  drawLine(buf, width, height, margin.left, margin.top + plotHeight, margin.left + plotWidth, margin.top + plotHeight, theme.border, 1);
  drawLine(buf, width, height, margin.left, margin.top, margin.left, margin.top + plotHeight, theme.border, 1);
  drawLine(buf, width, height, margin.left + plotWidth, margin.top, margin.left + plotWidth, margin.top + plotHeight, theme.border, 1);

  // Title
  const companyName = data.name || data.ticker || "Unknown";
  const titleText = `${companyName} - ${label} Valuation Band (${actualYears}Y)`;
  drawText(buf, width, height, Math.round(width / 2), 20, titleText, theme.text, 3, "center");

  // Subtitle: as-of date
  if (data.asOf) {
    drawText(buf, width, height, Math.round(width / 2), 52, `As of ${data.asOf}`, theme.textLight, 2, "center");
  }

  // Legend row
  let legendX = margin.left;
  const legendY = 72;
  legendX = drawLegendItem(buf, width, height, legendX, legendY, theme.seriesLine, label);
  legendX = drawLegendItem(buf, width, height, legendX, legendY, theme.medianLine, "Median");
  drawLegendItem(buf, width, height, legendX, legendY, theme.bandFill, "Min/Max Band");

  // Y-axis ticks (5 ticks)
  const yTickCount = 5;
  for (let i = 0; i <= yTickCount; i += 1) {
    const val = yMin + ((yMax - yMin) * i) / yTickCount;
    const y = valueToY(val, yMin, yMax, margin.top, plotHeight);
    // Grid line
    if (i > 0 && i < yTickCount) {
      drawDashedLine(buf, width, height, margin.left + 1, Math.round(y), margin.left + plotWidth - 1, Math.round(y), theme.grid, 1, 4, 4);
    }
    // Label
    drawText(buf, width, height, margin.left - 8, Math.round(y) - 7, formatNumber(val), theme.textLight, 2, "right");
  }

  // X-axis ticks
  const xTickIndices = pickTickIndices(points.length, 8);
  function xForIndex(idx) {
    if (points.length <= 1) { return margin.left + plotWidth / 2; }
    return margin.left + (idx / (points.length - 1)) * plotWidth;
  }

  for (const idx of xTickIndices) {
    const x = Math.round(xForIndex(idx));
    drawLine(buf, width, height, x, margin.top + plotHeight, x, margin.top + plotHeight + 6, theme.border, 1);
    const dateStr = points[idx].date.length > 7 ? points[idx].date.slice(0, 7) : points[idx].date;
    drawText(buf, width, height, x, margin.top + plotHeight + 12, dateStr, theme.textLight, 2, "center");
  }

  // Min/Max band (filled rectangle across the plot at constant min/max values)
  const bandTop = Math.round(valueToY(maxValue, yMin, yMax, margin.top, plotHeight));
  const bandBottom = Math.round(valueToY(minValue, yMin, yMax, margin.top, plotHeight));
  fillRect(buf, width, height, margin.left + 1, bandTop, plotWidth - 2, bandBottom - bandTop, theme.bandFill);
  // Band border lines
  drawDashedLine(buf, width, height, margin.left + 1, bandTop, margin.left + plotWidth - 1, bandTop, theme.bandBorder, 1, 6, 4);
  drawDashedLine(buf, width, height, margin.left + 1, bandBottom, margin.left + plotWidth - 1, bandBottom, theme.bandBorder, 1, 6, 4);

  // Min/Max labels on right
  drawText(buf, width, height, margin.left + plotWidth + 6, bandTop - 7, `Max ${formatNumber(maxValue)}`, theme.textLight, 2);
  drawText(buf, width, height, margin.left + plotWidth + 6, bandBottom - 7, `Min ${formatNumber(minValue)}`, theme.textLight, 2);

  // Median dashed line
  const medianY = Math.round(valueToY(medianValue, yMin, yMax, margin.top, plotHeight));
  drawDashedLine(buf, width, height, margin.left + 1, medianY, margin.left + plotWidth - 1, medianY, theme.medianLine, 2, 8, 6);
  drawText(buf, width, height, margin.left + plotWidth + 6, medianY - 7, `Med ${formatNumber(medianValue)}`, theme.medianLine, 2);

  // Series line
  const seriesPoints = points.map((p, i) => ({
    x: Math.round(xForIndex(i)),
    y: Math.round(valueToY(p.value, yMin, yMax, margin.top, plotHeight)),
  }));
  drawSeries(buf, width, height, seriesPoints, theme.seriesLine, 3);

  // Data point markers
  for (let i = 0; i < seriesPoints.length; i += 1) {
    const isLast = i === seriesPoints.length - 1;
    drawMarker(buf, width, height, seriesPoints[i].x, seriesPoints[i].y, isLast ? 7 : 5, isLast ? theme.currentMarker : theme.marker);
  }

  // Current value callout
  const lastPoint = seriesPoints[seriesPoints.length - 1];
  const calloutLabel = `${formatNumber(current)} (${pctile !== null ? pctile.toFixed(1) + "%" : "-"})`;
  drawValueCallout(buf, width, height, margin.left + plotWidth - 4, lastPoint.y, calloutLabel, theme.border, theme.seriesLine, margin.top, plotHeight);

  // Band label in bottom-left of panel
  const bandLbl = bandLabel(pctile);
  const bandNote = `Current: ${bandLbl} band`;
  drawText(buf, width, height, margin.left + 10, margin.top + plotHeight - 20, bandNote, theme.textLight, 2);

  // Encode and write
  const pngData = encodePng(width, height, buf);
  fs.writeFileSync(pngPath, pngData);

  return {
    skipped: false,
    pngPath,
    current,
    minValue,
    maxValue,
    medianValue,
    percentile: pctile,
    band: bandLbl,
    actualYears,
    points: points.length,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input || !args.pngOut) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const data = readJson(args.input);
  if (!Array.isArray(data.series) || data.series.length === 0) {
    throw new Error("Input JSON must include a non-empty series array.");
  }

  const metrics = [
    { key: "pe", label: "P/E", suffix: "per" },
    { key: "pbr", label: "P/B", suffix: "pbr" },
    { key: "evEbitda", label: "EV/EBITDA", suffix: "evEbitda" },
  ];

  const results = [];

  for (const metric of metrics) {
    const pngPath = appendSuffixToPath(args.pngOut, metric.suffix);
    const imagePath = args.imagePath ? appendSuffixToPath(args.imagePath, metric.suffix) : path.basename(pngPath);

    const result = buildValuationChart(data, metric.key, metric.label, pngPath, {
      width: args.width,
      height: args.height,
    });

    if (result.skipped) {
      console.log(`## ${metric.label} Valuation Chart`);
      console.log("");
      console.log(`> Skipped: ${result.reason}. At least 3 years of positive data required.`);
      console.log("");
    } else {
      console.log(`## ${metric.label} Valuation Band (${result.actualYears}Y)`);
      console.log("");
      console.log(`![${metric.label} Valuation Band](${imagePath})`);
      console.log("");
      console.log("| Metric | Current | Min | Median | Max | Percentile | Band |");
      console.log("| --- | --- | --- | --- | --- | --- | --- |");
      console.log(`| ${metric.label} | ${formatNumber(result.current)} | ${formatNumber(result.minValue)} | ${formatNumber(result.medianValue)} | ${formatNumber(result.maxValue)} | ${result.percentile !== null ? result.percentile.toFixed(1) + "%" : "-"} | ${result.band} |`);
      console.log("");
      results.push({ metric: metric.label, path: pngPath });
    }
  }

  if (results.length === 0) {
    console.log("> No valuation charts generated. All metrics had insufficient data (< 3 years).");
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
