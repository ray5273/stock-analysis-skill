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
    "  node extract-dart-sections.js --input <dart-text.txt> [--output sections.json]",
    "",
    "Notes:",
    "  - Parses a plain-text or markdown DART filing export into a section index.",
    "  - Detects Roman, decimal, hyphen-decimal, and bracket headings.",
  ].join("\n");
}

function readText(filePath) {
  return fs.readFileSync(path.resolve(filePath), "utf8");
}

function writeText(filePath, text) {
  fs.writeFileSync(path.resolve(filePath), text, "utf8");
}

function collapseWhitespace(text) {
  return text.replace(/\r/g, "").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function findBodyStartLine(lines) {
  for (let index = 0; index < lines.length; index += 1) {
    if (/전자공시시스템\s+dart\.fss\.or\.kr\s+Page\s+1/i.test(lines[index])) {
      return index + 1;
    }
  }

  return 1;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function stripHeadingPrefix(text, heading) {
  if (!heading) {
    return text;
  }

  if (heading.kind === "roman") {
    return text.replace(/^[IVX]+\.\s+/, "");
  }

  if (heading.kind === "decimal" || heading.kind === "hyphen-decimal") {
    return text.replace(/^\d+(?:-\d+)?(?:\.\d+)*\.\s+/, "");
  }

  return text.replace(/^【[^】]+】\s*/, "");
}

function countTabularTokens(text) {
  return [...text.matchAll(/(?:^|\s)[△-]?\d[\d,]*(?:\.\d+)?%?/g)].length;
}

function shouldSkipBodyHeading(line, heading) {
  if (!heading) {
    return false;
  }

  if (/^\s+/.test(line) && heading.kind !== "bracket") {
    return true;
  }

  const remainder = stripHeadingPrefix(line.trim(), heading);
  if (/(?:\s+-){2,}/.test(remainder)) {
    return true;
  }

  if (countTabularTokens(remainder) >= 2) {
    return true;
  }

  return false;
}

function classifyHeading(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  if (/^【[^】]+】$/.test(trimmed)) {
    return { title: trimmed, level: 1, kind: "bracket" };
  }

  const romanMatch = trimmed.match(/^([IVX]+)\.\s+(.+)$/);
  if (romanMatch) {
    return { title: trimmed, level: 1, kind: "roman" };
  }

  const numericMatch = trimmed.match(/^(\d+(?:-\d+)?(?:\.\d+)*)\.\s+(.+)$/);
  if (numericMatch) {
    const token = numericMatch[1];
    const dotDepth = token.split(".").length - 1;
    const hyphenDepth = token.includes("-") ? 1 : 0;
    return {
      title: trimmed,
      level: Math.max(2, 2 + dotDepth + hyphenDepth),
      kind: token.includes("-") ? "hyphen-decimal" : "decimal",
    };
  }

  return null;
}

function isMeaningfulLine(line) {
  const trimmed = line.trim();
  return Boolean(trimmed) && !/^\.{4,}\d+$/.test(trimmed);
}

function buildSection(rawHeading, bodyLines, startLine, endLine, index) {
  const content = collapseWhitespace(bodyLines.join("\n"));
  const preview = content.slice(0, 280) || "본문 길이 부족";
  const tableCount = countMatches(content, /\|/g) > 0 ? countMatches(content, /^\|.*\|$/gm) : 0;
  const numericBlockCount = countMatches(content, /\d[\d,]*(?:\.\d+)?(?:\s*(?:억원|백만원|천원|%|배|원))?/g);
  return {
    id: `section-${String(index + 1).padStart(3, "0")}`,
    title: rawHeading.title,
    level: rawHeading.level,
    headingType: rawHeading.kind,
    anchor: slugify(rawHeading.title),
    startLine,
    endLine,
    contentLength: content.length,
    paragraphCount: content ? content.split(/\n\n+/).length : 0,
    tableCount,
    numericBlockCount,
    preview,
    content,
  };
}

function extractSections(text) {
  const normalized = text.replace(/\r/g, "");
  const lines = normalized.split("\n");
  const bodyStartLine = findBodyStartLine(lines);
  const tocHeadings = [];
  const bodyHeadings = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = classifyHeading(line);
    if (heading) {
      const entry = { ...heading, lineNumber: index + 1 };
      if (index + 1 < bodyStartLine) {
        tocHeadings.push(entry);
      } else {
        if (!shouldSkipBodyHeading(line, heading)) {
          bodyHeadings.push(entry);
        }
      }
    }
  }

  const sections = [];
  for (let index = 0; index < bodyHeadings.length; index += 1) {
    const current = bodyHeadings[index];
    const next = bodyHeadings[index + 1];
    const startLine = current.lineNumber + 1;
    const endLine = next ? next.lineNumber - 1 : lines.length;
    const bodyLines = lines.slice(startLine - 1, endLine).filter((line) => isMeaningfulLine(line));
    sections.push(buildSection(current, bodyLines, current.lineNumber, endLine, index));
  }

  return {
    extractedAt: new Date().toISOString(),
    sourceLineCount: lines.length,
    bodyStartLine,
    toc: tocHeadings.map((heading, index) => ({
      id: `toc-${String(index + 1).padStart(3, "0")}`,
      title: heading.title,
      level: heading.level,
      lineNumber: heading.lineNumber,
      headingType: heading.kind,
    })),
    sections,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const payload = extractSections(readText(args.input));
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  if (args.output) {
    writeText(args.output, serialized);
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
