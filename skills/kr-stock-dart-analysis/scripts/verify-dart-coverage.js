#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") {
      result.input = argv[index + 1];
      index += 1;
    } else if (arg === "--output") {
      result.output = argv[index + 1];
      index += 1;
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
    "  node verify-dart-coverage.js --input sections.json [--output coverage.json]",
    "",
    "Notes:",
    "  - Compares TOC headings with parsed sections.",
    "  - Labels each section as parsed, partial, missing, or needs_review.",
  ].join("\n");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.{2,}\s*\d+$/g, "")
    .replace(/\s+\d+$/g, "")
    .replace(/\s+/g, "")
    .replace(/[【】()\[\],.:;`'"-]/g, "");
}

function isReviewHeavy(title) {
  return /(재무|주석|손익|현금흐름|자본변동|재무상태|특수관계자|부문별보고|매출및수주|영업부문|우발부채|보고기간후사건)/.test(title);
}

function classifySection(section) {
  if (!section) {
    return "missing";
  }

  if (!section.contentLength || section.contentLength < 40) {
    return section.contentLength > 0 ? "partial" : "missing";
  }

  if (section.contentLength < 140) {
    return "partial";
  }

  if (isReviewHeavy(section.title) && section.numericBlockCount === 0 && section.tableCount === 0) {
    return "needs_review";
  }

  if (section.contentLength < 300 && section.numericBlockCount <= 1) {
    return "partial";
  }

  return "parsed";
}

function computeContainerStatus(item, items) {
  const children = items.filter(
    (candidate) => candidate.lineNumber > item.lineNumber && candidate.level > item.level,
  );

  const directChildren = [];
  for (const candidate of children) {
    const hasCloserParent = children.some(
      (other) =>
        other !== candidate &&
        other.lineNumber < candidate.lineNumber &&
        other.level > item.level &&
        other.level < candidate.level,
    );
    if (!hasCloserParent) {
      directChildren.push(candidate);
    }
  }

  if (directChildren.length === 0) {
    return item.status;
  }

  const parsedChildren = directChildren.filter((candidate) => candidate.status === "parsed").length;
  const partialChildren = directChildren.filter((candidate) => candidate.status === "partial").length;

  if (parsedChildren > 0) {
    return parsedChildren === directChildren.length ? "parsed" : "partial";
  }

  if (partialChildren > 0) {
    return "partial";
  }

  return item.status;
}

function buildCoverageReport(payload) {
  const toc = Array.isArray(payload.toc) ? payload.toc : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const sectionMap = new Map();
  for (const section of sections) {
    const key = normalizeTitle(section.title);
    const existing = sectionMap.get(key);
    if (!existing || (section.contentLength || 0) > (existing.contentLength || 0)) {
      sectionMap.set(key, section);
    }
  }

  const items = toc.map((tocItem) => {
    const matched = sectionMap.get(normalizeTitle(tocItem.title));
    const status = classifySection(matched);
    return {
      title: tocItem.title,
      level: tocItem.level,
      lineNumber: tocItem.lineNumber,
      status,
      matchedSectionId: matched ? matched.id : null,
      contentLength: matched ? matched.contentLength : 0,
      tableCount: matched ? matched.tableCount : 0,
      numericBlockCount: matched ? matched.numericBlockCount : 0,
      preview: matched ? matched.preview : null,
    };
  });

  for (const item of items) {
    if (item.status === "missing" && item.level <= 2) {
      item.status = computeContainerStatus(item, items);
    }
  }

  const byStatus = {
    parsed: items.filter((item) => item.status === "parsed"),
    partial: items.filter((item) => item.status === "partial"),
    missing: items.filter((item) => item.status === "missing"),
    needsReview: items.filter((item) => item.status === "needs_review"),
  };

  return {
    verifiedAt: new Date().toISOString(),
    sourceLineCount: payload.sourceLineCount || null,
    tocCount: toc.length,
    parsedCount: byStatus.parsed.length,
    partialCount: byStatus.partial.length,
    missingCount: byStatus.missing.length,
    needsReviewCount: byStatus.needsReview.length,
    completionRate: toc.length > 0 ? Number((byStatus.parsed.length / toc.length).toFixed(4)) : 0,
    items,
    partialSections: byStatus.partial.map((item) => item.title),
    missingSections: byStatus.missing.map((item) => item.title),
    needsReviewSections: byStatus.needsReview.map((item) => item.title),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const payload = buildCoverageReport(readJson(args.input));
  if (args.output) {
    writeJson(args.output, payload);
  } else {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
