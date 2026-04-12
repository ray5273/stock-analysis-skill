---
name: kr-naver-browse
description: Headless browser wrapper for Naver blog/search navigation. Use when another skill needs to fetch Naver search results, a blogger's post list, or a single blog post body. Wraps the gstack `browse` binary with Naver-specific URL normalization, retry on empty text extraction, and structured parsing helpers. Do not use for non-Naver sites — the URL rewriters assume Naver's PostView layout.
---

# Naver Blog Browser

Reusable headless browser helpers for Naver search and blog pages. Other Korean
stock skills (`kr-naver-blogger`, `kr-naver-insight`) depend on this skill for
navigation and text extraction. Treat this skill as the single place that knows
which Naver URLs actually render text in a headless browser.

## When To Use

- Another skill needs to search `search.naver.com` for blog posts about a
  company or ticker.
- Another skill needs the recent post list for a Naver blogger.
- Another skill needs the full text of a single Naver blog post.
- The user is asking you to read a Naver blog page and summarize it.

Do **not** use this skill for general web browsing. Use gstack `/browse` for
that. This wrapper exists only because Naver's blog routes are JS-heavy and
need a specific URL shape to return text at all.

## URL Patterns That Work

| Purpose | URL template |
|---|---|
| Blog search | `https://search.naver.com/search.naver?where=blog&query=<urlencoded>` |
| Recent posts | `https://blog.naver.com/PostList.naver?blogId=<id>&categoryNo=0` |
| Single post | `https://blog.naver.com/PostView.naver?blogId=<id>&logNo=<logNo>` |

Patterns that **do not** reliably render text in headless mode:

- `https://blog.naver.com/<id>` — returns an empty shell
- `https://blog.naver.com/<id>/<logNo>` — redirects through JS; text extraction
  often returns empty. Use `browse-naver.js`'s `normalizeNaverUrl()` to rewrite
  it into `PostView.naver?blogId=...&logNo=...` before visiting.

## How It Works

`scripts/browse-naver.js` is a Node module (no external deps) that resolves the
gstack `browse` binary in this order:

1. `$GSTACK_BROWSE_BIN` environment variable, if set
2. `~/.claude/skills/gstack/browse/dist/browse`
3. `browse` on `$PATH` (only if it is the gstack binary, not `xdg-open`)

Each helper spawns `browse` via `execFileSync` with a 30s timeout and a 5 MB
output buffer. Korean search terms are passed through `encodeURIComponent`. On
empty text extraction, helpers retry once after a 5 s wait before returning
`null`.

## Helpers Exposed

```js
const {
  resolveBrowseBinary,
  browseText,
  searchNaverBlog,
  readBlogPostList,
  readBlogPost,
  normalizeNaverUrl,
  parseNaverSearchResults,
} = require("../../kr-naver-browse/scripts/browse-naver.js");
```

- `resolveBrowseBinary()` → absolute path to the gstack browse binary, or
  throws with a clear install hint.
- `browseText(url, { timeoutMs })` → visits the URL, waits for the page to
  settle, returns the extracted text or `null` on failure.
- `searchNaverBlog(query, { max })` → returns an array of search result
  objects `{ blogId, title, snippet, date, url }`.
- `readBlogPostList(blogId)` → returns recent posts for a blogger as an array
  of `{ logNo, title, date }`.
- `readBlogPost(blogId, logNo)` → returns `{ title, date, text, url }` or
  `null`.
- `normalizeNaverUrl(url)` → rewrites `blog.naver.com/<id>/<logNo>` variants
  into the `PostView.naver` shape.
- `parseNaverSearchResults(text)` → pure parser over raw search text, useful
  for testing.

## Operating Rules

1. **Always normalize URLs** before calling `browseText`. A raw
   `blog.naver.com/<id>/<logNo>` URL will silently return empty text.
2. **Sleep 1 second between requests** to the same Naver host. The helpers do
   this automatically; if you call `browseText` directly in a loop, enforce
   the delay yourself.
3. **Retry once on empty extraction**, then give up. Do not hammer the page —
   Naver is quick to rate-limit.
4. **Never scrape personal info** (subscriber lists, contact details). Only
   public post content and public metadata (title, date, logNo).
5. **Truncate text to 3000 chars** before returning post bodies up the stack.
   Callers never need the full post for summarization and the truncation keeps
   downstream LLM context small.
6. **Fail loud, not silent**. If the `browse` binary is missing, throw with
   the install hint (`git clone ... gstack && ./setup --team`). Do not fall
   back to `fetch` — dynamic pages will not render.

## Smoke Test

```bash
node skills/kr-naver-browse/scripts/browse-naver.js --test
```

The `--test` flag runs a single search for `"엘앤에프 투자"`, prints the first
three results, and exits non-zero if the browse binary is missing or returns
empty text both times.
