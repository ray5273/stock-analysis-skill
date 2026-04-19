// Hankyung Consensus (consensus.hankyung.com) row parser.
// Node stdlib only. Consumed by ../discover-reports.js.
//
// The list page renders rows as an HTML table with 8 consecutive lines per
// row in the `browse text` output:
//   1. <date YYYY-MM-DD>
//   2. <titleWithTicker>           (e.g. "엘앤에프(066970) 4Q25 Review …")
//   3. <titleWithTicker>           (duplicate — img alt / anchor title)
//   4. <cleanTitle>                 (no ticker prefix)
//   5. <targetPrice integer or 0>
//   6. <ratingRaw: "Buy" / "Hold" / "Trading Buy" / "N/A" / "투자의견없음" / ...>
//   7. <analysts comma-separated>
//   8. <broker>
//
// The `browse links` output gives us "<titleWithTicker> → downpdf URL" which
// we zip with the text-block rows to attach the PDF URL per report.

const LIST_URL_BASE = "https://consensus.hankyung.com/analysis/list";
const PDF_URL_RX =
  /https?:\/\/consensus\.hankyung\.com\/analysis\/downpdf\?report_idx=(\d+)/i;

function buildListUrl({ company, startDate, endDate, page, reportType = "CO" }) {
  const params = new URLSearchParams({
    report_type: reportType,
    sdate: startDate,
    edate: endDate,
    now_page: String(page),
    search_text: company,
  });
  return `${LIST_URL_BASE}?${params.toString()}`;
}

function normalizeRating(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (/N\/?A|투자의견없음|해당\s*없음|없음|^\s*-\s*$/i.test(trimmed)) return null;
  if (/매수|BUY|적극매수|STRONG\s*BUY|비중\s*확대|OVERWEIGHT/i.test(trimmed)) return "BUY";
  if (/매도|SELL|비중\s*축소|UNDERWEIGHT/i.test(trimmed)) return "SELL";
  if (/중립|보유|HOLD|MARKET\s*PERFORM|시장수익률|NEUTRAL/i.test(trimmed)) return "HOLD";
  return null;
}

function parseTargetPrice(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^N\/?A$|^-$|해당\s*없음/i.test(s)) return null;
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
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

function makeReportId({ broker, publishedDate, reportIdx, title }) {
  if (reportIdx) return `hankyung-${reportIdx}`;
  return `hankyung-${slug(broker) || "unknown"}-${publishedDate || "na"}-${slug(title) || "untitled"}`;
}

function stripTickerPrefix(title) {
  if (!title) return title;
  // "엘앤에프(066970) foo" → "foo"
  return title.replace(/^[^()]{1,40}\(\d{5,7}\)\s*/, "").trim();
}

// Parse the links output: each pdf URL line has "<titleWithTicker> → <pdf>".
// Return a Map keyed by the titleWithTicker text, value = { pdfUrl, reportIdx }.
function parseLinksBlock(linksText) {
  const out = new Map();
  if (!linksText) return out;
  const lines = linksText.split(/\r?\n/);
  for (const line of lines) {
    const arrow = line.indexOf(" → ");
    if (arrow < 0) continue;
    const left = line.slice(0, arrow).trim();
    const right = line.slice(arrow + 3).trim();
    const m = right.match(PDF_URL_RX);
    if (!m) continue;
    if (!left) continue;
    out.set(left, { pdfUrl: right, reportIdx: m[1] });
  }
  return out;
}

// Parse the `browse text` output into rows of 8 lines.
function parseTextBlockRows(plainText) {
  if (!plainText) return [];
  const lines = plainText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const dateRx = /^20\d{2}-\d{2}-\d{2}$/;
  const rows = [];
  for (let i = 0; i + 7 < lines.length; i += 1) {
    const dateLine = lines[i];
    if (!dateRx.test(dateLine)) continue;
    // Guard: the two title lines (i+1, i+2) should start with the same ticker-prefix.
    const title1 = lines[i + 1];
    const title2 = lines[i + 2];
    const cleanTitle = lines[i + 3];
    const targetRaw = lines[i + 4];
    const ratingRaw = lines[i + 5];
    const analystRaw = lines[i + 6];
    const brokerRaw = lines[i + 7];
    // Cheap sanity check: line i+4 must look like an integer-ish cell
    // (0 for N/A, or a number up to ~1,000,000), and line i+5 must look like a rating word.
    if (!/^\d{1,7}(?:,\d{3})*$/.test(targetRaw) && targetRaw !== "0") continue;
    if (!/^[A-Za-z가-힣\/ ]+$/.test(ratingRaw)) continue;
    rows.push({
      dateRaw: dateLine,
      titleWithTicker: title1,
      titleWithTickerAlt: title2,
      cleanTitle,
      targetRaw,
      ratingRaw,
      analystRaw,
      brokerRaw,
    });
    i += 7; // advance past this row
  }
  return rows;
}

function parseListPage(linksText, plainText) {
  const pdfMap = parseLinksBlock(linksText);
  const rows = parseTextBlockRows(plainText);
  const reports = [];
  for (const row of rows) {
    const publishedDate = normalizeDate(row.dateRaw);
    const title = row.cleanTitle || stripTickerPrefix(row.titleWithTicker);
    // Find PDF by matching the titleWithTicker lines against the link map.
    let linkEntry =
      pdfMap.get(row.titleWithTicker) ||
      pdfMap.get(row.titleWithTickerAlt) ||
      null;
    if (!linkEntry) {
      // Try a loose prefix match against any key.
      for (const [key, value] of pdfMap.entries()) {
        if (key === row.titleWithTicker || key === row.titleWithTickerAlt) {
          linkEntry = value;
          break;
        }
        if (
          key.startsWith(row.titleWithTicker) ||
          row.titleWithTicker.startsWith(key)
        ) {
          linkEntry = value;
          break;
        }
      }
    }
    const reportIdx = linkEntry ? linkEntry.reportIdx : null;
    const pdfUrl = linkEntry ? linkEntry.pdfUrl : null;
    const landingUrl = pdfUrl; // no separate landing page on hankyung list
    const reportId = makeReportId({
      broker: row.brokerRaw,
      publishedDate,
      reportIdx,
      title,
    });
    reports.push({
      reportId,
      broker: row.brokerRaw || null,
      analyst: row.analystRaw || null,
      publishedDate,
      title,
      rating: normalizeRating(row.ratingRaw),
      ratingRaw: row.ratingRaw || null,
      targetPrice: parseTargetPrice(row.targetRaw),
      currency: "KRW",
      pdfUrl,
      landingUrl,
      sourceSite: "hankyung",
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
  parseTextBlockRows,
  normalizeRating,
  parseTargetPrice,
  normalizeDate,
  stripTickerPrefix,
  makeReportId,
};
