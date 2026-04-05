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
    "  node normalize-browser-dart-export.js --input dart-browser-export.json [--output dart-text.txt]",
    "",
    "Notes:",
    "  - Converts a Claude DART browser export into the plain-text format expected by extract-dart-sections.js.",
    "  - Fails fast when the browser export is not in ready status or has no structured sections.",
  ].join("\n");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function writeText(filePath, text) {
  fs.writeFileSync(path.resolve(filePath), text, "utf8");
}

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeHeading(title) {
  const cleanTitle = normalizeWhitespace(title);
  if (/^(?:[IVX]+\.\s+.+|\d+(?:-\d+)?(?:\.\d+)*\.\s+.+|【[^】]+】)$/.test(cleanTitle)) {
    return cleanTitle;
  }

  return `【${cleanTitle.replace(/^【|】$/g, "")}】`;
}

function buildNormalizedText(payload) {
  const extraction = payload.extraction || {};
  const meta = payload.meta || {};
  const content = payload.content || {};
  const sections = Array.isArray(content.sections) ? content.sections : [];

  if (extraction.status !== "ready") {
    throw new Error(`Browser export status must be 'ready', received '${extraction.status || "unknown"}'.`);
  }

  if (sections.length === 0) {
    throw new Error("Browser export does not contain structured sections.");
  }

  const lines = [];
  lines.push(`# ${meta.title || "DART Filing Export"}`);
  lines.push("");
  if (meta.companyNameCandidate) {
    lines.push(`회사명: ${meta.companyNameCandidate}`);
  }
  if (meta.filingDateCandidate) {
    lines.push(`공시일: ${meta.filingDateCandidate}`);
  }
  lines.push(`원본 URL: ${meta.url || "not separately disclosed"}`);
  lines.push(`브라우저 추출 시각: ${meta.capturedAt || new Date().toISOString()}`);
  lines.push("");
  lines.push("## TOC");
  lines.push("");
  for (const section of sections) {
    lines.push(normalizeHeading(section.title));
  }
  lines.push("");
  lines.push("전자공시시스템 dart.fss.or.kr Page 1");
  lines.push("");
  for (const section of sections) {
    lines.push(normalizeHeading(section.title));
    lines.push(normalizeWhitespace(section.content));
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const normalizedText = buildNormalizedText(readJson(args.input));
  if (args.output) {
    writeText(args.output, normalizedText);
  } else {
    process.stdout.write(normalizedText);
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
