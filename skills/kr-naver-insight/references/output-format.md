# kr-naver-insight — Output Format

The two scripts produce two artifacts:

## fetch-blog-posts.js → posts JSON

```json
{
  "company": "엘앤에프",
  "ticker": "066970",
  "fetchedAt": "2026-04-12",
  "posts": [
    {
      "blogId": "mooyoung_2022",
      "bloggerName": null,
      "logNo": "224249188355",
      "title": "실리를 찾는 국가 지도자",
      "date": "2026-04-12",
      "url": "https://blog.naver.com/PostView.naver?blogId=mooyoung_2022&logNo=224249188355",
      "text": "... body truncated to 3000 chars ...",
      "cachedAt": "2026-04-12"
    }
  ],
  "meta": {
    "totalFetched": 5,
    "fromCache": 3,
    "errors": [],
    "generatedBy": "kr-naver-insight/fetch-blog-posts.js"
  }
}
```

Rules:

- `text` is the trimmed body, already truncated to 3000 chars by
  `kr-naver-browse`.
- `bloggerName` stays `null` unless the fetch step found a display name.
- `cachedAt` is the date the post entered the cache. On cache hits the value
  is preserved from the original fetch.
- `meta.errors` is an array of `{ blogId, logNo, message }` for any fetch
  that failed.

## summarize-insights.js → Markdown digest

```markdown
# Naver Blog Insights: <company> (<ticker>)

기준일: <today>

## Blogger Coverage Summary

| Blogger | Posts | Coverage Window | Latest |
|---------|-------|-----------------|--------|
| mooyoung_2022 | 5 | 2025-10-12 ~ 2026-04-12 | 2026-04-12 |

## mooyoung_2022 — Recent Posts

### <post title> (<post date>)

> <verbatim snippet, <= 500 chars, ellipsis if truncated>

📎 <post URL>

### <next post title> (<post date>)

...
```

Rules:

- Always start with the `기준일:` line so the digest can be audited like a
  memo block.
- Coverage window is `<oldest post date> ~ <latest post date>` for that
  blogger. Use the JSON's `posts[].date` values.
- Posts within a blogger section are sorted by date descending.
- Snippets come from the first 500 chars of `posts[].text`. Do not rewrite
  them. If a snippet ends mid-sentence, add `…`.
- The 📎 character prefixes the source URL on its own line so the memo
  writer can copy it directly.
- If a blogger has zero qualifying posts, omit the section.
- If the input JSON contains zero posts, emit a digest with a single line:
  `No qualifying posts found.` under the 기준일 line.
