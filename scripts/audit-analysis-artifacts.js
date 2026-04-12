#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const failures = [];

function readNormalized(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasHeading(text, level, title) {
  return new RegExp(`^${"#".repeat(level)} ${escapeRegExp(title)}$`, "m").test(text);
}

function validateLocalImages(relativePath, text) {
  const imagePattern = /!\[[^\]]*]\(([^)]+)\)/g;
  for (const match of text.matchAll(imagePattern)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    if (/^(https?:|mailto:)/i.test(target)) {
      continue;
    }
    const resolved = path.normalize(path.join(path.dirname(relativePath), decodeURIComponent(target)));
    assert(exists(resolved), `${relativePath}: missing linked image asset ${target}`);
  }
}

function validateSourcesSection(relativePath, text) {
  assert(hasHeading(text, 2, "Sources"), `${relativePath}: missing ## Sources`);
  const sourcesSplit = text.split(/\n## Sources\n/);
  assert(sourcesSplit.length >= 2, `${relativePath}: malformed Sources section`);
  if (sourcesSplit.length >= 2) {
    assert(/\n- \[.+]\(.+\)/.test(`\n${sourcesSplit[1]}`), `${relativePath}: Sources section should contain markdown links`);
  }
}

function validateStockMemo(relativePath, options = {}) {
  const text = readNormalized(relativePath);
  const requiredHeadings = [
    "Decision Frame",
    "Summary",
    "Business and Thesis",
    "Revenue Mix",
    "What The Latest Results Say",
    "Street / Alternative Views",
    "Current Valuation Snapshot",
    "Historical Valuation Bands",
    "Chart and Positioning",
    "Governance and Structure",
    "Catalysts",
    "Risks",
    "Uncomfortable Questions",
    "Decision-Changing Issues",
    "Structured Stance",
    "Follow-up Research Prompts",
  ];

  assert(/^기준일:\s+\d{4}-\d{2}-\d{2}$/m.test(text), `${relativePath}: missing or malformed 기준일`);
  for (const heading of requiredHeadings) {
    assert(hasHeading(text, 2, heading), `${relativePath}: missing ## ${heading}`);
  }

  if (/^최근 업데이트일:/m.test(text) || options.requireUpdateLog) {
    assert(/^최근 업데이트일:\s+\d{4}-\d{2}-\d{2}$/m.test(text), `${relativePath}: missing or malformed 최근 업데이트일`);
    assert(hasHeading(text, 2, "Update Log"), `${relativePath}: missing ## Update Log`);
  }

  validateLocalImages(relativePath, text);
  validateSourcesSection(relativePath, text);

  if (options.requireDartSupport) {
    const memoHasDartRecheck = hasHeading(text, 2, "DART Recheck");
    const siblingReference = path.join(path.dirname(relativePath), "dart-reference.md");
    const referenceHasDartRecheck = exists(siblingReference) && hasHeading(readNormalized(siblingReference), 2, "DART Recheck");
    assert(
      memoHasDartRecheck || referenceHasDartRecheck,
      `${relativePath}: expected DART recheck support in memo or sibling dart-reference.md`
    );
  }
}

function validateSectorReport(relativePath) {
  const text = readNormalized(relativePath);
  const requiredHeadings = [
    "소개 및 연구 가정",
    "연구 범위와 방법론",
    "행정/정책 개요",
    "시장 풍경",
    "성장 드라이버와 제약",
    "가치사슬",
    "규제 프레임워크",
    "기술 변화",
    "경쟁 구도",
    "대표 상장사/비상장 플레이어 맵",
    "시장 기회와 미래 전망",
    "Sources",
  ];

  assert(/^기준일:\s+\d{4}-\d{2}-\d{2}$/m.test(text), `${relativePath}: missing or malformed 기준일`);
  for (const heading of requiredHeadings) {
    assert(hasHeading(text, 2, heading), `${relativePath}: missing ## ${heading}`);
  }
  validateSourcesSection(relativePath, text);
}

function validateSectorBrief(relativePath) {
  const text = readNormalized(relativePath);
  const requiredHeadings = [
    "Request Summary",
    "Working Title",
    "Deliverable Mode",
    "Scope Definition",
    "In Scope",
    "Out of Scope",
    "Key Research Questions",
    "Required Source Ladder",
    "Proposed Outline",
    "Handoff Notes",
  ];

  assert(/^작성일:\s+\d{4}-\d{2}-\d{2}$/m.test(text), `${relativePath}: missing or malformed 작성일`);
  for (const heading of requiredHeadings) {
    assert(hasHeading(text, 2, heading), `${relativePath}: missing ## ${heading}`);
  }
}

validateStockMemo("analysis-example/kr/LG CNS/memo.md", { requireUpdateLog: true, requireDartSupport: true });
validateStockMemo("analysis-example/kr/LIG넥스원/memo.md", { requireDartSupport: true });
validateStockMemo("analysis-example/kr/대양전기공업/memo.md", { requireUpdateLog: true, requireDartSupport: false });
validateSectorReport("analysis-example/kr-sector/국내 데이터센터.md");
validateSectorBrief("analysis-example/kr-sector/국내 데이터센터-리서치브리프.md");

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}
