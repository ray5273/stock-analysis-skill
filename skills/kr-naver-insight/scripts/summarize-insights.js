#!/usr/bin/env node

// summarize-insights.js — read fetch-blog-posts output and emit a Markdown
// digest grouped by blogger. Snippets are verbatim, never paraphrased.

const fs = require("fs");
const path = require("path");

const SNIPPET_MAX = 500;

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--input") opts.input = next();
    else if (arg === "--output") opts.output = next();
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

function usage() {
  return [
    "Usage:",
    "  node summarize-insights.js --input posts.json [--output insights.md]",
  ].join("\n");
}

function todayYmd() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function snippetFrom(text) {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= SNIPPET_MAX) return trimmed;
  return trimmed.slice(0, SNIPPET_MAX).trimEnd() + "…";
}

function groupByBlogger(posts) {
  const map = new Map();
  for (const post of posts) {
    if (!map.has(post.blogId)) map.set(post.blogId, []);
    map.get(post.blogId).push(post);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      const ad = a.date || "";
      const bd = b.date || "";
      if (bd !== ad) return bd.localeCompare(ad);
      return String(b.logNo).localeCompare(String(a.logNo));
    });
  }
  return map;
}

function coverageWindow(posts) {
  const dates = posts.map((p) => p.date).filter(Boolean).sort();
  if (!dates.length) return { oldest: null, latest: null };
  return { oldest: dates[0], latest: dates[dates.length - 1] };
}

function blockquote(snippet) {
  if (!snippet) return "> (본문 없음)";
  return snippet
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function render(data) {
  const { company, ticker, posts } = data;
  const today = data.fetchedAt || todayYmd();
  const lines = [];
  lines.push(`# Naver Blog Insights: ${company}${ticker ? ` (${ticker})` : ""}`);
  lines.push("");
  lines.push(`기준일: ${today}`);
  lines.push("");

  if (!Array.isArray(posts) || posts.length === 0) {
    lines.push("No qualifying posts found.");
    lines.push("");
    return lines.join("\n");
  }

  const grouped = groupByBlogger(posts);

  lines.push("## Blogger Coverage Summary");
  lines.push("");
  lines.push("| Blogger | Posts | Coverage Window | Latest |");
  lines.push("|---------|-------|-----------------|--------|");
  for (const [blogId, list] of grouped) {
    const { oldest, latest } = coverageWindow(list);
    const window = oldest && latest ? `${oldest} ~ ${latest}` : "-";
    lines.push(`| ${blogId} | ${list.length} | ${window} | ${latest || "-"} |`);
  }
  lines.push("");

  for (const [blogId, list] of grouped) {
    lines.push(`## ${blogId} — Recent Posts`);
    lines.push("");
    for (const post of list) {
      const title = post.title || "(no title)";
      const date = post.date || "date unknown";
      lines.push(`### ${title} (${date})`);
      lines.push("");
      lines.push(blockquote(snippetFrom(post.text)));
      lines.push("");
      if (post.url) {
        lines.push(`📎 ${post.url}`);
        lines.push("");
      }
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    console.error(usage());
    process.exit(1);
  }
  if (opts.help) {
    console.log(usage());
    process.exit(0);
  }
  if (!opts.input) {
    console.error("Error: --input is required");
    console.error(usage());
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(opts.input, "utf8"));
  const md = render(data);

  if (opts.output) {
    fs.mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });
    fs.writeFileSync(opts.output, md, "utf8");
    console.log(`Wrote ${opts.output}`);
  } else {
    process.stdout.write(md);
  }
}

if (require.main === module) main();

module.exports = { render, groupByBlogger, snippetFrom };
