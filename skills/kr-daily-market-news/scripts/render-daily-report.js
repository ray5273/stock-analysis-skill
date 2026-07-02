#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { DEFAULT_SECTORS, marketNewsScore, newsRankScore } = require("./fetch-daily-market-news");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key.slice(2)] = true;
    else { args[key.slice(2)] = next; i += 1; }
  }
  return args;
}

function sha256(value) {
  const hash = crypto.createHash("sha256");
  hash.update(value);
  return hash.digest("hex");
}

function fileSha256(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, filePath);
}

function normalizeText(value) {
  return String(value || "").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

function escapePipe(value) {
  return String(value || "").replace(/\|/g, "\\|").trim();
}

function kstTimeLabel(publishedAt) {
  if (!publishedAt) return "";
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function itemLine(item) {
  const label = item.headline || item.title || "제목 없음";
  const time = kstTimeLabel(item.publishedAt);
  const suffix = `${item.source || "source"}${time ? ` (${time})` : ""}`;
  return item.url ? `- [${label}](${item.url}) — ${suffix}` : `- ${label}`;
}

function sourceLabel(item) {
  return item.headline || item.title || item.name || "출처";
}

function headlineFingerprint(value) {
  return String(value || "")
    .replace(/\[[^\]]*속보[^\]]*\]/g, "")
    .replace(/\([^)]*(?:종합|속보|상보)[^)]*\)/g, "")
    .replace(/(?:종합|속보|상보)/g, "")
    .replace(/[0-9]+(?:\.[0-9]+)?%/g, "#%")
    .replace(/[0-9,]+/g, "#")
    .replace(/[^\p{L}\p{N}%#]+/gu, "")
    .toLowerCase();
}

function summaryFingerprint(item) {
  const text = `${item?.headline || item?.title || ""} ${item?.summary || ""}`;
  if (/반도체.*코스피.*코스닥|코스피.*반도체.*코스닥|코스피.*코스닥.*반도체/.test(text)) return "market-semiconductor-index-drop";
  if (/사이드카.*코스피.*코스닥|코스피.*코스닥.*사이드카/.test(text)) return "market-sidecar";
  if (/환율|고환율|원화|달러/.test(text)) return "macro-fx";
  if (/금리|국고채|채권|연준|FOMC/.test(text)) return "macro-rates";
  if (/외국인|기관|개인|수급|순매수|순매도/.test(text)) return "market-flow";
  return headlineFingerprint(item?.headline || item?.title || item?.summary || "");
}

function uniqueNewsItems(items, options = {}) {
  const seenUrls = new Set();
  const seenTopics = new Set();
  const output = [];
  for (const item of items || []) {
    const urlKey = normalizedUrl(item.url);
    const topicKey = summaryFingerprint(item);
    if (urlKey && seenUrls.has(urlKey)) continue;
    if (topicKey && seenTopics.has(topicKey)) continue;
    if (urlKey) seenUrls.add(urlKey);
    if (topicKey) seenTopics.add(topicKey);
    output.push(item);
    if (options.limit && output.length >= options.limit) break;
  }
  return output;
}

function sectorBlogPattern(sector) {
  const patterns = {
    "반도체/AI": /반도체|HBM|DRAM|D램|낸드|메모리|파운드리|AI|인공지능|오픈AI|삼성전자|SK하이닉스|한미반도체|삼성전기|글라스|기판|장비|소켓|패키징/i,
    "이차전지/전기차": /이차전지|2차전지|배터리|전기차|EV|충전|양극재|음극재|전해액|전해질|분리막|리튬|LG에너지솔루션|삼성SDI|에코프로|엘앤에프|SKIET|SK아이이테크놀로지/i,
    "자동차/부품": /자동차|완성차|전장|차량|모비스|현대차|기아|현대모비스|HL만도|만도|현대위아|타이어|범퍼|부품|서연이화/i,
    "조선/방산": /조선|선박|LNG|수주|KDDX|방산|방위|항공우주|잠수함|함정|한화오션|HD현대|삼성중공업|한국항공우주|LIG넥스원|현대로템|KNDS|전차/i,
    "바이오/헬스케어": /바이오|헬스케어|제약|의약품|의료|신약|비만치료제|백신|CDMO|시밀러|한미약품|한미사이언스|셀트리온|삼성바이오|대웅|유한양행/i,
    "인터넷/게임/미디어": /인터넷|게임|미디어|콘텐츠|콘텐트|엔터테인먼트|웹툰|OTT|극장|카카오(?!뱅크)|NAVER|네이버|엔씨소프트|넷마블|크래프톤|펄어비스|위메이드|하이브|CJ ENM|스튜디오드래곤/i,
    "금융/증권/보험": /증권|보험|금융|카드|운용|브로커리지|증거금|예금|적금|ISA|미래에셋|키움증권|NH증권|카카오뱅크|신한은행|신한금융|KB금융|하나금융|우리금융/i,
    "화학/정유": /화학|정유|석유화학|에너지|배터리소재|정제마진|유가|SK이노베이션|LG화학|롯데케미칼|한화솔루션|S-Oil|효성티앤씨|SKIET/i,
    "철강/기계/건설": /철강|기계|건설|건설사|건설업|건자재|주택|부동산|도시개발|대우건설|삼성E&A|현대건설|GS건설|DL이앤씨|POSCO|포스코|두산밥캣|두산에너빌리티|SH/i,
    "소비재/화장품/유통": /소비재|화장품|K뷰티|뷰티|유통|면세|식품|의류|패션|호텔|레저|수출|아모레|LG생활건강|코스맥스|한국콜마|CJ제일제당|오리온|신세계|이마트/i,
  };
  return patterns[sector] || null;
}

function blogSectorItems(group, options = {}) {
  const pattern = sectorBlogPattern(group?.sector);
  const candidates = pattern
    ? (group.items || []).filter(item => pattern.test(`${item.headline || item.title || ""} ${item.description || ""}`))
    : (group.items || []);
  return uniqueNewsItems(candidates, options);
}

function representativeNewsLabel(item) {
  const headline = item.headline || item.title || "";
  if (!headline) return "";
  return item.name ? `${item.name}: ${headline}` : headline;
}

function sourceRow(item) {
  return `| ${escapePipe(sourceLabel(item))} | ${item.url ? `[원문](${item.url})` : "-"} |`;
}

function normalizedUrl(value) {
  let url = String(value || "").trim();
  if (!url) return "";
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(?:utm_|fbclid$|gclid$|ncid$|sid$|session$|tracking$)/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.hash = "";
    return parsed.toString().toLowerCase();
  } catch {
    return url.replace(/#.*$/, "").toLowerCase();
  }
}

function dedupeSourcesByUrl(items) {
  const seen = new Set();
  const output = [];
  for (const item of items || []) {
    const key = normalizedUrl(item.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function naverMarketNewsItems(data) {
  return uniqueNewsItems((data.marketNews || []).filter(item => item.url), { limit: 5 });
}

function naverSummaryItems(data) {
  const source = data.marketSummary?.length ? data.marketSummary : data.marketNews;
  return uniqueNewsItems(source || [], { limit: 5 });
}

function representativeSectorItems(data) {
  return sectorGroups(data).flatMap(group => blogSectorItems(group, { limit: 1 }));
}

function naverSourceItems(data) {
  const marketUrls = new Set(naverMarketNewsItems(data).map(item => normalizedUrl(item.url)).filter(Boolean));
  return dedupeSourcesByUrl(uniqueNewsItems([
    ...representativeSectorItems(data),
    ...(data.officialSources || []),
  ].filter(item => item.url && !marketUrls.has(normalizedUrl(item.url))), { limit: 20 }));
}

function summarizeWarningForNaver(warning) {
  const text = String(warning || "");
  if (/시장 주요 뉴스가 기준일 기사만으로/.test(text)) return text.replace(/\s*\(.*?\)\s*/g, " ");
  if (/업종 뉴스|반도체\/AI|이차전지|자동차|조선|바이오|인터넷|금융|화학|철강|소비재/.test(text)) return "업종 뉴스 일부는 수집 제한 또는 날짜 확인 문제로 제외했습니다.";
  if (/날짜 확인|기준일/.test(text)) return "날짜가 확인되지 않거나 기준일이 다른 뉴스는 본문에서 제외했습니다.";
  if (/뉴스 수집 실패|수집 실패/.test(text)) return "일부 뉴스 검색은 수집 제한으로 제외했습니다.";
  return "일부 수집 이슈는 본문 출처 구성에서 제외했습니다.";
}

function naverCollectionNotes(data) {
  const notes = new Set((data.warnings || []).map(summarizeWarningForNaver).filter(Boolean));
  const displayedMarketNews = naverMarketNewsItems(data).length;
  if (displayedMarketNews < 5) notes.add(`시장 주요 뉴스는 기준일 기사만 ${displayedMarketNews}건 확인되어 부족분을 보충하지 않았습니다.`);
  return [...notes].slice(0, 4);
}

function findLeadershipSummary(asOfDate, baseDir) {
  const mdPath = path.resolve(baseDir, `leaders-${asOfDate}.md`);
  const jsonPath = path.resolve(baseDir, `leaders-${asOfDate}.json`);
  if (!fs.existsSync(mdPath) && !fs.existsSync(jsonPath)) return null;
  if (fs.existsSync(jsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const leaders = [
        ...(parsed.shortTerm?.slice?.(0, 3) || []),
        ...(parsed.intermediate?.slice?.(0, 3) || []),
        ...(parsed.structural?.slice?.(0, 3) || []),
      ].map(item => item.name || item.ticker || item.company).filter(Boolean);
      return leaders.length ? `동일 기준일 리더십 스크린 상위 관찰 종목: ${[...new Set(leaders)].slice(0, 8).join(", ")}.` : `동일 기준일 리더십 스크린 JSON이 있습니다: ${path.basename(jsonPath)}.`;
    } catch {
      return `동일 기준일 리더십 스크린 파일이 있습니다: ${path.basename(jsonPath)}.`;
    }
  }
  return `동일 기준일 리더십 스크린 문서가 있습니다: ${path.basename(mdPath)}.`;
}

// Window a bit of text after the index name. Excludes only hard sentence
// boundaries (newline / 。) — NOT the ASCII period, so decimals like "7.9%" and
// the "급락" that follows stay inside the segment.
function marketDirection(text, indexName) {
  const pattern = new RegExp(`${indexName}[^\\n。]{0,70}`, "i");
  let segment = text.match(pattern)?.[0] || "";
  const otherIndex = indexName === "코스피" ? "코스닥" : "코스피";
  const otherAt = segment.indexOf(otherIndex);
  if (otherAt > 0) segment = segment.slice(0, otherAt);
  if (/급락|폭락|↓/i.test(segment)) return "약세";
  if (/급등|강세|상승|반등|회복|후끈|랠리|↑/i.test(segment)) return "강세";
  if (/하락|약세|약보합|내린|밀리|투매/i.test(segment)) return "약세";
  return "";
}

function percentMove(text, indexName) {
  const pattern = new RegExp(`${indexName}[^\\n。]{0,70}`, "i");
  let segment = text.match(pattern)?.[0] || "";
  const otherIndex = indexName === "코스피" ? "코스닥" : "코스피";
  const otherAt = segment.indexOf(otherIndex);
  if (otherAt > 0) segment = segment.slice(0, otherAt);
  return segment.match(/(\d+(?:\.\d+)?%)\s*(?:대\s*)?(?:급등|상승|강세|↑)?/i)?.[1] || "";
}

function titleEventPhrase(topText, combined) {
  const text = `${topText}\n${combined}`;
  const hasKospi = /코스피/i.test(text);
  const hasKosdaq = /코스닥/i.test(text);
  if (hasKospi && hasKosdaq) {
    const kospiDirection = marketDirection(text, "코스피");
    const kosdaqDirection = marketDirection(text, "코스닥");
    const kosdaqPercent = percentMove(text, "코스닥");
    const kospi = kospiDirection === "약세" ? "코스피 약세" : (kospiDirection === "강세" ? "코스피 강세" : "코스피");
    const kosdaq = kosdaqPercent && kosdaqDirection === "강세"
      ? `코스닥 ${kosdaqPercent} 급등`
      : (kosdaqDirection === "약세" ? "코스닥 약세" : (kosdaqDirection === "강세" ? "코스닥 강세" : "코스닥"));
    return `${kospi}·${kosdaq}`;
  }
  if (hasKosdaq) {
    const percent = percentMove(text, "코스닥");
    const direction = marketDirection(text, "코스닥");
    if (percent && direction === "강세") return `코스닥 ${percent} 급등`;
    if (direction) return `코스닥 ${direction}`;
    return "코스닥 흐름";
  }
  if (hasKospi) {
    const direction = marketDirection(text, "코스피");
    if (direction) return `코스피 ${direction}`;
    return "코스피 흐름";
  }
  if (/환율|원화|달러/.test(topText)) return "환율 변수";
  if (/금리|국고채|채권/.test(topText)) return "금리 변수";
  if (/외국인|기관|수급/.test(topText)) return "수급 변화";
  return "한국 증시 주요 뉴스";
}

function titleSupportPhrase(combined, leadingTheme) {
  const supports = [];
  const add = value => {
    if (value && !supports.includes(value)) supports.push(value);
  };
  if (/외인|외국인/.test(combined) && /투매|순매도|매도/.test(combined)) add("외국인 매도");
  else if (/외국인|기관|수급|순매수|순매도/.test(combined)) add("수급");
  if (/환율|원화|달러|금리|국고채|채권|연준|FOMC/.test(combined)) add("금리·환율");
  if (/반도체|HBM|DRAM|D램|낸드|AI/.test(combined)) add("반도체");
  if (/바이오|제약|헬스케어/.test(combined)) add("바이오");
  if (/이차전지|배터리|전기차/.test(combined)) add("이차전지");
  if (/정책|정부|세제|상법|밸류업|공매도/.test(combined)) add("정책");
  if (/실적\s*시즌|어닝|분기\s*실적/.test(combined)) add("실적");
  const selected = supports.slice(0, 2);
  if (selected.length === 2) {
    const lastCode = selected[0].charCodeAt(selected[0].length - 1);
    const hasFinalConsonant = lastCode >= 0xac00 && lastCode <= 0xd7a3 && ((lastCode - 0xac00) % 28) !== 0;
    return `${selected[0]}${hasFinalConsonant ? "과" : "와"} ${selected[1]}`;
  }
  return selected[0] || leadingTheme || "업종 흐름";
}

function titleCandidates(data) {
  const date = data.asOfDate;
  const leadingTheme = data.themes?.[0]?.theme;
  const topNews = [...(data.marketNews || [])]
    .sort((a, b) => ((b.rankScore ?? newsRankScore(b)) - (a.rankScore ?? newsRankScore(a)))
      || ((Date.parse(b.publishedAt || "") || -Infinity) - (Date.parse(a.publishedAt || "") || -Infinity)))
    .slice(0, 4);
  const topText = `${topNews[0]?.headline || topNews[0]?.title || ""} ${topNews[0]?.description || ""}`;
  const combined = topNews.map(item => `${item.headline || item.title || ""} ${item.description || ""}`).join(" ");
  const event = titleEventPhrase(topText, combined);
  const support = titleSupportPhrase(combined, leadingTheme);
  return [
    `${date} ${event}: ${support} 점검`,
    `${date} 코스피·코스닥 뉴스 정리: 시장과 업종 흐름`,
    `${date} 한국 증시 데일리: ${leadingTheme || "시장 뉴스"} 흐름 체크`,
    `${date} 장 마감 후 읽는 한국 시장 핵심 뉴스`,
  ];
}

function renderDailyReport(data, options = {}) {
  assert(data.reportType === "kr-daily-market-news", "JSON reportType must be kr-daily-market-news");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(data.asOfDate), "Report requires YYYY-MM-DD asOfDate");
  const baseDir = options.baseDir || "analysis-example/kr-market";
  const leadership = findLeadershipSummary(data.asOfDate, baseDir);
  const titles = titleCandidates(data);
  const parts = [
    `# 한국 시장 데일리 뉴스 (${data.asOfDate})`,
    "",
    `- 기준일: ${data.asOfDate}`,
    `- 생성시각: ${data.generatedAt}`,
    `- 수집모드: ${data.sourceMode}`,
    "",
    "## 오늘 시장 한 줄",
    "",
    data.oneLine || "수집된 뉴스 흐름이 제한적입니다.",
  ];

  if (Array.isArray(data.warnings) && data.warnings.length) {
    parts.push("", "## 수집 경고", "", ...data.warnings.map(warning => `- ${warning}`));
  }

  parts.push("", "## 시장 주요 뉴스", "");
  if (data.marketNews?.length) parts.push(...data.marketNews.map(itemLine));
  else parts.push("- 같은 기준일의 시장 뉴스가 충분히 수집되지 않았습니다.");

  parts.push("", "## 업종/테마별 흐름", "");
  if (data.themes?.length) {
    parts.push("| 테마 | 대표 헤드라인 | 기사 수 |", "| --- | --- | ---: |");
    for (const theme of data.themes) {
      parts.push(`| ${escapePipe(theme.theme)} | ${escapePipe((theme.headlines || []).slice(0, 2).join(" / "))} | ${theme.count || theme.headlines?.length || 0} |`);
    }
  } else {
    parts.push("- 반복적으로 확인되는 업종/테마 키워드가 아직 제한적입니다.");
  }

  parts.push("## 공식 공시/자료", "");
  if (data.officialSources?.length) parts.push(...data.officialSources.map(itemLine));
  else parts.push("- 별도 공식 공시/자료 링크가 없습니다.");

  if (leadership) parts.push("", "## 리더십 스크린 요약", "", leadership);

  parts.push("", "## 블로그 제목 후보", "", ...titles.map(title => `- ${title}`));

  parts.push("", "## 출처", "");
  const allSources = dedupeSourcesByUrl([
    ...(data.marketNews || []),
    ...(data.sectorNews || []).flatMap(group => group.items || []),
    ...(data.officialSources || []),
  ].filter(item => item.url));
  if (allSources.length) parts.push(...allSources.map(itemLine));
  else parts.push("- 검증 가능한 URL 출처가 없습니다.");

  parts.push(
    "",
    "---",
    "",
    `기준일: ${data.asOfDate}`,
    "",
    "본 글은 공개된 뉴스와 공시성 자료를 바탕으로 작성한 개인 시장 정리이며, 특정 종목의 매수·매도를 권유하지 않습니다. 투자 판단과 그 결과에 대한 책임은 투자자 본인에게 있습니다.",
  );
  return `${normalizeText(parts.join("\n"))}\n`;
}

function sectorGroups(data) {
  const byName = new Map((data.sectorNews || []).map(group => [group.sector, group]));
  return DEFAULT_SECTORS.map(sector => byName.get(sector) || { sector, query: `한국증시 ${sector} 주식 뉴스`, items: [] });
}

function renderNaverPost(data, options = {}) {
  assert(data.reportType === "kr-daily-market-news", "JSON reportType must be kr-daily-market-news");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(data.asOfDate), "Report requires YYYY-MM-DD asOfDate");
  const baseDir = options.baseDir || "analysis-example/kr-market";
  const leadership = findLeadershipSummary(data.asOfDate, baseDir);
  const parts = [
    `# 한국 시장 데일리 뉴스 (${data.asOfDate})`,
  ];

  parts.push("", "## 시장 주요 요약", "");
  const summaryItems = naverSummaryItems(data);
  if (summaryItems.length) {
    for (const item of summaryItems) {
      parts.push(`${item.rank || ""}. ${item.summary || item.title}`.replace(/^\. /, ""));
    }
  } else {
    parts.push("1. 같은 기준일의 시장 뉴스가 충분히 수집되지 않았습니다.");
  }

  parts.push("", "## 시장 주요 뉴스", "");
  const marketNewsForCards = naverMarketNewsItems(data);
  if (marketNewsForCards.length) {
    marketNewsForCards.forEach((item, index) => {
      parts.push(`${index + 1}. ${item.headline || item.title || "제목 없음"}`, item.url, "");
    });
  } else {
    parts.push("같은 기준일의 시장 뉴스가 충분히 수집되지 않았습니다.");
  }

  parts.push("", "## 업종/테마별 흐름", "", "| 업종/테마 | 대표 뉴스 | 흐름 |", "| --- | --- | --- |");
  for (const group of sectorGroups(data)) {
    const uniqueItems = blogSectorItems(group, { limit: 1 });
    const titles = uniqueItems.map(representativeNewsLabel).filter(Boolean);
    const flow = titles.length ? `${titles.length}건 확인` : "특이 뉴스 제한적";
    parts.push(`| ${escapePipe(group.sector)} | ${escapePipe(titles.join(" / ") || "특이 뉴스 제한적")} | ${flow} |`);
  }

  parts.push("## 공식 공시/자료", "");
  if (data.officialSources?.length) {
    parts.push("| 내용 | 링크 |", "| --- | --- |", ...data.officialSources.map(sourceRow));
  } else {
    parts.push("별도 공식 공시/자료 링크가 없습니다.");
  }

  if (leadership) parts.push("", "## 리더십 스크린 요약", "", leadership);

  parts.push("", "## 출처", "", "| 내용 | 링크 |", "| --- | --- |");
  const allSources = naverSourceItems(data);
  if (allSources.length) parts.push(...allSources.map(sourceRow));
  else parts.push("| 검증 가능한 URL 출처가 없습니다. | - |");

  const collectionNotes = naverCollectionNotes(data);
  if (collectionNotes.length) {
    parts.push("", "### 수집 참고", "", collectionNotes.join(" "));
  }

  parts.push(
    "",
    "---",
    "",
    `기준일: ${data.asOfDate}`,
    "",
    "본 글은 공개된 뉴스와 공시성 자료를 바탕으로 작성한 개인 시장 정리이며, 특정 종목의 매수·매도를 권유하지 않습니다. 투자 판단과 그 결과에 대한 책임은 투자자 본인에게 있습니다.",
  );
  return `${normalizeText(parts.join("\n"))}\n`;
}

function buildPublishManifest({ data, reportPath, postPath, postMarkdown, category = null }) {
  const titles = titleCandidates(data);
  const linkCards = naverMarketNewsItems(data).map(item => item.url);
  return {
    schemaVersion: 1,
    contentType: "daily-market-news",
    status: "converted",
    source: {
      reportPath: path.resolve(reportPath),
      reportSha256: fileSha256(reportPath),
      asOfDate: data.asOfDate,
    },
    post: {
      company: "한국 시장",
      ticker: "",
      title: titles[0].slice(0, 100),
      issue: data.oneLine || "데일리 시장 뉴스",
      category,
      tags: ["한국증시", "코스피", "코스닥", "시장뉴스", data.asOfDate.replace(/-/g, "")].slice(0, 10),
      markdownPath: path.resolve(postPath),
      markdownSha256: sha256(postMarkdown),
      images: [],
      linkCards,
      thumbnail: null,
      publicationDate: data.asOfDate,
    },
    automation: {
      scheduledPublishAllowed: true,
      duplicateScope: "daily-market-news",
      duplicateDate: data.asOfDate,
    },
    prepare: null,
    publish: null,
  };
}

function main() {
  const args = parseArgs(process.argv);
  assert(args.json, "Usage: render-daily-report.js --json <daily-news.json> [--md-out path] [--post-out path] [--manifest-out path]");
  const jsonPath = path.resolve(args.json);
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const date = data.asOfDate;
  const baseDir = path.dirname(jsonPath);
  const mdOut = path.resolve(args["md-out"] || path.join(baseDir, `daily-news-${date}.md`));
  const postOut = path.resolve(args["post-out"] || path.join(baseDir, `naver-post-${date}.md`));
  const manifestOut = path.resolve(args["manifest-out"] || path.join(baseDir, `naver-publish-${date}.json`));
  const markdown = renderDailyReport(data, { baseDir });
  const postMarkdown = renderNaverPost(data, { baseDir });
  fs.mkdirSync(path.dirname(mdOut), { recursive: true });
  fs.writeFileSync(mdOut, markdown, "utf8");
  fs.mkdirSync(path.dirname(postOut), { recursive: true });
  fs.writeFileSync(postOut, postMarkdown, "utf8");
  const manifest = buildPublishManifest({ data, reportPath: mdOut, postPath: postOut, postMarkdown, category: args.category || null });
  writeJsonAtomic(manifestOut, manifest);
  process.stdout.write(`${JSON.stringify({ mdPath: mdOut, postPath: postOut, manifestPath: manifestOut, title: manifest.post.title }, null, 2)}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exit(1); }
}

module.exports = {
  buildPublishManifest,
  findLeadershipSummary,
  naverCollectionNotes,
  naverMarketNewsItems,
  naverSourceItems,
  naverSummaryItems,
  renderDailyReport,
  renderNaverPost,
  titleCandidates,
};
