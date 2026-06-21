#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildPost, convertTables } = require("./memo-to-post");

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
assert(result.postMarkdown.includes("![SOOP main trend chart](assets/SOOP-chart.png)"));
assert.strictEqual(result.manifest.post.images.length, 4);
assert.deepStrictEqual(result.manifest.post.images.map((image) => image.relativePath), [
  "assets/SOOP-chart.png",
  "assets/SOOP-chart-overlay.png",
  "assets/SOOP-chart-momentum.png",
  "assets/SOOP-chart-structure.png",
]);
assert(result.manifest.post.tags.includes("SOOP"));
assert(result.manifest.post.tags.includes("067160"));
assert(result.manifest.post.tags.includes("주식분석"));

const table = "| 항목 | 값 | 비고 |\n| --- | --- | --- |\n| 매출 | 100 | 원문 |";
assert.strictEqual(convertTables(table), "- **매출** — 값: 100 · 비고: 원문");

const broken = markdown.replace("assets/SOOP-chart.png", "assets/missing.png");
assert.throws(() => buildPost({ markdown: broken, memoPath }), /Linked PNG does not exist/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kr-naver-converter-test-"));
fs.writeFileSync(path.join(temp, "result.txt"), result.postMarkdown);
console.log("memo-to-post tests passed");
