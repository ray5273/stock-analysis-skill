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
    } else if (arg === "--reference") {
      result.reference = argv[i + 1];
      i += 1;
    } else if (arg === "--dart-cache") {
      result.dartCache = argv[i + 1];
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
    "  node extract-report-baseline.js --input analysis-example/kr/<company>/memo.md [--reference analysis-example/kr/<company>/dart-reference.md] [--dart-cache analysis-example/kr/<company>/dart-cache.json] [--output baseline.json]",
    "",
    "Notes:",
    "  - Parses memo metadata from an existing markdown report.",
    "  - Extracts memo date, recent update date, update-log dates, source URLs, and a short summary excerpt.",
    "  - Can also ingest DART reference digest and cache metadata for later filing updates.",
  ].join("\n");
}

function readText(filePath) {
  return fs.readFileSync(path.resolve(filePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function extractSingleLine(text, label) {
  const pattern = new RegExp(`^(?:[-*]\\s*)?${label}:\\s*(.+)$`, "m");
  return text.match(pattern)?.[1]?.trim().replace(/^`|`$/g, "") || null;
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

function fileExists(filePath) {
  return Boolean(filePath) && fs.existsSync(path.resolve(filePath));
}

function extractListSection(text, heading) {
  const section = extractSection(text, heading);
  if (!section) {
    return [];
  }

  return section
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function parseReferenceMetadata(referencePath) {
  if (!fileExists(referencePath)) {
    return null;
  }

  const text = readText(referencePath);
  return {
    path: path.resolve(referencePath),
    title: extractTitle(text),
    referenceDate: extractSingleLine(text, "reference 기준일"),
    lastCheckedDate: extractSingleLine(text, "최근 확인일"),
    lastFilingChecked: extractSingleLine(text, "마지막 반영 공시일"),
    tocCount: extractSingleLine(text, "TOC 기준 섹션 수"),
    parsedCount: extractSingleLine(text, "완전 파싱"),
    partialCount: extractSingleLine(text, "부분 파싱"),
    missingCount: extractSingleLine(text, "누락"),
    needsReviewCount: extractSingleLine(text, "재검토 필요"),
    nextCheckSections: extractListSection(text, "다음 업데이트 우선 확인 항목"),
  };
}

function parseDartCache(cachePath) {
  if (!fileExists(cachePath)) {
    return null;
  }

  const payload = readJson(cachePath);
  return {
    path: path.resolve(cachePath),
    asOf: payload.reference?.asOf || null,
    lastCheckedAt: payload.reference?.lastCheckedAt || null,
    lastFilingChecked: payload.reference?.lastFilingChecked || null,
    coverage: payload.coverage || null,
  };
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
  const referenceMetadata = parseReferenceMetadata(args.reference);
  const dartCacheMetadata = parseDartCache(args.dartCache);

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
    dartReference: referenceMetadata,
    dartCache: dartCacheMetadata,
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
