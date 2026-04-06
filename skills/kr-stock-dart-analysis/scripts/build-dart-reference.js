#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--sections") {
      result.sections = argv[index + 1];
      index += 1;
    } else if (arg === "--coverage") {
      result.coverage = argv[index + 1];
      index += 1;
    } else if (arg === "--output") {
      result.output = argv[index + 1];
      index += 1;
    } else if (arg === "--cache-out") {
      result.cacheOut = argv[index + 1];
      index += 1;
    } else if (arg === "--company") {
      result.company = argv[index + 1];
      index += 1;
    } else if (arg === "--ticker") {
      result.ticker = argv[index + 1];
      index += 1;
    } else if (arg === "--filing-title") {
      result.filingTitle = argv[index + 1];
      index += 1;
    } else if (arg === "--filing-date") {
      result.filingDate = argv[index + 1];
      index += 1;
    } else if (arg === "--as-of") {
      result.asOf = argv[index + 1];
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
    "  node build-dart-reference.js --sections sections.json --coverage coverage.json --output dart-reference.md [--cache-out dart-cache.json] [--company LG CNS] [--ticker 064400.KS] [--filing-title '사업보고서 (2025.12)'] [--filing-date 2026-03-16] [--as-of 2026-04-05]",
  ].join("\n");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function writeText(filePath, text) {
  fs.writeFileSync(path.resolve(filePath), text, "utf8");
}

function truncate(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function guessTopSections(sections) {
  return sections.filter((section) => section.level <= 2).slice(0, 20);
}

function statusLabel(status) {
  switch (status) {
    case "parsed":
      return "parsed";
    case "partial":
      return "partial";
    case "missing":
      return "missing";
    case "needs_review":
      return "needs_review";
    default:
      return "unknown";
  }
}

function buildMarkdown({ args, sectionsPayload, coveragePayload }) {
  const company = args.company || "회사명 미지정";
  const ticker = args.ticker || "not separately disclosed";
  const filingTitle = args.filingTitle || "DART filing";
  const filingDate = args.filingDate || "not separately disclosed";
  const asOf = args.asOf || new Date().toISOString().slice(0, 10);
  const keySections = guessTopSections(sectionsPayload.sections || []);

  const lines = [];
  lines.push(`# ${company} DART Reference`);
  lines.push("");
  lines.push("<!-- KR_DART_REFERENCE_DIGEST_EXAMPLE -->");
  lines.push("");
  lines.push("## Reference Cache Metadata");
  lines.push("");
  lines.push(`- 회사명: ${company}`);
  lines.push(`- 티커: \`${ticker}\``);
  lines.push(`- 기준 문서: ${filingTitle}`);
  lines.push(`- 공시일: ${filingDate}`);
  lines.push(`- reference 기준일: ${asOf}`);
  lines.push(`- 최근 확인일: ${asOf}`);
  lines.push(`- 마지막 반영 공시일: ${filingDate}`);
  lines.push(`- TOC 기준 섹션 수: ${coveragePayload.tocCount}`);
  lines.push(`- 완전 파싱: ${coveragePayload.parsedCount}`);
  lines.push(`- 부분 파싱: ${coveragePayload.partialCount}`);
  lines.push(`- 누락: ${coveragePayload.missingCount}`);
  lines.push(`- 재검토 필요: ${coveragePayload.needsReviewCount}`);
  lines.push("");
  lines.push("## 문서 커버리지");
  lines.push("");
  lines.push("| 항목 | 값 |");
  lines.push("| --- | --- |");
  lines.push(`| TOC 기준 섹션 수 | ${coveragePayload.tocCount} |`);
  lines.push(`| 완전 파싱 | ${coveragePayload.parsedCount} |`);
  lines.push(`| 부분 파싱 | ${coveragePayload.partialCount} |`);
  lines.push(`| 누락 | ${coveragePayload.missingCount} |`);
  lines.push(`| 재검토 필요 | ${coveragePayload.needsReviewCount} |`);
  lines.push(`| 파싱 완료율 | ${(coveragePayload.completionRate * 100).toFixed(1)}% |`);
  lines.push("");
  lines.push("## 파싱 커버리지 요약");
  lines.push("");
  lines.push("| 섹션 | 상태 | 본문 길이 | 표 수 | 숫자 블록 수 |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const item of coveragePayload.items) {
    lines.push(`| ${item.title} | ${statusLabel(item.status)} | ${item.contentLength} | ${item.tableCount} | ${item.numericBlockCount} |`);
  }
  lines.push("");
  lines.push("## 핵심 섹션별 요약");
  lines.push("");
  lines.push("| 섹션 | 요약 | 비고 |");
  lines.push("| --- | --- | --- |");
  for (const section of keySections) {
    const coverageItem = coveragePayload.items.find((item) => item.matchedSectionId === section.id || item.title === section.title);
    lines.push(`| ${section.title} | ${truncate(section.preview || "본문 길이 부족", 180)} | ${coverageItem ? statusLabel(coverageItem.status) : "unmatched"} |`);
  }
  lines.push("");
  lines.push("## 미공시 확인 로그");
  lines.push("");
  lines.push("- `not separately disclosed`는 파싱 누락이 아니라, 해당 섹션 또는 주석을 확인한 뒤에도 별도 수치가 없는 경우에만 사용한다.");
  lines.push("- `missing` 또는 `needs_review` 상태의 섹션은 미공시로 확정하지 말고 재확인 대상으로 남긴다.");
  lines.push("");
  lines.push("## DART Recheck");
  lines.push("");
  lines.push("| 주장 | 상태 | 확인값 또는 판단 | 출처 섹션 | 비고 |");
  lines.push("| --- | --- | --- | --- | --- |");
  lines.push("| 중요 주장 재확인 큐 미작성 | needs_follow_up | 아직 claim-oriented verification이 입력되지 않음 | not separately disclosed | memo-critical annual filing이면 이 표를 채워야 함 |");
  lines.push("");
  lines.push("## 다음 업데이트 우선 확인 항목");
  lines.push("");
  for (const title of coveragePayload.missingSections.concat(coveragePayload.needsReviewSections).slice(0, 12)) {
    lines.push(`- ${title}`);
  }

  if (coveragePayload.missingSections.length === 0 && coveragePayload.needsReviewSections.length === 0) {
    lines.push("- 기준 문서 전체 sweep 결과 즉시 재확인 필요 섹션 없음");
  }

  return `${lines.join("\n")}\n`;
}

function buildCache({ args, sectionsPayload, coveragePayload }) {
  return {
    company: args.company || null,
    ticker: args.ticker || null,
    filing: {
      title: args.filingTitle || null,
      filingDate: args.filingDate || null,
    },
    reference: {
      asOf: args.asOf || new Date().toISOString().slice(0, 10),
      lastCheckedAt: new Date().toISOString(),
      lastFilingChecked: args.filingDate || null,
    },
    coverage: {
      tocCount: coveragePayload.tocCount,
      parsedCount: coveragePayload.parsedCount,
      partialCount: coveragePayload.partialCount,
      missingCount: coveragePayload.missingCount,
      needsReviewCount: coveragePayload.needsReviewCount,
      completionRate: coveragePayload.completionRate,
      missingSections: coveragePayload.missingSections,
      partialSections: coveragePayload.partialSections,
      needsReviewSections: coveragePayload.needsReviewSections,
    },
    verifiedClaims: [],
    sections: (sectionsPayload.sections || []).map((section) => ({
      id: section.id,
      title: section.title,
      level: section.level,
      contentLength: section.contentLength,
      tableCount: section.tableCount,
      numericBlockCount: section.numericBlockCount,
      preview: section.preview,
    })),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.sections || !args.coverage || !args.output) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const sectionsPayload = readJson(args.sections);
  const coveragePayload = readJson(args.coverage);
  writeText(args.output, buildMarkdown({ args, sectionsPayload, coveragePayload }));

  if (args.cacheOut) {
    writeText(args.cacheOut, `${JSON.stringify(buildCache({ args, sectionsPayload, coveragePayload }), null, 2)}\n`);
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
