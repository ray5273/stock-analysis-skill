// Naver Pay Research (finance.naver.com/research) fallback parser.
// Node stdlib only.
//
// The Naver list page is simpler than Hankyung: each row shows 종목명, 제목,
// 증권사, 첨부(PDF), 작성일. Analyst name, rating, and target price are
// generally NOT on the list page, so we leave those null for Naver rows.

const LIST_URL_BASE =
  "https://finance.naver.com/research/company_list.naver";

function buildListUrl({ ticker, startDate, endDate, page }) {
  const params = new URLSearchParams({
    searchType: "itemCode",
    itemCode: ticker,
    writeFromDate: startDate,
    writeToDate: endDate,
    page: String(page),
  });
  return `${LIST_URL_BASE}?${params.toString()}`;
}

function normalizeDate(raw) {
  if (!raw) return null;
  const m = String(raw).match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function slug(s) {
  if (!s) return "";
  return String(s)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-]/gu, "")
    .slice(0, 60);
}

function makeReportId({ broker, publishedDate, title }) {
  return `naver-${slug(broker) || "unknown"}-${publishedDate || "na"}-${slug(title) || "untitled"}`;
}

// Parse the `browse links` output. Naver research rows typically render as:
//   "<제목> → https://finance.naver.com/research/company_read.naver?nid=XXXX&page=1"
//   "PDF → https://stock.pstatic.net/stock-research/company/..../YYYYMMDD_*.pdf"
// interleaved with the date / broker / 종목 cells.
function parseLinksBlock(linksText) {
  if (!linksText) return { entries: [] };
  const lines = linksText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const entries = [];
  let current = null;

  const readRx = /https?:\/\/finance\.naver\.com\/research\/company_read\.naver\?[^\s]*nid=(\d+)/i;
  const pdfRx = /https?:\/\/[^\s]+\.pdf(?:\?[^\s]*)?$/i;

  for (const line of lines) {
    const arrowIdx = line.indexOf(" → ");
    if (arrowIdx < 0) continue;
    const text = line.slice(0, arrowIdx).trim();
    const url = line.slice(arrowIdx + 3).trim();
    if (!url) continue;

    const readMatch = url.match(readRx);
    if (readMatch) {
      if (current) entries.push(current);
      current = {
        nid: readMatch[1],
        title: text,
        landingUrl: url,
        pdfUrl: null,
      };
      continue;
    }

    if (current && pdfRx.test(url)) {
      if (!current.pdfUrl) current.pdfUrl = url;
      continue;
    }
  }
  if (current) entries.push(current);
  return { entries };
}

// The `browse text` output for the Naver research list looks roughly like:
//   <제목>
//   <종목명>
//   <증권사>
//   <첨부 icon markers>
//   YYYY.MM.DD
// We walk lines and detect the date token; the two lines above are broker
// and ticker, the one above that is the title.
function parseTextRows(plainText) {
  if (!plainText) return [];
  const lines = plainText.split(/\r?\n/).map((l) => l.trim());
  const rows = [];
  const dateRx = /^20\d{2}[./-]\d{1,2}[./-]\d{1,2}$/;

  for (let i = 0; i < lines.length; i += 1) {
    if (!dateRx.test(lines[i])) continue;
    const dateLine = lines[i];

    // Walk upward, skipping empty / icon-like / single-char lines, collect
    // up to three meaningful lines: broker, ticker/company, title.
    const collected = [];
    for (let j = i - 1; j >= Math.max(0, i - 10) && collected.length < 3; j -= 1) {
      const cand = lines[j];
      if (!cand) continue;
      if (cand.length < 2) continue;
      if (/^[>*\-+]+$/.test(cand)) continue;
      collected.push(cand);
    }
    // collected[0] = broker, collected[1] = ticker/company, collected[2] = title
    rows.push({
      dateRaw: dateLine,
      brokerRaw: collected[0] || null,
      companyRaw: collected[1] || null,
      titleRaw: collected[2] || null,
    });
  }
  return rows;
}

function mergeLinksAndText(linkEntries, textRows) {
  const merged = [];
  const usedIdx = new Set();

  for (const entry of linkEntries) {
    const title = (entry.title || "").trim();
    let bestIdx = -1;
    for (let i = 0; i < textRows.length; i += 1) {
      if (usedIdx.has(i)) continue;
      const rowTitle = (textRows[i].titleRaw || "").trim();
      if (!rowTitle) continue;
      if (
        rowTitle === title ||
        rowTitle.startsWith(title) ||
        title.startsWith(rowTitle)
      ) {
        bestIdx = i;
        break;
      }
    }
    if (bestIdx >= 0) {
      usedIdx.add(bestIdx);
      const row = textRows[bestIdx];
      merged.push({
        nid: entry.nid,
        title,
        landingUrl: entry.landingUrl,
        pdfUrl: entry.pdfUrl,
        broker: row.brokerRaw || null,
        publishedDate: normalizeDate(row.dateRaw),
      });
    } else {
      merged.push({
        nid: entry.nid,
        title,
        landingUrl: entry.landingUrl,
        pdfUrl: entry.pdfUrl,
        broker: null,
        publishedDate: null,
      });
    }
  }
  return merged;
}

function parseListPage(linksText, plainText) {
  const linkBlock = parseLinksBlock(linksText);
  const textRows = parseTextRows(plainText);
  const merged = mergeLinksAndText(linkBlock.entries, textRows);

  const reports = [];
  for (const m of merged) {
    if (!m.title) continue;
    const publishedDate = m.publishedDate;
    const reportId = makeReportId({
      broker: m.broker,
      publishedDate,
      title: m.title,
    });
    reports.push({
      reportId,
      broker: m.broker,
      analyst: null,
      publishedDate,
      title: m.title,
      rating: null,
      ratingRaw: null,
      targetPrice: null,
      currency: "KRW",
      pdfUrl: m.pdfUrl,
      landingUrl: m.landingUrl,
      sourceSite: "naver",
      requiresAuth: false,
    });
  }
  return reports;
}

module.exports = {
  LIST_URL_BASE,
  buildListUrl,
  parseListPage,
  parseLinksBlock,
  parseTextRows,
  mergeLinksAndText,
  normalizeDate,
  makeReportId,
};
