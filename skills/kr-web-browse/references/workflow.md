# Workflow Reference

## Goal

Give other skills a single place to navigate arbitrary public web pages and
download binary files (PDF) with a headless browser, without duplicating
gstack binary resolution or URL-fetch logic across consumers.

This skill is a sibling of `kr-naver-browse`. The split matters:

- `kr-naver-browse` knows Naver's URL quirks (desktop → mobile rewrite,
  PostView iframe handling, `normalizeNaverUrl`). Those rewrites would
  corrupt generic URLs.
- `kr-web-browse` is a thin pass-through plus a PDF downloader.

## Binary Resolution

The gstack `browse` binary is vendored by `kr-naver-browse`, not here. The
resolver checks in order:

1. `$GSTACK_BROWSE_BIN` (env override).
2. `skills/kr-naver-browse/vendor/gstack/browse/dist/browse` in the parent
   repo of this skill (when running from the source checkout).
3. `$CLAUDE_HOME/skills/kr-naver-browse/vendor/gstack/browse/dist/browse`
   and `$CODEX_HOME/skills/kr-naver-browse/vendor/gstack/browse/dist/browse`
   (when installed under a harness).
4. `$CLAUDE_HOME/skills/gstack/browse/dist/browse` and
   `$CODEX_HOME/skills/gstack/browse/dist/browse` (gstack-global install).

If all fail, the resolver throws and tells the user to run
`bash scripts/install-skill.sh kr-naver-browse` first.

## Browse Semantics

`browseText(url, opts)` and `browseLinks(url, opts)` both:

- Enforce a 1000ms delay between successive calls (shared state with
  `kr-naver-browse`'s module-level `lastRequestAt` would be ideal but we
  keep an independent counter here to avoid a circular require).
- Retry once after a 5000ms wait if the first extraction was shorter than
  50 characters.
- Return `null` on the second empty attempt rather than throwing.

`downloadFile(url, destPath, opts)`:

- Uses Node `https.get` with a 60s default timeout.
- Follows up to 5 redirects (302, 301, 303, 307, 308).
- Handles gzip and deflate content-encoding via `zlib`.
- Writes atomically (`destPath.part` → rename).
- Throws on HTTP status ≥ 400.
- Never invokes the headless browser — PDF streams do not work through
  `browse`.

## Non-Goals

- No cookie jar, no login, no header injection beyond a standard
  `User-Agent`. If a page is gated, the upstream skill should detect it
  (e.g. status 401/403 on download, login-wall text in the HTML) and
  record the report as `requiresAuth: true`.
- No HTML parsing helpers. Consumers bring their own regex / DOM logic.
- No rate-limiter beyond the 1s delay. Callers that want stricter limits
  should sleep themselves.

## Failure Modes To Avoid

- Loading a Naver URL through this module. The result will look right
  (some text comes back) but post bodies from `PostView.naver` will be
  missing. Always use `kr-naver-browse` for Naver.
- Using `downloadFile` for pages that are not direct binaries. It will
  write the HTML to disk as if it were a PDF.
- Re-implementing the gstack binary resolver in a consumer skill. Call
  `resolveBrowseBinary()` from this module instead.
