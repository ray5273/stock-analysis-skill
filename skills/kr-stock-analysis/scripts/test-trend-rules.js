#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { assignPercentiles, isOrdinaryStockCandidate, parseCorpListTable } = require("./build-kr-universe-rs-cache");
const { evaluateTrendRules } = require("./kr-trend-rules");

const FIXTURE_DIR = path.resolve(__dirname, "..", "..", "..", "examples", "kr-stock-analysis", "trend-rule-fixtures");
const CHART_SAMPLE = path.resolve(__dirname, "..", "..", "..", "examples", "kr-stock-analysis", "chart-sample.json");

function loadFixtureConfigs() {
  return fs.readdirSync(FIXTURE_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), "utf8")));
}

function formatDate(offset) {
  const base = new Date(Date.UTC(2025, 0, 2 + offset));
  return base.toISOString().slice(0, 10);
}

function createBars(closes, volumes, name, ticker) {
  return {
    ticker,
    name,
    bars: closes.map((close, index) => ({
      date: formatDate(index),
      open: Number((close * 0.995).toFixed(2)),
      high: Number((close * 1.01).toFixed(2)),
      low: Number((close * 0.99).toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: volumes[index],
    })),
  };
}

function buildScenarioBars(config) {
  const closes = [];
  const volumes = [];

  for (let index = 0; index < 280; index += 1) {
    let close;
    let volume = 1000000;

    if (config.scenario === "strong-leader") {
      close = 40 + (index * 0.45);
      if (index > 250) {
        close += (index - 250) * 0.4;
      }
      volume = index === 279 ? 1800000 : 1050000;
    } else if (config.scenario === "near-high-stale") {
      if (index < 200) {
        close = 50 + (index * 0.42);
      } else {
        close = 134 - ((index - 200) * 0.03);
      }
      volume = index === 279 ? 900000 : 980000;
    } else if (config.scenario === "rebound-from-lows") {
      if (index < 170) {
        close = 150 - (index * 0.45);
      } else {
        close = 73.5 + ((index - 170) * 0.28);
      }
      volume = index === 279 ? 1100000 : 1000000;
    } else if (config.scenario === "weak-breakout-no-volume") {
      if (index < 210) {
        close = 60 + (index * 0.28);
      } else if (index < 260) {
        close = 118.8 + Math.sin((index - 210) / 6) * 1.2;
      } else {
        close = 120 + ((index - 260) * 0.22);
      }
      volume = index === 279 ? 700000 : 1000000;
    } else {
      throw new Error(`Unknown scenario: ${config.scenario}`);
    }

    closes.push(close);
    volumes.push(volume);
  }

  return createBars(closes, volumes, config.name, config.ticker);
}

function writeTempCache(entries) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kr-rs-cache-"));
  const cachePath = path.join(tempDir, "cache.json");
  fs.writeFileSync(cachePath, `${JSON.stringify({
    date: "2026-04-11",
    entries,
  }, null, 2)}\n`);
  return cachePath;
}

function testUniverseHelpers() {
  assert.equal(isOrdinaryStockCandidate({ name: "삼성전자" }), true);
  assert.equal(isOrdinaryStockCandidate({ name: "삼성전자우" }), false);
  assert.equal(isOrdinaryStockCandidate({ name: "한화리츠" }), false);
  assert.equal(isOrdinaryStockCandidate({ name: "ABC스팩" }), false);

  const ranked = assignPercentiles([
    { ticker: "1", rsRawScore: 0.9 },
    { ticker: "2", rsRawScore: 0.6 },
    { ticker: "3", rsRawScore: 0.4 },
    { ticker: "4", rsRawScore: 0.2 },
    { ticker: "5", rsRawScore: 0.1 },
  ]);
  const byTicker = Object.fromEntries(ranked.map((entry) => [entry.ticker, entry.rsPercentile]));
  assert(byTicker["1"] > byTicker["2"]);
  assert(byTicker["2"] > byTicker["3"]);
  assert(byTicker["3"] > byTicker["4"]);

  const parsed = parseCorpListTable(`
    <table>
      <tr>
        <th>\ud68c\uc0ac\uba85</th><th>\uc2dc\uc7a5\uad6c\ubd84</th><th>\uc885\ubaa9\ucf54\ub4dc</th><th>\uc5c5\uc885</th><th>\uc8fc\uc694\uc81c\ud488</th><th>\uc0c1\uc7a5\uc77c</th><th>\uacb0\uc0b0\uc6d4</th>
      </tr>
      <tr>
        <td>\ucf00\uc774\ubc45\ud06c</td><td>\uc720\uac00</td><td>279570</td><td>\uc740\ud589 \ubc0f \uc800\ucd95\uae30\uad00</td><td>\uc740\ud589</td><td>2026-03-05</td><td>12\uc6d4</td>
      </tr>
    </table>
  `);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, "\ucf00\uc774\ubc45\ud06c");
  assert.equal(parsed[0].marketCategory, "\uc720\uac00");
  assert.equal(parsed[0].ticker, "279570");
}

function testFixtures() {
  const configs = loadFixtureConfigs();
  const rsCachePath = writeTempCache([
    { ticker: "111111", rsPercentile: 95 },
    { ticker: "222222", rsPercentile: 82 },
    { ticker: "333333", rsPercentile: 28 },
    { ticker: "444444", rsPercentile: 78 },
  ]);

  for (const config of configs) {
    const data = buildScenarioBars(config);
    const result = evaluateTrendRules(data, rsCachePath);

    assert.equal(result.summary.minervini.status, config.expected.minervini, `${config.scenario}: minervini mismatch`);
    if (result.summary.leadership.grade) {
      assert.equal(result.summary.leadership.grade, config.expected.leadershipGrade, `${config.scenario}: leadership grade mismatch`);
    }

    if (config.scenario === "near-high-stale") {
      const recencyComponent = result.summary.leadership.components.find((item) => item.label === "최근 신고가 recency");
      assert(recencyComponent.points <= 10);
    }
    if (config.scenario === "weak-breakout-no-volume") {
      const trendVolumeComponent = result.summary.leadership.components.find((item) => item.label === "추세/거래량 확인");
      assert.equal(trendVolumeComponent.points, 10);
    }
  }
}

function testPartialWithoutRsCache() {
  const sample = JSON.parse(fs.readFileSync(CHART_SAMPLE, "utf8"));
  const result = evaluateTrendRules(sample);
  assert.equal(result.summary.minervini.status, "incomplete");
  assert.equal(result.summary.leadership.status, "partial");
  assert(result.markdown.includes("RS percentile unavailable"));
}

function testExistingExampleSample() {
  const sample = JSON.parse(fs.readFileSync(CHART_SAMPLE, "utf8"));
  const rsCachePath = writeTempCache([{ ticker: "005930", rsPercentile: 88 }]);
  const result = evaluateTrendRules(sample, rsCachePath);
  assert(result.markdown.includes("### Rule Screen"));
  assert.equal(result.summary.rsCacheDate, "2026-04-11");
}

function main() {
  testUniverseHelpers();
  testFixtures();
  testPartialWithoutRsCache();
  testExistingExampleSample();
  console.log("test-trend-rules: ok");
}

main();
