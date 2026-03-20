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
    } else if (arg === "--output") {
      result.output = argv[i + 1];
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
    "  node extract-report-baseline.js --input analysis-example/kr/<company>.md [--output baseline.json]",
    "",
    "Notes:",
    "  - Parses memo metadata from an existing markdown report.",
    "  - Extracts memo date, recent update date, update-log dates, source URLs, and a short summary excerpt.",
  ].join("\n");
}

function readText(filePath) {
  return fs.readFileSync(path.resolve(filePath), "utf8");
}

function extractSingleLine(text, label) {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, "m");
  return text.match(pattern)?.[1]?.trim() || null;
}

function extractTitle(text) {
  return text.match(/^#\s+(.+)$/m)?.[1]?.trim() || null;
}

function cleanCompanyName(title, filePath) {
  const fallback = path.basename(filePath, path.extname(filePath));
  if (!title) {
    return fallback;
  }

  return title
    .replace(/\s+(analysis|memo|report)$/i, "")
    .replace(/\s+(분석 예시|분석|메모|리포트)$/i, "")
    .trim() || fallback;
}

function extractSection(text, heading) {
  const headingPattern = new RegExp(`^##\\s+${heading}\\s*$`, "m");
  const headingMatch = headingPattern.exec(text);
  if (!headingMatch) {
    return "";
  }

  const startIndex = headingMatch.index + headingMatch[0].length;
  const rest = text.slice(startIndex);
  const nextMatch = /\n##\s+/.exec(rest);
  const endIndex = nextMatch ? startIndex + nextMatch.index : text.length;

  return text.slice(startIndex, endIndex).trim();
}

function collapseWhitespace(text) {
  return text.replace(/\r/g, "").replace(/\n{2,}/g, "\n\n").trim();
}

function extractSummaryExcerpt(text) {
  const raw = extractSection(text, "Summary") || extractSection(text, "요약");
  if (!raw) {
    return null;
  }

  const normalized = collapseWhitespace(raw)
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .trim();

  return normalized.slice(0, 600) || null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractUpdateDates(text) {
  return unique(
    [...text.matchAll(/^###\s+(\d{4}-\d{2}-\d{2})\s+Update\s*$/gm)].map((match) => match[1]),
  );
}

function extractSourceUrls(text) {
  const markdownLinkUrls = [...text.matchAll(/\[[^\]]+]\((https?:\/\/[^)\s]+)\)/g)].map((match) => match[1]);
  const rawUrls = [...text.matchAll(/\bhttps?:\/\/[^\s)>]+/g)].map((match) => match[0]);
  return unique([...markdownLinkUrls, ...rawUrls]);
}

function inferTickerFromUrls(urls) {
  for (const url of urls) {
    const naverMatch = url.match(/[?&]code=(\d{6})\b/i);
    if (naverMatch) {
      return naverMatch[1];
    }

    const yahooMatch = url.match(/\/chart\/([0-9]{6}\.(?:KS|KQ))\b/i);
    if (yahooMatch) {
      return yahooMatch[1].toUpperCase();
    }
  }

  return null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const absoluteInput = path.resolve(args.input);
  const text = readText(absoluteInput);
  const title = extractTitle(text);
  const memoDate = extractSingleLine(text, "기준일");
  const recentUpdate = extractSingleLine(text, "최근 업데이트일");
  const updateDates = extractUpdateDates(text);
  const sourceUrls = extractSourceUrls(text);

  const payload = {
    path: absoluteInput,
    title,
    company: cleanCompanyName(title, absoluteInput),
    memoDate,
    recentUpdate,
    effectiveSourceStartDate: memoDate,
    hasUpdateLog: /^##\s+Update Log\s*$/m.test(text),
    existingUpdateDates: updateDates,
    existingSourceUrls: sourceUrls,
    summaryExcerpt: extractSummaryExcerpt(text),
    inferredTicker: inferTickerFromUrls(sourceUrls),
  };

  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  if (args.output) {
    fs.writeFileSync(path.resolve(args.output), serialized, "utf8");
  } else {
    process.stdout.write(serialized);
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
