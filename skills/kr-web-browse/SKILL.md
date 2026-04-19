---
name: kr-web-browse
description: Headless browser wrapper for generic (non-Naver) Korean-facing web pages. Use when another skill needs to fetch an arbitrary HTML page's text or links, or download a binary file (PDF) from a public URL. Wraps the skill-local gstack `browse` binary from `kr-naver-browse` and adds a Node-stdlib `https` downloader with redirect handling. Do not use for Naver blog or Naver search pages — use `kr-naver-browse` instead because it knows Naver's PostView iframe layout.
---

# Generic Web Browser

Reusable headless browser helpers for generic non-Naver web pages. Used by
`kr-analyst-report-discover` (Hankyung Consensus list pages, Naver Finance
research list pages) and `kr-analyst-report-fetch` (direct PDF download).

This skill reuses the gstack `browse` binary vendored under
`kr-naver-browse/vendor/gstack/` rather than vendoring its own copy — we do
not want two gstack builds fighting over the same `BROWSE_STATE_FILE`. Install
`kr-naver-browse` first so the binary exists, then install this skill.

## When To Use

- Another skill needs to fetch the rendered text of a public web page that is
  not on Naver.
- Another skill needs to extract anchor links from a public web page.
- Another skill needs to download a direct PDF URL to disk.

Do **not** use this skill for:

- Naver blog, Naver search, Naver PostView / PostList pages. Those need
  Naver-specific URL rewrites — use `kr-naver-browse`.
- Pages that require authentication or cookies. v1 does not support cookie
  jars. If a fetch returns a login wall, treat the page as unavailable.

## Exports

`scripts/browse-web.js` exposes (Node stdlib only, no npm):

| Export | What it does |
|---|---|
| `resolveBrowseBinary()` | Locates the gstack `browse` binary via the same resolver `kr-naver-browse` uses (`$GSTACK_BROWSE_BIN`, skill-local vendor dir, `$CLAUDE_HOME`/`$CODEX_HOME` install dir). Throws if none found. |
| `browseText(url, opts)` | Runs `goto`, `wait --load`, `text`; returns trimmed text or `null` if extraction was empty after one retry. |
| `browseLinks(url, opts)` | Same shape as `browseText` but for the `links` command. Returns `"text → url"` lines. |
| `downloadFile(url, destPath, opts)` | Pure Node `https.get` download with up-to-5 redirects and gzip/deflate handling. Writes to `destPath`. Does NOT use the browse binary. |

`opts` supports `{ timeoutMs, verbose }`. `downloadFile` adds `{ maxRedirects, headers }`.

## Operating Rules

1. **Enforce the 1-second inter-request delay** between `browseText` /
   `browseLinks` calls. The gstack binary is shared with `kr-naver-browse`
   and both skills agree on the delay.
2. **Download PDFs via Node `https`, not via the browse binary.** Headless
   Chromium cannot reliably stream binary content back to stdout. Use
   `downloadFile` for direct `.pdf` URLs.
3. **Never use this module for Naver URLs.** There is no URL rewriter here —
   Naver's desktop PostView routes will return empty.
4. **Fail loud** if the browse binary cannot be resolved. Do not fall back to
   a generic fetch library — the skill chain expects rendered text from a
   headless browser.
5. **Do not persist cookies.** v1 treats every request as anonymous. A gated
   page should be recorded upstream as `requiresAuth: true` and skipped.

## Invocation

This skill is not meant to be invoked directly. Other skills `require` it:

```js
const { browseText, downloadFile } = require(
  "../../kr-web-browse/scripts/browse-web.js"
);

const html = browseText("https://consensus.hankyung.com/...");
downloadFile("https://.../report.pdf", "./tmp/report.pdf");
```

A smoke test is available:

```bash
node skills/kr-web-browse/scripts/browse-web.js --test
```

It will fetch `https://example.com` via the browse binary and download a
small public file to verify the binary + downloader both work.
