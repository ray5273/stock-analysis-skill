---
name: kr-naver-browse
description: Headless browser wrapper for Naver blog/search navigation. Use when another skill needs to fetch Naver search results, a blogger's post list, or a single blog post body. Wraps the skill-local gstack `browse` binary with Naver-specific URL normalization, retry on empty text extraction, and structured parsing helpers. Do not use for non-Naver sites because the URL rewriters assume Naver's PostView layout.
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

- `https://blog.naver.com/<id>` returns an empty shell
- `https://blog.naver.com/<id>/<logNo>` redirects through JS and text
  extraction often returns empty. Use `browse-naver.js`'s
  `normalizeNaverUrl()` to rewrite it into
  `PostView.naver?blogId=...&logNo=...` before visiting.

## How It Works

`scripts/browse-naver.js` is a Node module (no external deps) that resolves a
gstack `browse` binary in this order:

1. `$GSTACK_BROWSE_BIN` environment variable, if set
2. A skill-local vendored binary at `vendor/gstack/browse/dist/browse`
3. (Mac/Linux only) The binary installed under the Codex skill location:
   `$CODEX_HOME/skills/kr-naver-browse/vendor/gstack/browse/dist/browse`
   (default `~/.codex/skills/kr-naver-browse/vendor/gstack/browse/dist/browse`)
4. (Mac/Linux only) A gstack Codex skill installation:
   `$CODEX_HOME/skills/gstack/browse/dist/browse`
5. (Mac/Linux only) The binary installed under the Claude Code skill location:
   `$CLAUDE_HOME/skills/kr-naver-browse/vendor/gstack/browse/dist/browse`
   (default `~/.claude/skills/kr-naver-browse/vendor/gstack/browse/dist/browse`)
6. (Mac/Linux only) A gstack Claude skill installation:
   `$CLAUDE_HOME/skills/gstack/browse/dist/browse`

Steps 3–6 allow running scripts directly from the source repo when the skill
has been installed into Codex or Claude Code but the repo's own `vendor/`
directory has not been built.
Each helper spawns the resolved binary via `execFileSync` with a 30s timeout
and a 5 MB output buffer. Korean search terms are passed through
`encodeURIComponent`. On
empty text extraction, helpers retry once after a 5 s wait before returning
`null`.

`kr-naver-browse` ships a `scripts/post-install.(sh|ps1)` hook. When the skill
is installed through this repo's `scripts/install-*.{sh,ps1}` helpers, the hook
builds or refreshes gstack under the installed skill's `vendor/gstack/`, ensures
`bun` can produce runnable compiled executables (trying Homebrew, npm, then the
official Bun installer pinned by `BUN_VERSION_TAG`, default `bun-v1.3.10`), runs
`bun install`, `bun run build`, Linux `bunx playwright install-deps chromium`
unless `SKILL_INSTALL_SKIP_LINUX_DEPS=1`, and `bunx playwright install chromium`, strips
vendored `SKILL.md` files so Codex does not recursively load gstack's own skill
pack, and verifies that `vendor/gstack/browse/dist/browse` can launch and
navigate to `https://example.com`.

Install paths:

- Default Codex install: `bash ./scripts/install-all-skills.sh`
- macOS Codex recovery path: `bash ./scripts/install-codex-mac-naver.sh`

On macOS Codex installs under `$CODEX_HOME/skills/` (default
`~/.codex/skills/`), if the compiled binary build finishes but the smoke test
still fails, the hook automatically falls back to a Bun source wrapper at the
same final path: `vendor/gstack/browse/dist/browse`. The higher-level Naver
skills keep calling the same path either way.

Set `SKILL_INSTALL_SKIP_HOOKS=1` to skip this bootstrap, set
`SKILL_INSTALL_SKIP_LINUX_DEPS=1` to skip automatic Linux/WSL system dependency
installation, set `SKILL_INSTALL_AUTO_BUN=0` to avoid automatic `bun` installation, set
`SKILL_INSTALL_FORCE_CODEX_MAC=1` to force the macOS Codex fallback path during
install, or set `GSTACK_BROWSE_BIN` to an absolute existing gstack `browse`
binary path.

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
  fetchRelatedQueries,
  extractBlogIdRefs,
} = require("../../kr-naver-browse/scripts/browse-naver.js");
```

- `resolveBrowseBinary()` returns the absolute path to the gstack `browse`
  binary, or throws with a clear install hint.
- `browseText(url, { timeoutMs })` visits the URL, waits for the page to
  settle, and returns the extracted text or `null` on failure.
- `searchNaverBlog(query, { max })` returns an array of search result objects
  `{ blogId, title, snippet, date, url }`.
- `readBlogPostList(blogId)` returns recent posts for a blogger as an array of
  `{ logNo, title, date }`.
- `readBlogPost(blogId, logNo)` returns `{ title, date, text, url }` or
  `null`.
- `normalizeNaverUrl(url)` rewrites `blog.naver.com/<id>/<logNo>` variants
  into the `PostView.naver` shape.
- `parseNaverSearchResults(text)` is a pure parser over raw search text,
  useful for testing.
- `fetchRelatedQueries(company)` scrapes the 연관검색어 block from the blog
  search page for `company` and returns `[{ text, nickname, wholeQuery }]`
  — the authoritative Naver-side signal for "who else is searched alongside
  this ticker". Used by `kr-naver-blogger` to surface famous bloggers by
  nickname. Results are deduped and capped at 20.
- `extractBlogIdRefs(pageText, { excludeBlogId })` scans a page text dump
  for `blog.naver.com/<blogId>` URLs and returns a deduped list of blogIds,
  filtered against a small blocklist of reserved path segments (`PostView`,
  `PostList`, `api`, ...) and optionally excluding a caller-supplied blogId
  (the source post's own author). Used to mine roundup-post bodies for
  referenced bloggers.

## Operating Rules

1. **Always normalize URLs** before calling `browseText`. A raw
   `blog.naver.com/<id>/<logNo>` URL will silently return empty text.
2. **Sleep 1 second between requests** to the same Naver host. The helpers do
   this automatically; if you call `browseText` directly in a loop, enforce
   the delay yourself.
3. **Retry once on empty extraction**, then give up. Do not hammer the page.
   Naver is quick to rate-limit.
4. **Never scrape personal info** (subscriber lists, contact details). Only
   public post content and public metadata (title, date, logNo).
5. **Truncate text to 3000 chars** before returning post bodies up the stack.
   Callers never need the full post for summarization and the truncation keeps
   downstream LLM context small.
6. **Fail loud, not silent**. If the browse binary is missing or invalid, throw with
   the install hint or rerun the skill installer so the post-install hook can
   bootstrap a local binary. Do not fall back to `fetch`; dynamic pages will
   not render.

## Smoke Test

```bash
node skills/kr-naver-browse/scripts/browse-naver.js --test
```

The `--test` flag runs a single search for `엘앤에프 주가`, prints the
first three results, and exits non-zero if the browse binary is missing or
returns empty text both times.

## Known Issue

- **Sandbox runtime bug**: some Codex sandbox environments block local
  `127.0.0.1` listen calls with `EPERM`. When that happens, the underlying
  gstack `browse` server cannot start, and Naver fetches fail before any page
  is read.
- **Typical symptoms**: `Server failed to start`, `No available port after 5
  attempts`, or direct `listen EPERM: operation not permitted 127.0.0.1:<port>`.
- **Impact**: `kr-naver-browse`, `kr-naver-blogger`, and `kr-naver-insight`
  may appear to return empty results even though the target posts exist.
- **Current workaround**: rerun the browse-backed command outside the sandbox
  or with elevated execution so the local server can bind to a port. This is
  an environment/runtime issue, not a Naver-only parsing issue.
