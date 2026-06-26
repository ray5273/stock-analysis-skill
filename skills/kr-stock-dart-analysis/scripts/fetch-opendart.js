#!/usr/bin/env node

// fetch-opendart.js
//
// OpenDART API → dart-browser-export.json (compatible with the rest of the
// kr-stock-dart-analysis chain: normalize → extract → verify → build).
//
// Reads `OPENDART_API_KEY` from env. Never logs the key.
//
// Pipeline per run:
//   1. resolveCorpCode(ticker)          — uses cached corpCode.xml ZIP
//   2. fetchFilingList(corpCode, ...)   — list.json (정기공시 limited)
//   3. downloadDocument(rceptNo)        — document.xml ZIP, extracts via python3
//   4. parseDocumentToSections(xmlPath) — section split by Roman / decimal headings
//   5. fetchStructuredEndpoints(...)    — majorshareholder, alotMatter, etc.
//   6. synthesizeStructuredSections     — JSON → readable Korean sections
//   7. mergeSections + writeBrowserExport
//
// Caches under .tmp/opendart-cache/.

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const { URL, URLSearchParams } = require("url");
const { execFileSync, spawnSync } = require("child_process");

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..");
const CACHE_ROOT = path.resolve(REPO_ROOT, ".tmp", "opendart-cache");
const ZIP_HELPER = path.join(SCRIPT_DIR, "opendart-zip.py");

const API_BASE = "https://opendart.fss.or.kr/api";
const RATE_LIMIT_DELAY_MS = 150;

let lastRequestAt = 0;

// --- CLI ----------------------------------------------------------------

function parseArgs(argv) {
  const out = { reportCode: "11011" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--ticker":
        out.ticker = next;
        i += 1;
        break;
      case "--year":
        out.year = next;
        i += 1;
        break;
      case "--report-code":
        out.reportCode = next;
        i += 1;
        break;
      case "--output":
        out.output = next;
        i += 1;
        break;
      case "--rcept-no":
        out.rceptNo = next;
        i += 1;
        break;
      case "--no-document":
        out.skipDocument = true;
        break;
      case "--no-structured":
        out.skipStructured = true;
        break;
      case "--cache-dir":
        out.cacheDir = next;
        i += 1;
        break;
      case "--help":
      case "-h":
        out.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return out;
}

function usage() {
  return [
    "Usage:",
    "  node fetch-opendart.js --ticker 010950 --year 2025 [--report-code 11011] --output <path-or-dir>",
    "",
    "Required env:",
    "  OPENDART_API_KEY  — your OpenDART API key (https://opendart.fss.or.kr)",
    "",
    "Options:",
    "  --ticker <6-digit>      KRX ticker (resolved to DART corp_code via cached master).",
    "  --year   <YYYY>         Business year (defaults to current year).",
    "  --report-code <code>    11011=사업보고서, 11012=반기, 11013=1Q, 11014=3Q.",
    "  --rcept-no <14-digit>   Skip filing-list lookup, use this rcept_no directly.",
    "  --output <path>         Where to write dart-browser-export.json. If a directory,",
    "                          writes <dir>/dart-browser-export.json.",
    "  --no-document           Skip document.xml narrative fetch.",
    "  --no-structured         Skip structured-endpoint fetch (majorshareholder, etc.).",
    "  --cache-dir <dir>       Override cache root (default .tmp/opendart-cache).",
    "",
    "Output: dart-browser-export.json compatible with normalize-browser-dart-export.js.",
  ].join("\n");
}

// --- Env / API key ------------------------------------------------------

function loadApiKey() {
  const key = (process.env.OPENDART_API_KEY || "").trim();
  if (!key) {
    throw new Error(
      "OPENDART_API_KEY env var is required. Get one at https://opendart.fss.or.kr/uss/umt/EgovMberInsertView.do and re-run."
    );
  }
  if (key.length < 30) {
    throw new Error("OPENDART_API_KEY looks too short. Re-check the value.");
  }
  return key;
}

// --- Cache helpers ------------------------------------------------------

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function cacheRoot(args) {
  return args.cacheDir ? path.resolve(args.cacheDir) : CACHE_ROOT;
}

function corpCodeZipPath(root) {
  return path.join(root, "corpCode.xml.zip");
}

function corpCodeXmlPath(root) {
  return path.join(root, "CORPCODE.xml");
}

function filingDir(root, rceptNo) {
  return path.join(root, "filings", rceptNo);
}

// --- Throttled HTTPS GET -----------------------------------------------

function sleep(ms) {
  const target = Date.now() + ms;
  while (Date.now() < target) {
    // busy wait — avoid extra deps
  }
}

function enforceDelay() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    sleep(RATE_LIMIT_DELAY_MS - elapsed);
  }
  lastRequestAt = Date.now();
}

function httpsGetBuffer(urlString, opts = {}) {
  enforceDelay();
  const timeoutMs = opts.timeoutMs || 60_000;
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          "User-Agent":
            "kr-research-kit/1.0 (kr-stock-dart-analysis fetch-opendart)",
          Accept: "*/*",
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(
                `HTTP ${res.statusCode} for ${url.host}${url.pathname}`
              )
            );
            return;
          }
          resolve({
            buffer: Buffer.concat(chunks),
            headers: res.headers,
            statusCode: res.statusCode || 0,
          });
        });
      }
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout after ${timeoutMs}ms for ${url.host}`));
    });
    req.on("error", (err) => reject(err));
    req.end();
  });
}

async function httpsGetJson(urlString) {
  const { buffer } = await httpsGetBuffer(urlString);
  const text = buffer.toString("utf8");
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Expected JSON from ${urlString.replace(/crtfc_key=[^&]+/, "crtfc_key=REDACTED")} but got: ${text.slice(0, 200)}`
    );
  }
}

function buildApiUrl(endpoint, params, key) {
  const usp = new URLSearchParams({ crtfc_key: key, ...params });
  return `${API_BASE}/${endpoint}?${usp.toString()}`;
}

// --- corp_code resolution -----------------------------------------------

async function ensureCorpCodeXml(root, key) {
  const zipPath = corpCodeZipPath(root);
  const xmlPath = corpCodeXmlPath(root);
  if (fs.existsSync(xmlPath)) {
    return xmlPath;
  }
  ensureDir(root);

  if (!fs.existsSync(zipPath)) {
    process.stderr.write("[opendart] downloading corp_code master (one-time)...\n");
    const url = buildApiUrl("corpCode.xml", {}, key);
    const { buffer } = await httpsGetBuffer(url, { timeoutMs: 120_000 });
    fs.writeFileSync(zipPath, buffer);
  }

  process.stderr.write("[opendart] extracting corp_code master...\n");
  execFileSync("python3", [ZIP_HELPER, "extract", zipPath, root], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (!fs.existsSync(xmlPath)) {
    // some encodings produce lowercase
    const alt = path.join(root, "corpcode.xml");
    if (fs.existsSync(alt)) return alt;
    throw new Error(`corpCode.xml not found after extraction in ${root}`);
  }
  return xmlPath;
}

function loadCorpCodeMap(xmlPath) {
  // The XML is a flat list of <list>...</list> entries with corp_code,
  // corp_name, corp_eng_name, stock_code, modify_date.
  const text = fs.readFileSync(xmlPath, "utf8");
  const map = new Map(); // stock_code -> { corp_code, corp_name }
  const itemRe = /<list>([\s\S]*?)<\/list>/g;
  const fieldRe = (name) => new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`);
  let match;
  while ((match = itemRe.exec(text)) !== null) {
    const block = match[1];
    const stockMatch = block.match(fieldRe("stock_code"));
    const stockCode = (stockMatch ? stockMatch[1] : "").trim();
    if (!stockCode) continue;
    const corpCodeMatch = block.match(fieldRe("corp_code"));
    const corpNameMatch = block.match(fieldRe("corp_name"));
    if (!corpCodeMatch) continue;
    map.set(stockCode, {
      corpCode: corpCodeMatch[1].trim(),
      corpName: (corpNameMatch ? corpNameMatch[1] : "").trim(),
    });
  }
  return map;
}

async function resolveCorpCode(ticker, root, key) {
  const xmlPath = await ensureCorpCodeXml(root, key);
  const map = loadCorpCodeMap(xmlPath);
  const entry = map.get(ticker);
  if (!entry) {
    throw new Error(
      `Could not resolve ticker ${ticker} via OpenDART corp_code master. Confirm it is a KRX-listed company with a 6-digit stock code.`
    );
  }
  return entry; // { corpCode, corpName }
}

// --- list.json: filings list -------------------------------------------

async function fetchFilingList(corpCode, opts, key) {
  // pblntf_ty=A → 정기공시 (사업/반기/분기 보고서)
  // Default to a 14-month lookback so that the most recent 사업보고서 (filed
  // each year in late March) is reachable when the script runs in any month.
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const bgnDefault = (() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 14);
    return fmt(d);
  })();
  const params = {
    corp_code: corpCode,
    pblntf_ty: "A",
    page_no: "1",
    page_count: "100",
    last_reprt_at: "Y",
    bgn_de: opts.bgnDe || bgnDefault,
    end_de: opts.endDe || fmt(today),
  };
  const url = buildApiUrl("list.json", params, key);
  const json = await httpsGetJson(url);
  if (json.status !== "000" && json.status !== "013") {
    // 013 = 조회된 데이터 없음
    throw new Error(
      `OpenDART list.json error status=${json.status} message=${json.message || "unknown"}`
    );
  }
  return Array.isArray(json.list) ? json.list : [];
}

function pickLatestRegular(filings, reportCodeShortKor) {
  // reportCodeShortKor maps to a Korean substring in report_nm:
  //   '11011' (사업보고서), '11012' (반기보고서), '11013' (분기보고서 1Q),
  //   '11014' (분기보고서 3Q). 1Q vs 3Q is disambiguated by month in report_nm
  //   (e.g. '분기보고서 (2026.03)' vs '분기보고서 (2026.09)').
  return filings
    .filter((row) => row.report_nm && row.report_nm.includes(reportCodeShortKor))
    .sort((a, b) => (b.rcept_dt || "").localeCompare(a.rcept_dt || ""))[0];
}

function reportShortKor(reportCode) {
  switch (String(reportCode)) {
    case "11011":
      return "사업보고서";
    case "11012":
      return "반기보고서";
    case "11013":
    case "11014":
      return "분기보고서";
    default:
      return "보고서";
  }
}

// --- document.xml: full filing ZIP -------------------------------------

async function downloadDocument(rceptNo, root, key) {
  const dir = filingDir(root, rceptNo);
  ensureDir(dir);
  const zipPath = path.join(dir, "document.zip");

  // detect existing extracted XML files
  const existingXml = listXmlFiles(dir);
  if (existingXml.length > 0) {
    return { zipPath, dir, xmlFiles: existingXml };
  }

  if (!fs.existsSync(zipPath)) {
    process.stderr.write(
      `[opendart] downloading document.xml ZIP for rcept_no=${rceptNo}...\n`
    );
    const url = buildApiUrl("document.xml", { rcept_no: rceptNo }, key);
    const { buffer, headers } = await httpsGetBuffer(url, { timeoutMs: 180_000 });
    const ctype = headers["content-type"] || "";
    if (ctype.includes("application/json") || ctype.includes("text/")) {
      // OpenDART returned an error status JSON instead of a ZIP
      const text = buffer.toString("utf8");
      throw new Error(`document.xml returned non-ZIP payload: ${text.slice(0, 250)}`);
    }
    fs.writeFileSync(zipPath, buffer);
  }

  process.stderr.write(`[opendart] extracting document.zip for ${rceptNo}...\n`);
  try {
    execFileSync("python3", [ZIP_HELPER, "extract", zipPath, dir], {
      stdio: ["ignore", "pipe", "inherit"],
    });
  } catch (err) {
    throw new Error(`Failed to extract document.zip: ${err.message}`);
  }
  const xmlFiles = listXmlFiles(dir);
  if (xmlFiles.length === 0) {
    throw new Error(`No .xml files found after extracting ${zipPath}`);
  }
  return { zipPath, dir, xmlFiles };
}

function listXmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.xml$/i.test(name) && name.toLowerCase() !== "corpcode.xml")
    .map((name) => path.join(dir, name));
}

// --- Document XML → narrative sections ---------------------------------

function htmlToText(xmlPath) {
  const result = spawnSync("python3", [ZIP_HELPER, "to-text", xmlPath], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const err = result.stderr ? result.stderr.toString() : "unknown";
    throw new Error(`opendart-zip.py to-text failed: ${err}`);
  }
  return result.stdout.toString("utf8");
}

function splitNarrativeIntoSections(text) {
  // DART filings section headings are typically:
  //   I. 회사의 개요
  //   II. 사업의 내용
  //   ...
  // and within each, decimal sub-headings like "1. 사업의 개요", "2. 주요 제품 및 원재료".
  // Strategy: detect top-level Roman headings as primary anchors. For each
  // heading boundary, slice the body. If no Roman headings found at all
  // (filing layout edge case), fall back to "1. ", "2. " heading detection.
  const lines = text.replace(/\r/g, "").split("\n");
  const headingIdxs = [];
  const headingRe = /^([IVX]+)\.\s+(.+?)\s*$/;
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].trim().match(headingRe);
    if (m) {
      const title = `${m[1]}. ${m[2]}`.replace(/\s+$/, "");
      // skip if title is too long (likely a paragraph with leading "I." text)
      if (title.length <= 80) {
        headingIdxs.push({ idx: i, title });
      }
    }
  }

  if (headingIdxs.length === 0) {
    // fallback: try decimal headings "1. ", "2. " etc.
    for (let i = 0; i < lines.length; i += 1) {
      const m = lines[i].trim().match(/^(\d+)\.\s+(.+?)\s*$/);
      if (m && m[2].length <= 80) {
        headingIdxs.push({ idx: i, title: `${m[1]}. ${m[2]}` });
      }
    }
  }

  const sections = [];
  // Pattern that downstream extract-dart-sections.js treats as a section
  // start (Roman or decimal). We rewrite any decimal sub-heading inside the
  // Roman body to use [N. Title] square brackets so extract keeps the entire
  // Roman block as ONE section. Roman lines inside the body are likewise
  // re-marked when nested (rare).
  const decimalHeadingRe = /^(\d+(?:-\d+)?(?:\.\d+)*)\.\s+(.+)$/;
  const innerRomanRe = /^([IVX]+)\.\s+(.+)$/;
  for (let s = 0; s < headingIdxs.length; s += 1) {
    const start = headingIdxs[s].idx + 1;
    const end = s + 1 < headingIdxs.length ? headingIdxs[s + 1].idx : lines.length;
    const body = lines
      .slice(start, end)
      .map((ln) => {
        const trimmed = ln.trim();
        if (!trimmed) return ln;
        const dm = trimmed.match(decimalHeadingRe);
        if (dm) {
          // 1. 회사의 개요 → [1. 회사의 개요]
          return `[${trimmed}]`;
        }
        const rm = trimmed.match(innerRomanRe);
        if (rm) {
          return `[${trimmed}]`;
        }
        return ln;
      })
      .join("\n")
      .trim();
    if (body) {
      sections.push({ title: headingIdxs[s].title, content: body });
    }
  }
  return sections;
}

// --- Structured endpoints ----------------------------------------------

const STRUCTURED_ENDPOINTS = [
  { id: "majorshareholder", name: "주주 현황 (majorshareholder)", code: "VII-부록" },
  { id: "alotMatter", name: "배당에 관한 사항 (alotMatter)", code: "VIII-부록" },
  { id: "tesstkAcqsDspsSttus", name: "자기주식 취득 및 처분 현황 (tesstkAcqsDspsSttus)", code: "IX-부록" },
  { id: "irdsSttus", name: "증자 / 감자 현황 (irdsSttus)", code: "X-부록" },
  { id: "cpndlhCmpsBoardCo", name: "임원 현황 (cpndlhCmpsBoardCo)", code: "XI-부록" },
  { id: "fnlttSinglAcntAll", name: "단일회사 전체 재무제표 (fnlttSinglAcntAll)", code: "XII-부록" },
];

async function fetchStructuredEndpoints(corpCode, year, reportCode, key) {
  const out = {};
  for (const ep of STRUCTURED_ENDPOINTS) {
    const params = {
      corp_code: corpCode,
      bsns_year: String(year),
      reprt_code: String(reportCode),
    };
    if (ep.id === "fnlttSinglAcntAll") {
      params.fs_div = "CFS"; // 연결재무제표; OFS for separate
    }
    const url = buildApiUrl(`${ep.id}.json`, params, key);
    try {
      const json = await httpsGetJson(url);
      out[ep.id] = json;
    } catch (err) {
      out[ep.id] = { error: err.message };
    }
  }
  // Try OFS as well for fnltt — many companies don't have CFS for separate reports
  if (out.fnlttSinglAcntAll && out.fnlttSinglAcntAll.status === "013") {
    try {
      const params = {
        corp_code: corpCode,
        bsns_year: String(year),
        reprt_code: String(reportCode),
        fs_div: "OFS",
      };
      const url = buildApiUrl("fnlttSinglAcntAll.json", params, key);
      out.fnlttSinglAcntAll_ofs = await httpsGetJson(url);
    } catch (err) {
      out.fnlttSinglAcntAll_ofs = { error: err.message };
    }
  }
  return out;
}

// --- Synthesize sections from structured JSON --------------------------

function fmtMoney(value) {
  if (value === undefined || value === null || value === "") return "-";
  const num = Number(String(value).replace(/[, ]/g, ""));
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString("ko-KR");
}

function renderMajorShareholder(json) {
  if (!json || json.status === "013") return "데이터 없음 (status 013).";
  if (json.status && json.status !== "000") {
    return `에러: status=${json.status} ${json.message || ""}`;
  }
  const list = Array.isArray(json.list) ? json.list : [];
  if (!list.length) return "리스트 비어 있음.";
  const lines = [
    `※ 출처: OpenDART majorshareholder.json (${list.length}건)`,
    "",
    "| 주주명 | 관계 | 보통주 보유 | 지분율(보통주) | 보고일 |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const row of list) {
    lines.push(
      `| ${row.nm || "-"} | ${row.relate || "-"} | ${fmtMoney(row.bsis_posesn_stock_co)} | ${row.bsis_posesn_stock_qota_rt || "-"}% | ${row.stlm_dt || "-"} |`
    );
  }
  return lines.join("\n");
}

function renderAlotMatter(json) {
  if (!json || json.status === "013") return "데이터 없음 (status 013).";
  if (json.status && json.status !== "000") {
    return `에러: status=${json.status} ${json.message || ""}`;
  }
  const list = Array.isArray(json.list) ? json.list : [];
  if (!list.length) return "리스트 비어 있음.";
  // Group rows by `se` (구분) for compact rendering.
  const lines = [
    `※ 출처: OpenDART alotMatter.json (${list.length}건)`,
    "",
    "| 구분 | 주식 종류 | 당기 | 전기 | 전전기 |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const row of list) {
    lines.push(
      `| ${row.se || "-"} | ${row.stock_knd || "-"} | ${row.thstrm || "-"} | ${row.frmtrm || "-"} | ${row.lwfr || "-"} |`
    );
  }
  return lines.join("\n");
}

function renderTesstk(json) {
  if (!json || json.status === "013") return "데이터 없음 (status 013).";
  if (json.status && json.status !== "000") {
    return `에러: status=${json.status} ${json.message || ""}`;
  }
  const list = Array.isArray(json.list) ? json.list : [];
  if (!list.length) return "리스트 비어 있음.";
  const lines = [
    `※ 출처: OpenDART tesstkAcqsDspsSttus.json (${list.length}건)`,
    "",
    "| 구분 | 주식종류 | 기초 수량 | 변동 수량 | 기말 수량 | 비고 |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of list) {
    lines.push(
      `| ${row.acqs_mth1 || row.se || "-"} | ${row.stock_knd || "-"} | ${fmtMoney(row.bsis_qy)} | ${fmtMoney(row.change_qy)} | ${fmtMoney(row.trmend_qy)} | ${row.rm || "-"} |`
    );
  }
  return lines.join("\n");
}

function renderIrds(json) {
  if (!json || json.status === "013") return "데이터 없음 (status 013).";
  if (json.status && json.status !== "000") {
    return `에러: status=${json.status} ${json.message || ""}`;
  }
  const list = Array.isArray(json.list) ? json.list : [];
  if (!list.length) return "리스트 비어 있음.";
  const lines = [
    `※ 출처: OpenDART irdsSttus.json (${list.length}건)`,
    "",
    "| 결의일 | 발행 형태 | 종류 | 수량 | 액면가액 | 발행가액 |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of list) {
    lines.push(
      `| ${row.isu_dcrs_de || "-"} | ${row.isu_dcrs_stle || "-"} | ${row.isu_dcrs_stock_knd || "-"} | ${fmtMoney(row.isu_dcrs_qy)} | ${fmtMoney(row.isu_dcrs_mstvdv_fval_amount)} | ${fmtMoney(row.isu_dcrs_mstvdv_amount)} |`
    );
  }
  return lines.join("\n");
}

function renderBoard(json) {
  if (!json || json.status === "013") return "데이터 없음 (status 013).";
  if (json.status && json.status !== "000") {
    return `에러: status=${json.status} ${json.message || ""}`;
  }
  const list = Array.isArray(json.list) ? json.list : [];
  if (!list.length) return "리스트 비어 있음.";
  const lines = [
    `※ 출처: OpenDART cpndlhCmpsBoardCo.json (${list.length}건)`,
    "",
    "| 성명 | 성별 | 직위 | 등기 임원 여부 | 상근 여부 | 담당 업무 | 임기 만료일 |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of list) {
    lines.push(
      `| ${row.nm || "-"} | ${row.sexdstn || "-"} | ${row.ofcps || "-"} | ${row.rgist_exctv_at || "-"} | ${row.fte_at || "-"} | ${row.chrg_job || "-"} | ${row.tenure_end_on || "-"} |`
    );
  }
  return lines.join("\n");
}

function renderFnltt(json, label) {
  if (!json || json.status === "013") return `데이터 없음 (${label}, status 013).`;
  if (json.status && json.status !== "000") {
    return `에러 (${label}): status=${json.status} ${json.message || ""}`;
  }
  const list = Array.isArray(json.list) ? json.list : [];
  if (!list.length) return `리스트 비어 있음 (${label}).`;
  // Filter to important account names by default.
  const lines = [
    `※ 출처: OpenDART fnlttSinglAcntAll.json (${label}, ${list.length}건)`,
    "",
    "| 재무제표 | 계정 | 당기 | 전기 | 전전기 |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const row of list) {
    const fs = row.sj_nm || row.fs_nm || "-";
    const account = row.account_nm || row.account_id || "-";
    lines.push(
      `| ${fs} | ${account} | ${fmtMoney(row.thstrm_amount)} | ${fmtMoney(row.frmtrm_amount)} | ${fmtMoney(row.bfefrmtrm_amount)} |`
    );
  }
  return lines.join("\n");
}

function synthesizeStructuredSections(structured) {
  const out = [];
  out.push({
    title: "Z-1. OpenDART 주주 현황 (구조화)",
    content: renderMajorShareholder(structured.majorshareholder),
  });
  out.push({
    title: "Z-2. OpenDART 배당에 관한 사항 (구조화)",
    content: renderAlotMatter(structured.alotMatter),
  });
  out.push({
    title: "Z-3. OpenDART 자기주식 취득 및 처분 현황 (구조화)",
    content: renderTesstk(structured.tesstkAcqsDspsSttus),
  });
  out.push({
    title: "Z-4. OpenDART 증자 / 감자 현황 (구조화)",
    content: renderIrds(structured.irdsSttus),
  });
  out.push({
    title: "Z-5. OpenDART 임원 현황 (구조화)",
    content: renderBoard(structured.cpndlhCmpsBoardCo),
  });
  // Renderer for fnltt: prefer CFS, then OFS fallback
  const cfs = structured.fnlttSinglAcntAll;
  let fnlttContent;
  if (cfs && cfs.status === "000") {
    fnlttContent = renderFnltt(cfs, "CFS 연결");
  } else if (structured.fnlttSinglAcntAll_ofs) {
    fnlttContent = renderFnltt(structured.fnlttSinglAcntAll_ofs, "OFS 별도");
  } else {
    fnlttContent = renderFnltt(cfs, "CFS 연결");
  }
  out.push({
    title: "Z-6. OpenDART 단일회사 전체 재무제표 (구조화)",
    content: fnlttContent,
  });
  return out;
}

// --- writeBrowserExport ------------------------------------------------

function writeBrowserExport(meta, sections, outPath) {
  const payload = {
    meta: {
      url: meta.url || "",
      title: meta.title || "DART filing",
      companyNameCandidate: meta.companyName || "",
      filingDateCandidate: meta.filingDate || "",
      capturedAt: new Date().toISOString(),
    },
    extraction: {
      status: "ready",
      errors: [],
      diagnostics: meta.diagnostics || {},
    },
    content: { sections },
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

// --- main --------------------------------------------------------------

async function run(args) {
  if (args.help) {
    console.log(usage());
    return 0;
  }
  if (!args.ticker) {
    console.error("Error: --ticker is required.");
    console.log(usage());
    return 1;
  }
  if (!args.output) {
    console.error("Error: --output is required.");
    console.log(usage());
    return 1;
  }

  const key = loadApiKey();
  const root = ensureDir(cacheRoot(args));

  // Resolve corp_code
  const { corpCode, corpName } = await resolveCorpCode(args.ticker, root, key);
  process.stderr.write(`[opendart] resolved ticker=${args.ticker} → corp_code=${corpCode} corp_name=${corpName}\n`);

  // Resolve rcept_no
  let rceptNo = args.rceptNo;
  let filing = null;
  let year = args.year;
  if (!rceptNo) {
    const filings = await fetchFilingList(corpCode, {}, key);
    const shortKor = reportShortKor(args.reportCode);
    filing = pickLatestRegular(filings, shortKor);
    if (!filing) {
      throw new Error(
        `No filing matching '${shortKor}' found in latest 정기공시 list for corp_code=${corpCode}.`
      );
    }
    rceptNo = filing.rcept_no;
    if (!year && filing.rcept_dt) {
      // For 사업보고서 the bsns_year is the prior year (filed in following March).
      // Approximate: use rcept_dt year - 1 for 사업보고서, year for quarterly.
      const y = parseInt(filing.rcept_dt.slice(0, 4), 10);
      year = String(args.reportCode === "11011" ? y - 1 : y);
    }
    process.stderr.write(
      `[opendart] picked filing rcept_no=${rceptNo} report_nm='${filing.report_nm}' rcept_dt=${filing.rcept_dt}\n`
    );
  }
  if (!year) year = String(new Date().getFullYear() - 1);

  // Document.xml narrative
  let narrativeSections = [];
  let docInfo = null;
  if (!args.skipDocument) {
    try {
      docInfo = await downloadDocument(rceptNo, root, key);
      // Combine narrative from all extracted XMLs
      let combined = "";
      for (const xmlPath of docInfo.xmlFiles) {
        try {
          combined += htmlToText(xmlPath) + "\n\n";
        } catch (err) {
          process.stderr.write(`[opendart] warning: to-text failed for ${xmlPath}: ${err.message}\n`);
        }
      }
      narrativeSections = splitNarrativeIntoSections(combined);
      process.stderr.write(`[opendart] narrative sections parsed: ${narrativeSections.length}\n`);
    } catch (err) {
      process.stderr.write(`[opendart] document.xml unavailable: ${err.message}\n`);
    }
  }

  // Structured endpoints
  let structuredSections = [];
  let structured = null;
  if (!args.skipStructured) {
    structured = await fetchStructuredEndpoints(corpCode, year, args.reportCode, key);
    structuredSections = synthesizeStructuredSections(structured);
    process.stderr.write(`[opendart] structured sections synthesized: ${structuredSections.length}\n`);
  }

  const sections = [...narrativeSections, ...structuredSections];
  if (sections.length === 0) {
    throw new Error(
      "No sections produced. Both document.xml and structured endpoints failed. Check API key and rcept_no."
    );
  }

  // Resolve output path
  let outPath = path.resolve(args.output);
  let outIsDir = false;
  try {
    outIsDir = fs.statSync(outPath).isDirectory();
  } catch (_) {
    // does not exist yet — treat as file path unless trailing slash
    outIsDir = args.output.endsWith("/") || args.output.endsWith("\\");
  }
  if (outIsDir) {
    ensureDir(outPath);
    outPath = path.join(outPath, "dart-browser-export.json");
  } else {
    ensureDir(path.dirname(outPath));
  }

  const meta = {
    url: filing
      ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`
      : `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`,
    title: filing ? filing.report_nm : `DART filing ${rceptNo}`,
    companyName: corpName,
    filingDate: filing ? filing.rcept_dt : "",
    diagnostics: {
      corpCode,
      ticker: args.ticker,
      rceptNo,
      bsnsYear: year,
      reportCode: args.reportCode,
      narrativeSectionCount: narrativeSections.length,
      structuredSectionCount: structuredSections.length,
      structuredEndpointStatuses: structured
        ? Object.fromEntries(
            Object.entries(structured).map(([k, v]) => [k, v.status || (v.error ? "error" : "?")])
          )
        : {},
      cacheRoot: root,
      sourceXmlFiles: docInfo ? docInfo.xmlFiles : [],
    },
  };

  writeBrowserExport(meta, sections, outPath);
  process.stderr.write(`[opendart] wrote ${outPath} (sections=${sections.length})\n`);
  return 0;
}

(async () => {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.log(usage());
    process.exit(1);
  }
  try {
    const code = await run(args);
    process.exit(code);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
})();
