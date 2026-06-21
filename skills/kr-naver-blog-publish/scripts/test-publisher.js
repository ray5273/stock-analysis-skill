#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildPost } = require("./memo-to-post");
const { editorBody, prepare, publish } = require("./publisher");
const { readJson, writeJsonAtomic } = require("./lib");
const sourceDir = path.resolve(__dirname, "../../../analysis-example/kr/SOOP");

assert(!editorBody("# 제목\n\n## 결론\n\n**강조**\n\n![차트](chart.png)").includes("#"));
assert(!editorBody("# 제목\n\n본문").includes("제목"));
assert(editorBody("# 제목\n\n## 결론\n\n**강조**").includes("결론\n\n강조"));

function makeCase(fixtureOverrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kr-naver-publisher-test-"));
  const companyDir = path.join(root, "SOOP");
  fs.cpSync(sourceDir, companyDir, { recursive: true });
  const memo = path.join(companyDir, "memo.md");
  const post = path.join(companyDir, "naver-post.md");
  const manifest = path.join(companyDir, "naver-publish.json");
  const fixture = path.join(companyDir, "fixture.json");
  fs.writeFileSync(fixture, `${JSON.stringify({ loggedIn: true, ...fixtureOverrides }, null, 2)}\n`);
  const converted = buildPost({ markdown: fs.readFileSync(memo, "utf8"), memoPath: memo });
  fs.writeFileSync(post, converted.postMarkdown);
  converted.manifest.post.markdownPath = post;
  writeJsonAtomic(manifest, converted.manifest);
  return { root, companyDir, memo, post, manifest, fixture };
}

{
  const test = makeCase();
  const prepared = prepare({ fixture: test.fixture }, test.manifest, readJson(test.manifest));
  assert(prepared.approvalToken);
  const published = publish({ fixture: test.fixture, token: prepared.approvalToken, "confirm-public": "yes" }, test.manifest, readJson(test.manifest));
  assert.strictEqual(published.status, "published");
  assert.throws(() => publish({ fixture: test.fixture, token: prepared.approvalToken, "confirm-public": "yes" }, test.manifest, readJson(test.manifest)), /already published/);
}

{
  const test = makeCase({ loggedIn: false });
  assert.throws(() => prepare({ fixture: test.fixture }, test.manifest, readJson(test.manifest)), /login expired/);
  assert.strictEqual(JSON.parse(fs.readFileSync(test.fixture)).publicClicked, undefined);
}

{
  const test = makeCase({ missingSelectors: ["body"] });
  assert.throws(() => prepare({ fixture: test.fixture }, test.manifest, readJson(test.manifest)), /selector unavailable: body/);
}

{
  const test = makeCase({ imageUploadFailures: [2] });
  assert.throws(() => prepare({ fixture: test.fixture }, test.manifest, readJson(test.manifest)), /upload failed/);
  assert.strictEqual(JSON.parse(fs.readFileSync(test.fixture)).publicClicked, undefined);
}

{
  const test = makeCase();
  const prepared = prepare({ fixture: test.fixture }, test.manifest, readJson(test.manifest));
  assert.throws(() => publish({ fixture: test.fixture, token: `${prepared.approvalToken}x`, "confirm-public": "yes" }, test.manifest, readJson(test.manifest)), /token does not match/);
  assert.strictEqual(JSON.parse(fs.readFileSync(test.fixture)).publicClicked, undefined);
}

{
  const test = makeCase();
  const prepared = prepare({ fixture: test.fixture }, test.manifest, readJson(test.manifest));
  fs.appendFileSync(test.memo, "\nsource changed\n");
  assert.throws(() => publish({ fixture: test.fixture, token: prepared.approvalToken, "confirm-public": "yes" }, test.manifest, readJson(test.manifest)), /Source memo changed/);
  assert.strictEqual(JSON.parse(fs.readFileSync(test.fixture)).publicClicked, undefined);
}

console.log("publisher fixture tests passed");
