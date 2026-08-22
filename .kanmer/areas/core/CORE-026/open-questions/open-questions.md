# Open questions — CORE-026

## Resolved product defaults

- [x] **Applicability selectors:** Use a small explicit `appliesTo` selector containing area ids and labels; an empty selector is global. Do not add natural-language or task-type matching in this release. This keeps matching deterministic and lets a project rank already-declared sources without hidden inference.
- [x] **MCP/plugin trust boundary:** A declaration may prefer only an MCP server/tool namespace already connected to the current host or a plugin already installed and exposing the source. Declarations never install, authenticate, enable, or grant access; discovery produces candidates only and requires explicit confirmation before writing one.
- [x] **`llms.txt` fetch/cache budget:** HTTPS initial URL, same-origin redirects, depth 1, at most 32 direct linked pages, 2 MiB total response bytes, 10-second request timeout, 24-hour revalidation, ETag/Last-Modified validators when provided, and cache metadata/text only below `.kanmer/data/`. No cross-origin or unbounded crawl.

## Parked (explicitly deferred)

- [x] Per-user source scopes, OAuth/OIDC, automatic provider registration migration, and deeper/cross-origin documentation crawling are deferred to separate work because they would change the trust boundary or exceed the bounded first release.
