# Research — CORE-081: source transport and cache lifecycle

## Question

Which current-head source-fetch paths still violate the transport, cache, and crawl-budget contracts identified in the independent review of CORE-026?

## Findings

- The cumulative source implementation is rooted in `packages/mcp-server/src/sources.ts`; manifest fetches follow same-origin redirects and cache validators, while linked-page crawling reuses the same fetch and aggregate budget helpers.
- The current review findings are narrow residual gaps, not a new source architecture: preserve validators across same-origin manifest redirects; cancel every abandoned response body; wait for an active refresh instead of retrying the lock for only the short bounded window; make request identity/`Content-Encoding` handling explicit; charge partial read failures to the aggregate byte budget; stop link discovery at the 32-page cap; and surface a linked-page `304` when no cached body exists instead of storing an empty document.
- Existing SSRF/DNS, canonical URL, atomic cache-write, schema, and aggregate-budget work from the cumulative CORE-026 chain must remain intact. The fix should extend the existing helpers and callers rather than create a second transport or cache layer.
- Deterministic regressions can be added beside the current source tests using the existing local HTTP fixtures and fake clock/lock seams. No provider-specific service or new dependency is required.

## Implications

Implement the seven findings as one bounded transport/cache lifecycle patch on the current CORE-026 head. Each finding needs a regression that proves the production fetch/crawl path, while preserving prior safety and cache invariants. The parent packet must record exact evidence and the review comments' dispositions.

## Open questions

- None for implementation: the current-head review comments and FRD-027/ADR-0020 define the required behavior.
