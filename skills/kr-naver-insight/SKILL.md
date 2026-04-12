---
name: kr-naver-insight
description: Fetch and summarize Naver blog posts from a ranked blogger list for use in a KRX decision memo's Street / Alternative Views section. Use after `kr-naver-blogger` has produced a candidate JSON file, or when the user already knows which blogger IDs to read. Caches individual posts per `logNo` so follow-up runs are cheap, and renders a Markdown insights digest grouped by blogger. Requires `kr-naver-browse`. Do not use to produce a standalone view — this skill summarizes source material, not a thesis.
---

# Korean Naver Blog Insights

Given a company and a list of Naver blogger IDs, read their recent posts,
extract the body text, and produce a structured Markdown digest that plugs
into the `Street / Alternative Views` section of a full memo.

## When To Use

- After `kr-naver-blogger` has produced a dated JSON file for a ticker.
- When the user supplies an explicit list of blogger IDs to read.
- When a memo needs source type 4 material (independent long-form analysis)
  and Naver is the right venue for it.

Do **not** use this skill to:

- Produce a final thesis or stance — that belongs in `kr-stock-analysis`.
- Cite bloggers as primary sources for material facts. Treat them as
  secondary perspectives.

## Pipeline

1. **Fetch** — `scripts/fetch-blog-posts.js` reads the bloggers list, walks
   each blogger's PostList, filters posts that mention the company name or
   ticker, and pulls the body of each relevant post through
   `kr-naver-browse`. Posts are cached per `logNo` under the cache dir; a
   post is immutable, so cache never expires.
2. **Summarize** — `scripts/summarize-insights.js` reads the posts JSON and
   renders a Markdown digest grouped by blogger, with per-post date, title,
   snippet, and a source URL.

## Output Contract

The summarize step writes a Markdown file that looks like:

```markdown
# Naver Blog Insights: 엘앤에프 (066970)

기준일: 2026-04-12

## Blogger Coverage Summary

| Blogger | Posts | Coverage Window | Latest |
|---------|-------|-----------------|--------|
| mooyoung_2022 | 5 | 2025-10-12 ~ 2026-04-12 | 2026-04-12 |

## mooyoung_2022 — Recent Posts

### 실리를 찾는 국가 지도자 (2026-04-12)

> 에너지 안보 앞에 다른 선택은 없다. 배터리 양극재를 만드는 기업인 엘앤에프에…

📎 https://blog.naver.com/PostView.naver?blogId=mooyoung_2022&logNo=224249188355
```

Reference: `references/output-format.md`.

## Operating Rules

1. **Never paraphrase into a thesis.** The digest quotes the post and links
   the source. Synthesis belongs in the memo itself.
2. **Quote, don't invent.** Snippets must be lifted verbatim from the fetched
   text, with ellipsis for truncation. No reworded summaries.
3. **Always include the source URL** for each post. A memo writer needs the
   link to cite.
4. **Truncate each post body to 3000 chars** during fetch (handled by
   `kr-naver-browse`). Truncate snippets in the digest to 500 chars.
5. **Skip posts that do not mention the company or ticker** in title or
   first 500 characters of body.
6. **Stay per-blogger deterministic** — sort posts by date descending, fall
   back to `logNo` descending.
7. **Respect the cache** — same `logNo` should never be re-fetched unless
   `--no-cache` is set.

## Invocation

```bash
# Step 1: fetch (either from blogger list JSON or explicit IDs)
node skills/kr-naver-insight/scripts/fetch-blog-posts.js \
  --input .tmp/naver-blog-cache/bloggers/066970/2026-04-12.json \
  --company "엘앤에프" --max-posts 5 --output /tmp/posts.json

# or
node skills/kr-naver-insight/scripts/fetch-blog-posts.js \
  --company "엘앤에프" --ticker 066970 \
  --bloggers mooyoung_2022 --max-posts 5 --output /tmp/posts.json

# Step 2: summarize
node skills/kr-naver-insight/scripts/summarize-insights.js \
  --input /tmp/posts.json --output /tmp/insights.md
```
