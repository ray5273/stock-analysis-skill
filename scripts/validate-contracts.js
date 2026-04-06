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

function decodeMarkdownTarget(target) {
  const cleanTarget = target.split("#")[0].trim().replace(/^<|>$/g, "");
  if (!cleanTarget || /^(https?:|mailto:)/i.test(cleanTarget)) {
    return null;
  }
  return decodeURIComponent(cleanTarget);
}

function validateReadmeLinks(relativePath) {
  const text = readNormalized(relativePath);
  const linkPattern = /\[[^\]]+]\(([^)]+)\)/g;
  for (const match of text.matchAll(linkPattern)) {
    const decoded = decodeMarkdownTarget(match[1]);
    if (!decoded) {
      continue;
    }
    const resolved = path.normalize(path.join(path.dirname(relativePath), decoded));
    assert(exists(resolved), `${relativePath}: broken local link -> ${decoded}`);
  }
}

function validatePathContract() {
  const expectedContracts = [
    {
      file: "skills/kr-stock-analysis/agents/openai.yaml",
      required: "analysis-example/kr/<company>/memo.md",
      banned: "analysis-example/kr/<company>.md",
    },
    {
      file: "skills/kr-stock-update/agents/openai.yaml",
      required: "analysis-example/kr/<company>/memo.md",
      banned: "analysis-example/kr/<company>.md",
    },
    {
      file: "skills/us-stock-analysis/SKILL.md",
      required: "analysis-example/us/<company>/memo.md",
      banned: "analysis-example/us/<company>.md",
    },
    {
      file: "skills/us-stock-analysis/references/workflow.md",
      required: "analysis-example/us/<company>/memo.md",
      banned: "analysis-example/us/<company>.md",
    },
    {
      file: "skills/us-stock-analysis/references/output-format.md",
      required: "analysis-example/us/<company>/memo.md",
      banned: "analysis-example/us/<company>.md",
    },
    {
      file: "skills/us-stock-analysis/agents/openai.yaml",
      required: "analysis-example/us/<company>/memo.md",
      banned: "analysis-example/us/<company>.md",
    },
  ];

  for (const contract of expectedContracts) {
    const text = readNormalized(contract.file);
    assert(text.includes(contract.required), `${contract.file}: missing required path contract ${contract.required}`);
    assert(!text.includes(contract.banned), `${contract.file}: still references deprecated path ${contract.banned}`);
  }

  const readme = readNormalized("README.md");
  const readmeKr = readNormalized("README-kr.md");
  const agents = readNormalized("AGENTS.md");

  assert(
    readme.includes("analysis-example/<market>/<company>/memo.md"),
    "README.md: shared behavior should describe folder-based stock memo outputs"
  );
  assert(
    readmeKr.includes("analysis-example/kr/<company>/memo.md"),
    "README-kr.md: shared behavior should describe folder-based KR memo outputs"
  );
  assert(
    agents.includes("analysis-example/<market>/<company>/memo.md"),
    "AGENTS.md: repository rules should keep the folder-based memo contract"
  );
}

validatePathContract();
validateReadmeLinks("README.md");
validateReadmeLinks("README-kr.md");

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}
