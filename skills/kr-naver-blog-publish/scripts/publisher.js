#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  assert,
  contentFingerprint,
  fileSha256,
  normalizeText,
  readJson,
  sha256,
  writeJsonAtomic,
} = require("./lib");

const TOKEN_TTL_MS = 30 * 60 * 1000;
const WRITE_URL = "https://blog.naver.com/GoBlogWrite.naver";
const SELECTORS = {
  title: [
    ".se-documentTitle .se-text-paragraph",
    "textarea.se_textarea",
    "textarea[placeholder*='제목']",
    "[contenteditable='true'][data-placeholder*='제목']",
  ],
  body: [
    ".se-component.se-text .se-text-paragraph",
    ".se-component-content [contenteditable='true']",
    ".se-section-text",
    "[contenteditable='true'][data-placeholder*='본문']",
  ],
  imageInput: ["input[data-kr-naver-image-input]", "input[type='file'][accept*='image']", "input[type='file'][multiple]"],
  saveDraft: ["button[class*='save_btn']", "button[class*='SaveButton']", "button[data-click-area*='save']"],
  publishOpen: ["button[class*='publish_btn']", "button[class*='PublishButton']", "button[data-click-area*='publish']"],
  publishConfirm: ["button[class*='confirm_btn']", "button[class*='ConfirmButton']", "button[data-click-area*='confirm']"],
  tags: ["input[placeholder*='태그']", "input[class*='tag_input']"],
  category: ["select[class*='category']", "select[name*='category']"],
};

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) { args._.push(value); continue; }
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[value.slice(2)] = true;
    else { args[value.slice(2)] = next; i += 1; }
  }
  return args;
}

function editorBody(markdown) {
  return normalizeText(markdown
    .replace(/^#\s+.+?[ \t]*$/m, "")
    .replace(/^!\[[^\]]*]\([^)]+\.png(?:\?[^)]*)?\)\s*$/gim, "")
    .replace(/^#{2,6}\s+(.+?)[ \t]*$/gm, "$1")
    .replace(/^---+[ \t]*$/gm, "────────")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, "$1 ($2)"));
}

function verifyArtifacts(manifest) {
  assert(manifest.schemaVersion === 1, "Unsupported manifest schemaVersion");
  assert(manifest.status !== "published", "Manifest is already published; duplicate publish blocked");
  assert(fs.existsSync(manifest.source.memoPath), `Source memo missing: ${manifest.source.memoPath}`);
  assert(fileSha256(manifest.source.memoPath) === manifest.source.memoSha256, "Source memo changed after conversion; reconvert before preparing");
  assert(fs.existsSync(manifest.post.markdownPath), `Post markdown missing: ${manifest.post.markdownPath}`);
  assert(fileSha256(manifest.post.markdownPath) === manifest.post.markdownSha256, "Post markdown changed after conversion; reconvert before preparing");
  for (const image of manifest.post.images) {
    assert(fs.existsSync(image.absolutePath), `Image missing: ${image.relativePath}`);
    assert(fileSha256(image.absolutePath) === image.sha256, `Image changed after conversion: ${image.relativePath}`);
  }
}

class FixtureDriver {
  constructor(filePath) {
    this.filePath = filePath;
    this.fixture = readJson(filePath);
    this.fixture.editor ||= { title: "", body: "", images: 0, tags: [], category: null, saved: false };
  }
  persist() { writeJsonAtomic(this.filePath, this.fixture); }
  openEditor() {}
  openPreparedDraft() {}
  isLoggedIn() { return this.fixture.loggedIn !== false; }
  setTitle(value) { this.requireSelector("title"); this.fixture.editor.title = value; this.persist(); }
  setBody(value) { this.requireSelector("body"); this.fixture.editor.body = value; this.persist(); }
  uploadImage(filePath, index) {
    this.requireSelector("imageInput");
    if ((this.fixture.imageUploadFailures || []).includes(index)) throw new Error(`Fixture image upload failed at index ${index}`);
    assert(fs.existsSync(filePath), `Fixture upload path missing: ${filePath}`);
    this.fixture.editor.images += 1; this.persist();
  }
  setCategory(value) { this.requireSelector("category"); this.fixture.editor.category = value; this.persist(); }
  setTags(values) { this.requireSelector("tags"); this.fixture.editor.tags = values; this.persist(); }
  saveDraft() { this.requireSelector("saveDraft"); this.fixture.editor.saved = true; this.persist(); }
  inspect() { return { title: this.fixture.editor.title, body: this.fixture.editor.body, imageCount: this.fixture.editor.images }; }
  screenshot(filePath) { fs.writeFileSync(filePath, Buffer.from("fixture preview\n", "utf8")); }
  editorUrl() { return this.fixture.editorUrl || "https://blog.naver.com/GoBlogWrite.naver?fixtureDraft=1"; }
  openPublishLayer() { this.requireSelector("publishOpen"); this.fixture.publishLayerOpen = true; this.persist(); }
  publish() {
    this.requireSelector("publishConfirm");
    assert(this.fixture.publishLayerOpen, "Fixture publish layer was not opened");
    this.fixture.publicClicked = true;
    this.fixture.publishedUrl ||= "https://blog.naver.com/fixture/123456789";
    this.persist();
  }
  publishedUrl() { return this.fixture.publishedUrl; }
  requireSelector(name) {
    if ((this.fixture.missingSelectors || []).includes(name)) throw new Error(`Required selector unavailable: ${name}`);
  }
}

class GstackDriver {
  constructor() {
    const browse = require("../../kr-naver-browse/scripts/browse-naver.js");
    this.bin = browse.resolveBrowseBinary();
    this.env = {
      ...process.env,
      CHROMIUM_PROFILE: process.env.NAVER_PUBLISH_PROFILE || path.join(os.homedir(), ".gstack", "kr-naver-blog-publish", "chromium-profile"),
    };
  }
  run(args, timeout = 30_000) {
    const commandArgs = args.includes("--headed") ? args : ["--headed", ...args];
    return execFileSync(this.bin, commandArgs, { encoding: "utf8", env: this.env, timeout, maxBuffer: 10 * 1024 * 1024 }).trim();
  }
  js(expression) { return this.run(["js", expression]); }
  enterEditorFrame() {
    const hasMainFrame = /true/i.test(this.js("Boolean(document.querySelector('#mainFrame'))"));
    if (hasMainFrame) {
      this.run(["frame", "#mainFrame"]);
      this.run(["wait", "--load"], 15_000);
    }
  }
  gotoAllowRedirectAbort(url) {
    try {
      this.run(["goto", url]);
    } catch (error) {
      if (!/net::ERR_ABORTED/.test(error.message)) throw error;
    }
  }
  findSelector(name) {
    const candidates = SELECTORS[name];
    const expression = `(() => { const xs=${JSON.stringify(candidates)}; const selector=xs.find(x => document.querySelector(x)); if (!selector) return ''; const e=document.querySelector(selector); if (e.id) return '#' + CSS.escape(e.id); if (document.querySelectorAll(selector).length === 1) return selector; e.setAttribute('data-kr-naver-selector', ${JSON.stringify(name)}); return '[data-kr-naver-selector=${name}]'; })()`;
    const found = this.js(expression).replace(/^"|"$/g, "");
    if (!found) {
      const diagnostic = this.js(`JSON.stringify([...document.querySelectorAll('textarea,input,[contenteditable],[class*=title],[class*=document]')].slice(0,80).map(e => ({tag:e.tagName,id:e.id,class:String(e.className || ''),placeholder:e.getAttribute('placeholder'),contenteditable:e.getAttribute('contenteditable'),role:e.getAttribute('role')})))`);
      throw new Error(`Required Naver SmartEditor selector unavailable: ${name}\nCandidates: ${diagnostic}`);
    }
    return found;
  }
  markButtonByText(role, labels) {
    const expression = `(() => { const labels=${JSON.stringify(labels)}; const e=[...document.querySelectorAll('button')].find(x => labels.includes((x.innerText || x.textContent || '').trim())); if (!e) return ''; e.setAttribute('data-kr-naver-role', ${JSON.stringify(role)}); return 'button[data-kr-naver-role=${role}]'; })()`;
    return this.js(expression).replace(/^"|"$/g, "");
  }
  replaceEditorText(selector, value) {
    const result = this.js(`navigator.clipboard.writeText(${JSON.stringify(value)}).then(() => 'clipboard-ok').catch(error => 'clipboard-error:' + error.message)`);
    assert(/clipboard-ok/i.test(result), `Browser clipboard rejected text insertion for ${selector}: ${result}`);
    this.run(["press", process.platform === "darwin" ? "Meta+V" : "Control+V"], 60_000);
  }
  openEditor() { this.run(["frame", "main"]); this.gotoAllowRedirectAbort(process.env.NAVER_BLOG_WRITE_URL || WRITE_URL); this.run(["wait", "--load"], 15_000); this.enterEditorFrame(); }
  openPreparedDraft(url) { assert(url, "Prepared draft URL is missing"); this.run(["frame", "main"]); this.gotoAllowRedirectAbort(url); this.run(["wait", "--load"], 15_000); this.enterEditorFrame(); }
  isLoggedIn() {
    const url = this.js("location.href");
    const text = this.run(["text"]);
    return !/nid\.naver\.com|captcha|자동입력 방지|로그인이 필요|로그인해 주세요/i.test(`${url}\n${text.slice(0, 3000)}`);
  }
  setTitle(value) { const selector = this.findSelector("title"); this.run(["click", selector]); this.replaceEditorText(selector, value); }
  setBody(value) { const selector = this.findSelector("body"); this.run(["click", selector]); this.replaceEditorText(selector, value); }
  uploadImage(filePath) {
    let input = this.js(`(() => { const xs=${JSON.stringify(SELECTORS.imageInput)}; return xs.find(x => document.querySelector(x)) || ''; })()`).replace(/^"|"$/g, "");
    if (!input) {
      assert(/true/i.test(this.js("Boolean(document.querySelector('.se-image-toolbar-button'))")), "Required Naver SmartEditor image button unavailable");
      this.js(`(() => { const original=HTMLInputElement.prototype.click; HTMLInputElement.prototype.click=function() { if (this.type === 'file') { this.setAttribute('data-kr-naver-image-input', 'true'); document.body.appendChild(this); HTMLInputElement.prototype.click=original; return; } return original.call(this); }; return true; })()`);
      this.run(["click", ".se-image-toolbar-button"]);
      input = this.findSelector("imageInput");
    }
    this.run(["upload", input, filePath], 60_000);
  }
  setCategory(value) { this.run(["select", this.findSelector("category"), value]); }
  setTags(values) { this.run(["fill", this.findSelector("tags"), values.join(",")]); }
  saveDraft() {
    const selector = this.markButtonByText("saveDraft", ["저장"]) || this.findSelector("saveDraft");
    this.run(["click", selector]); this.run(["wait", "--networkidle"], 20_000);
  }
  readElement(selector) {
    return this.js(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); return e ? (e.value ?? e.innerText ?? e.textContent ?? '') : ''; })()`).replace(/^"|"$/g, "");
  }
  inspect() {
    const title = this.readElement(this.findSelector("title"));
    const bodySelector = this.findSelector("body");
    const body = this.readElement(bodySelector);
    const imageCount = Number(this.js(`document.querySelectorAll('.se-main-container .se-module-image img, .se-content .se-image-resource').length`)) || 0;
    return { title, body, imageCount };
  }
  screenshot(filePath) { this.run(["screenshot", filePath], 60_000); }
  editorUrl() { return this.js("location.href").replace(/^"|"$/g, ""); }
  openPublishLayer() {
    const selector = this.markButtonByText("publishOpen", ["발행"]) || this.findSelector("publishOpen");
    this.run(["click", selector]);
  }
  publish() {
    const selector = this.markButtonByText("publishConfirm", ["발행"]) || this.findSelector("publishConfirm");
    this.run(["click", selector]); this.run(["wait", "--networkidle"], 30_000);
  }
  publishedUrl() { return this.js("location.href").replace(/^"|"$/g, ""); }
}

function createDriver(args) { return args.fixture ? new FixtureDriver(path.resolve(args.fixture)) : new GstackDriver(); }

function validateEditor(inspected, manifest, expectedBody) {
  assert(normalizeText(inspected.title) === normalizeText(manifest.post.title), "Editor title does not match manifest");
  assert(normalizeText(inspected.body) === normalizeText(expectedBody), "Editor body does not match generated post");
  assert(Number(inspected.imageCount) === manifest.post.images.length, `Editor image count mismatch: expected ${manifest.post.images.length}, got ${inspected.imageCount}`);
  assert(/(?:^|\n)출처(?:\n|$)/.test(expectedBody), "Generated post has no Sources section");
  assert(expectedBody.includes("매수·매도를 권유하지 않습니다"), "Generated post has no investment disclaimer");
  return contentFingerprint({ title: inspected.title, body: inspected.body, imageCount: inspected.imageCount });
}

function prepare(args, manifestPath, manifest) {
  verifyArtifacts(manifest);
  const driver = createDriver(args);
  const markdown = fs.readFileSync(manifest.post.markdownPath, "utf8");
  const body = editorBody(markdown);
  driver.openEditor();
  assert(driver.isLoggedIn(), "Naver login expired, CAPTCHA detected, or manual authentication is required; public publish was not attempted");
  driver.setTitle(manifest.post.title);
  driver.setBody(body);
  for (let i = 0; i < manifest.post.images.length; i += 1) driver.uploadImage(manifest.post.images[i].absolutePath, i + 1);
  driver.saveDraft();
  const editorUrl = driver.editorUrl();
  driver.openPublishLayer();
  if (manifest.post.category) driver.setCategory(manifest.post.category);
  driver.setTags(manifest.post.tags);
  const inspected = driver.inspect();
  const fingerprint = validateEditor(inspected, manifest, body);
  const screenshotPath = path.resolve(args.screenshot || path.join(path.dirname(manifest.post.markdownPath), "naver-preview.png"));
  driver.screenshot(screenshotPath);
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  manifest.status = "prepared";
  manifest.prepare = {
    preparedAt: new Date().toISOString(),
    expiresAt,
    screenshotPath,
    editorUrl,
    contentFingerprint: fingerprint,
    approvalTokenHash: sha256(`${token}:${manifest.source.memoSha256}:${manifest.post.markdownSha256}:${fingerprint}`),
    validation: { title: true, body: true, imageCount: true, sources: true, disclaimer: true },
  };
  writeJsonAtomic(manifestPath, manifest);
  return { status: "prepared", manifestPath, screenshotPath, approvalToken: token, expiresAt };
}

function publish(args, manifestPath, manifest) {
  assert(manifest.status !== "published", "Manifest is already published; duplicate publish blocked");
  assert(manifest.status === "prepared" && manifest.prepare, "Prepare must complete before publish");
  assert(args.token, "Publish requires --token from the latest prepare result");
  assert(args["confirm-public"] === "yes", "Publish requires --confirm-public yes after explicit user approval");
  assert(Date.now() <= Date.parse(manifest.prepare.expiresAt), "Approval token expired; run prepare again");
  verifyArtifacts(manifest);
  const expectedHash = sha256(`${args.token}:${manifest.source.memoSha256}:${manifest.post.markdownSha256}:${manifest.prepare.contentFingerprint}`);
  const actual = Buffer.from(expectedHash, "hex");
  const stored = Buffer.from(manifest.prepare.approvalTokenHash, "hex");
  assert(actual.length === stored.length && crypto.timingSafeEqual(actual, stored), "Approval token does not match the prepared draft");
  const driver = createDriver(args);
  driver.openPreparedDraft(manifest.prepare.editorUrl);
  assert(driver.isLoggedIn(), "Naver login expired or CAPTCHA detected; public publish was not attempted");
  const markdown = fs.readFileSync(manifest.post.markdownPath, "utf8");
  const inspected = driver.inspect();
  const fingerprint = validateEditor(inspected, manifest, editorBody(markdown));
  assert(fingerprint === manifest.prepare.contentFingerprint, "Editor content changed after prepare; public publish was not attempted");
  driver.openPublishLayer();
  driver.publish();
  const url = driver.publishedUrl();
  assert(/^https:\/\/blog\.naver\.com\//.test(url), `Unexpected published URL: ${url}`);
  manifest.status = "published";
  manifest.publish = { publishedAt: new Date().toISOString(), url, result: "published" };
  manifest.prepare.approvalTokenHash = null;
  writeJsonAtomic(manifestPath, manifest);
  return { status: "published", url, publishedAt: manifest.publish.publishedAt };
}

function main() {
  const args = parseArgs(process.argv);
  const action = args._[0];
  assert(action === "prepare" || action === "publish", "Usage: publisher.js <prepare|publish> --manifest <json> [--fixture <json>] [--token <token> --confirm-public yes]");
  assert(args.manifest, "--manifest is required");
  const manifestPath = path.resolve(args.manifest);
  const manifest = readJson(manifestPath);
  const result = action === "prepare" ? prepare(args, manifestPath, manifest) : publish(args, manifestPath, manifest);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exit(1); }
}

module.exports = { FixtureDriver, editorBody, prepare, publish, validateEditor, verifyArtifacts };
