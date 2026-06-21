#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  assert,
  fileSha256,
  normalizeText,
  sha256,
  writeJsonAtomic,
} = require("./lib");

const EXCLUDED_SECTIONS = new Set([
  "research brief",
  "update log",
  "follow-up research prompts",
  "follow up research prompts",
]);

const HEADING_MAP = new Map([
  ["summary", "한눈에 보는 결론"],
  ["decision frame", "투자 판단의 핵심 축"],
  ["business and thesis", "사업과 투자 논지"],
  ["revenue mix", "매출 구조"],
  ["what the latest results say", "최근 실적이 말해주는 것"],
  ["dart recheck", "공시로 다시 확인한 내용"],
  ["street / alternative views", "시장과 반대편 시각"],
  ["current valuation snapshot", "현재 밸류에이션"],
  ["historical valuation bands", "과거 밸류에이션 구간"],
  ["chart and positioning", "차트와 수급 위치"],
  ["governance and structure", "지배구조와 자본배치"],
  ["catalysts", "상승 촉매"],
  ["risks", "반드시 볼 리스크"],
  ["uncomfortable questions", "불편하지만 필요한 질문"],
  ["decision-changing issues", "판단을 바꿀 신호"],
  ["structured stance", "현재 판단"],
  ["sources", "출처"],
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function parseMetadata(markdown) {
  const metadata = {};
  const firstSection = markdown.split(/^##\s+/m)[0];
  for (const line of firstSection.split(/\r?\n/)) {
    const match = line.match(/^[-*]\s+([^:：]+)[:：]\s*(.+?)\s*$/);
    if (match) metadata[match[1].trim()] = match[2].trim();
  }
  return metadata;
}

function parseSections(markdown) {
  const sections = [];
  const lines = markdown.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      if (current) sections.push({ heading: current.heading, body: current.lines.join("\n").trim() });
      current = { heading: heading[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ heading: current.heading, body: current.lines.join("\n").trim() });
  return sections;
}

function splitTableRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function isDivider(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function tableToList(lines) {
  const headers = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);
  return rows.map((cells) => {
    const lead = cells[0] || "항목";
    const details = headers.slice(1).map((header, index) => {
      const value = cells[index + 1] || "";
      return value ? `${header}: ${value}` : null;
    }).filter(Boolean);
    return `- **${lead}**${details.length ? ` — ${details.join(" · ")}` : ""}`;
  }).join("\n");
}

function convertTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const output = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes("|") && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const table = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        table.push(lines[i]);
        i += 1;
      }
      i -= 1;
      output.push(tableToList(table));
    } else {
      output.push(lines[i]);
    }
  }
  return output.join("\n");
}

function cleanInternalLinks(markdown) {
  return markdown.replace(/(?<!!)\[([^\]]+)]\((?!https?:\/\/|mailto:)([^)]+)\)/g, (_match, label) => {
    return /\.(?:md|json|csv)$/i.test(label.trim()) ? "내부 검증 자료" : label;
  });
}

function extractImages(markdown, memoPath, selectedHeadings) {
  const images = [];
  const pattern = /!\[([^\]]*)]\(([^)]+\.png(?:\?[^)]*)?)\)/gi;
  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    const relativePath = match[2].split("?")[0];
    const absolutePath = path.resolve(path.dirname(memoPath), relativePath);
    assert(fs.existsSync(absolutePath), `Linked PNG does not exist: ${relativePath}`);
    assert(fs.statSync(absolutePath).isFile(), `Linked PNG is not a file: ${relativePath}`);
    images.push({
      order: images.length + 1,
      alt: match[1] || `차트 ${images.length + 1}`,
      relativePath,
      absolutePath,
      sha256: fileSha256(absolutePath),
      section: selectedHeadings.find((heading) => heading.body.includes(match[0]))?.heading || null,
    });
  }
  return images;
}

function deriveIssue(summary) {
  const explicitQuestion = summary.match(/핵심 질문은[^—\n]*[—-]\s*([^\n.]+)/);
  if (explicitQuestion) return explicitQuestion[1].replace(/["“”]/g, "").trim().slice(0, 68);
  const bold = summary.match(/\*\*([\s\S]*?)\*\*/);
  if (bold) return bold[1].replace(/["“”]/g, "").trim().slice(0, 68);
  const sentence = summary.split(/[.!?。]\s/)[0];
  return sentence.replace(/[*_"“”]/g, "").trim().slice(0, 70);
}

function generateTags(company, ticker, summary) {
  const tags = [company, ticker, "주식분석"];
  const candidates = ["딥밸류", "치지직", "글로벌", "배당", "자사주소각", "별풍선", "플랫폼"];
  for (const candidate of candidates) {
    if (summary.includes(candidate)) tags.push(candidate);
  }
  return [...new Set(tags.filter(Boolean))].slice(0, 10);
}

function buildPost({ markdown, memoPath, category = null }) {
  const metadata = parseMetadata(markdown);
  const companyTitle = markdown.match(/^#\s+(.+?)(?:\s+투자\s+메모)?\s*$/m)?.[1]?.trim();
  const company = (metadata["대상"] || companyTitle || path.basename(path.dirname(memoPath)))
    .replace(/\s+보통주.*$/, "")
    .trim();
  const ticker = metadata["티커"] || "";
  const asOfDate = metadata["기준일"] || "";
  assert(company, "Company name could not be derived from memo");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(asOfDate), "Memo must contain a YYYY-MM-DD 기준일");

  const allSections = parseSections(markdown);
  const selected = allSections.filter((section) => !EXCLUDED_SECTIONS.has(section.heading.toLowerCase()));
  const summary = allSections.find((section) => section.heading.toLowerCase() === "summary")?.body || "";
  assert(summary, "Memo must contain a Summary section");
  const issue = deriveIssue(summary);
  const title = `${company} | ${issue} | ${asOfDate}`.slice(0, 100);
  const images = extractImages(markdown, memoPath, selected);

  const parts = [
    `# ${title}`,
    "",
    `이 글은 ${asOfDate} 기준으로 ${company}를 개인 투자자의 관점에서 정리한 리서치입니다. 숫자와 공시를 중심으로 보고, 강세 논리와 반대 논리를 함께 남깁니다.`,
  ];
  for (const section of selected) {
    const mapped = HEADING_MAP.get(section.heading.toLowerCase()) || section.heading;
    let body = convertTables(section.body);
    body = cleanInternalLinks(body);
    parts.push("", `## ${mapped}`, "", body);
  }
  parts.push(
    "",
    "---",
    "",
    `기준일: ${asOfDate}`,
    "",
    "본 글은 공개된 자료를 바탕으로 작성한 개인 리서치이며, 특정 종목의 매수·매도를 권유하지 않습니다. 투자 판단과 그 결과에 대한 책임은 투자자 본인에게 있습니다.",
  );
  const postMarkdown = `${normalizeText(parts.join("\n"))}\n`;
  return {
    metadata,
    postMarkdown,
    manifest: {
      schemaVersion: 1,
      status: "converted",
      source: {
        memoPath: path.resolve(memoPath),
        memoSha256: fileSha256(memoPath),
        asOfDate,
      },
      post: {
        company,
        ticker,
        title,
        issue,
        category: category || null,
        tags: generateTags(company, ticker, summary),
        markdownPath: null,
        markdownSha256: sha256(postMarkdown),
        images,
      },
      prepare: null,
      publish: null,
    },
  };
}

function main() {
  const args = parseArgs(process.argv);
  assert(args.memo, "Usage: memo-to-post.js --memo <memo.md> [--out <naver-post.md>] [--manifest <json>] [--category <name>]");
  const memoPath = path.resolve(args.memo);
  assert(fs.existsSync(memoPath), `Memo not found: ${memoPath}`);
  const outPath = path.resolve(args.out || path.join(path.dirname(memoPath), "naver-post.md"));
  const manifestPath = path.resolve(args.manifest || path.join(path.dirname(outPath), "naver-publish.json"));
  const result = buildPost({ markdown: fs.readFileSync(memoPath, "utf8"), memoPath, category: args.category });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, result.postMarkdown, "utf8");
  result.manifest.post.markdownPath = outPath;
  writeJsonAtomic(manifestPath, result.manifest);
  process.stdout.write(`${JSON.stringify({ outPath, manifestPath, title: result.manifest.post.title, images: result.manifest.post.images.length, tags: result.manifest.post.tags }, null, 2)}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exit(1); }
}

module.exports = { buildPost, convertTables, parseMetadata, parseSections };
