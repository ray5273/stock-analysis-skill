"use strict";

// Extractors for broker metadata (rating, target price, report date, thesis
// snippet) from Korean news article bodies. Scope-aware: most functions accept
// a text window so the caller can narrow matching to the paragraph around a
// specific broker mention instead of the whole article, avoiding cross-broker
// contamination.

const { findBrokersInText, firstAliasIndex, IB_WHITELIST } = require("./ib-whitelist");

function extractBrokers(text) {
  return findBrokersInText(text);
}

const TP_PATTERNS = [
  /목표주가[를을]?\s*([0-9][0-9,]{2,})\s*원으로\s*(?:상향|하향|제시|유지|조정|상승|하락)/,
  /목표주가[를을]?\s*([0-9][0-9,]{2,})\s*원/,
  /목표가[를을]?\s*([0-9][0-9,]{2,})\s*원/,
  /목표\s*가격[을를]?\s*([0-9][0-9,]{2,})\s*원/,
  /\bTP\s*([0-9][0-9,]{2,})\s*(?:원|KRW|krw)?/,
  /target\s*price[^0-9]{0,20}([0-9][0-9,]{2,})/i,
];

function extractTargetPrice(text) {
  if (!text) return null;
  for (const rx of TP_PATTERNS) {
    const m = text.match(rx);
    if (m) {
      const num = parseInt(m[1].replace(/,/g, ""), 10);
      if (Number.isFinite(num) && num >= 100 && num < 100_000_000) return num;
    }
  }
  const manWon = text.match(/목표주가[를을]?\s*([0-9]+(?:\.[0-9]+)?)\s*만\s*원/);
  if (manWon) {
    const v = Math.round(parseFloat(manWon[1]) * 10_000);
    if (v >= 100 && v < 100_000_000) return v;
  }
  return null;
}

// Order matters: more specific phrases first so "비중확대"/"시장수익률 상회"
// match before a generic token like 중립.
const RATING_MAP = [
  [/비중확대/, "Overweight"],
  [/비중축소/, "Underweight"],
  [/시장수익률\s*상회/, "Outperform"],
  [/시장수익률\s*하회/, "Underperform"],
  [/시장수익률/, "Neutral"],
  [/적극매수/, "Strong Buy"],
  [/중립/, "Neutral"],
  [/매수/, "Buy"],
  [/매도/, "Sell"],
  [/보유/, "Hold"],
  [/\bEqual[-\s]?weight\b/i, "Equal-weight"],
  [/\bOverweight\b/i, "Overweight"],
  [/\bUnderweight\b/i, "Underweight"],
  [/\bOutperform\b/i, "Outperform"],
  [/\bUnderperform\b/i, "Underperform"],
  [/\bStrong\s*Buy\b/i, "Strong Buy"],
  [/\bBuy\b/i, "Buy"],
  [/\bSell\b/i, "Sell"],
  [/\bHold\b/i, "Hold"],
  [/\bNeutral\b/i, "Neutral"],
];

function extractRating(text) {
  if (!text) return null;
  for (const [rx, label] of RATING_MAP) {
    if (rx.test(text)) return label;
  }
  return null;
}

function extractReportDate(text, articleDate = null) {
  if (!text) return articleDate || null;
  const full = text.match(/(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (full) return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
  const iso = text.match(/\b(20\d{2})[-/.]\s*(\d{1,2})[-/.]\s*(\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return articleDate || null;
}

function paragraphAroundBroker(text, canonical, { windowChars = 400 } = {}) {
  if (!text || !canonical) return "";
  const { index, alias } = firstAliasIndex(text, canonical);
  if (index < 0) return "";
  // Try paragraph boundaries first (double newline), fall back to fixed window.
  const paraStart = text.lastIndexOf("\n\n", index);
  const paraEnd = text.indexOf("\n\n", index + (alias ? alias.length : 0));
  if (paraStart >= 0 || paraEnd >= 0) {
    return text.slice(
      paraStart < 0 ? 0 : paraStart + 2,
      paraEnd < 0 ? text.length : paraEnd
    );
  }
  const half = Math.floor(windowChars / 2);
  return text.slice(Math.max(0, index - half), Math.min(text.length, index + half));
}

function extractThesisSnippet(text, canonical, { maxChars = 240 } = {}) {
  const para = paragraphAroundBroker(text, canonical);
  const flat = para.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  if (flat.length <= maxChars) return flat;
  return flat.slice(0, maxChars - 1).trim() + "…";
}

module.exports = {
  extractBrokers,
  extractTargetPrice,
  extractRating,
  extractReportDate,
  extractThesisSnippet,
  paragraphAroundBroker,
  IB_WHITELIST,
};
