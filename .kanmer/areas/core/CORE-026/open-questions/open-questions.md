# Open questions — CORE-026

## User decisions needed

- [ ] **Applicability selectors:** Should a declaration apply globally, or may it be scoped to an area, label, and/or named task type? **Recommendation:** support a small explicit `appliesTo` selector (area ids and labels; empty means global) and use it only to rank already-declared sources. This avoids an opaque natural-language matching rule.
- [ ] **MCP trust boundary:** May a declared MCP source name tools that are not already connected to the running host, or only prefer an already-connected named server/tool namespace? **Recommendation:** only prefer already-connected tools; declarations never install, authenticate, or auto-enable MCPs.
- [ ] **llms.txt fetch/cache budget:** What default limits and retention are acceptable for project research? **Recommendation:** HTTPS only; same-origin redirects and followed links; manifest plus at most 32 direct linked pages (depth 1), 2 MiB total after decompression, 10-second requests, 24-hour revalidation with ETag/Last-Modified; cache only fetched text plus URL, timestamps, validators, and hash under `.kanmer/data/`.

## Parked (explicitly deferred)

None.
