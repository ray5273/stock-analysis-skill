#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildPost,
  convertTables,
  markdownTableToTsv,
  parseMarkdownTableBlock,
} = require("./memo-to-post");

const repoRoot = path.resolve(__dirname, "../../..");
const memoPath = path.join(repoRoot, "analysis-example", "kr", "SOOP", "memo.md");
const markdown = fs.readFileSync(memoPath, "utf8");
const result = buildPost({ markdown, memoPath });

assert(!result.postMarkdown.includes("## Research Brief"));
assert(!result.postMarkdown.includes("## Update Log"));
assert(!result.postMarkdown.includes("## Follow-up Research Prompts"));
assert(result.postMarkdown.includes("2026-06-21"));
assert(result.postMarkdown.includes("-12.8%"));
assert(result.postMarkdown.includes("2,480억"));
assert(result.postMarkdown.includes("## 출처"));
assert(result.postMarkdown.includes("매수·매도를 권유하지 않습니다"));
assert(result.postMarkdown.includes("> **RESEARCH COMPLETE · AI-ASSISTED EQUITY INTELLIGENCE**"));
assert(result.postMarkdown.includes("> Codex (or Claude) × Stock Research Skill · Crafted by **ray5273**"));
assert(result.postMarkdown.includes("> ✓ 공시·사업 · ✓ 실적·재무 · ✓ 밸류에이션 · ✓ 차트·수급 · ✓ 시장 시각 · ✓ 리스크·촉매"));
assert(result.postMarkdown.includes("> [GitHub](https://github.com/ray5273/stock-analysis-skill) · Open Research Workflow"));
assert(result.postMarkdown.indexOf("Stock Research Skill") > result.postMarkdown.indexOf("매수·매도를 권유하지 않습니다"));
assert(result.postMarkdown.indexOf("Stock Research Skill") > result.postMarkdown.indexOf("## 출처"));
assert(result.postMarkdown.indexOf("## 차트 분석") > result.postMarkdown.indexOf("## 한눈에 보는 결론"));
assert(result.postMarkdown.indexOf("## 차트 분석") < result.postMarkdown.indexOf("## 투자 판단의 핵심 축"));
assert(result.postMarkdown.includes("![SOOP main trend chart](assets/SOOP-chart.png)"));
assert(result.postMarkdown.includes("차트 1. 가격 추세와 이동평균 위치를 먼저 봅니다."));
assert(result.postMarkdown.includes("차트 4. 지지·저항 구간과 구조적 가격대를 확인합니다."));
assert(!/## 차트와 수급 위치[\s\S]*!\[SOOP main trend chart]/.test(result.postMarkdown));
assert.strictEqual(result.manifest.post.images.length, 4);
assert.deepStrictEqual(result.manifest.post.images.map((image) => image.relativePath), [
  "assets/SOOP-chart.png",
  "assets/SOOP-chart-overlay.png",
  "assets/SOOP-chart-momentum.png",
  "assets/SOOP-chart-structure.png",
]);
assert.strictEqual(result.manifest.post.thumbnail, null);
assert(result.manifest.post.tags.includes("SOOP"));
assert(result.manifest.post.tags.includes("067160"));
assert(result.manifest.post.tags.includes("주식분석"));

const table = "| 항목 | 값 | 비고 |\n| --- | --- | --- |\n| 매출 | 100 | 원문 |";
assert.strictEqual(convertTables(table), table);
const parsedTable = parseMarkdownTableBlock(table.split(/\r?\n/), 0);
assert.deepStrictEqual(parsedTable.headers, ["항목", "값", "비고"]);
assert.deepStrictEqual(parsedTable.rows, [["매출", "100", "원문"]]);
assert.strictEqual(markdownTableToTsv(parsedTable), "항목\t값\t비고\n매출\t100\t원문");

const broken = markdown.replace("assets/SOOP-chart.png", "assets/missing.png");
assert.throws(() => buildPost({ markdown: broken, memoPath }), /Linked PNG does not exist/);

const thematicMemo = [
  "# 삼성SDS",
  "",
  "- 티커: 018260",
  "- 기준일: 2026-06-25",
  "",
  "## Summary",
  "",
  "**삼성그룹의 ChatGPT Enterprise 도입의 함의**를 점검합니다.",
  "",
  "## Why This Matters",
  "",
  "보안형 AX 구축 패키지로 이어지는지가 핵심입니다.",
  "",
  "## Investment Takeaway",
  "",
  "단순 리셀링이면 작고, 구축/운영이면 의미가 커집니다.",
  "",
  "## Sources",
  "",
  "- Source: https://example.com",
].join("\n");
const thematic = buildPost({ markdown: thematicMemo, memoPath });
assert(thematic.postMarkdown.includes("## 왜 중요한가"));
assert(thematic.postMarkdown.includes("## 투자 시사점"));
assert(!thematic.postMarkdown.includes("## Why This Matters"));
assert(!thematic.postMarkdown.includes("\n> \n"));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kr-naver-converter-test-"));
fs.writeFileSync(path.join(temp, "result.txt"), result.postMarkdown);
console.log("memo-to-post tests passed");
