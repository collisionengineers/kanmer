# Research — CORE-085: redirect validators and forced refresh

## Question

Which two lifecycle invariants remain open after CORE-081's source transport patch?

## Findings

- `packages/mcp-server/src/sources.ts` currently carries cached request validators through every same-origin redirect hop. A validator belongs to the cached final representation, so an intermediate redirect must not be allowed to answer 304 for that final cache entry.
- `fetchLlmsTxt` coalesces any concurrent caller onto an active refresh. A forced caller must not silently inherit an ordinary caller's fresh-cache decision; it must wait for the active refresh and then honor `force` with its own revalidation when required.
- Existing SSRF/DNS, canonical URL, body cancellation, byte budget, link-cap, and uncached linked-304 behavior from CORE-081 remain in scope and must not regress.

## Implications

This is a narrow follow-up on the same source/cache seam. Add deterministic multi-hop validator and concurrent force tests, then update the cumulative CORE-026 packet. No new dependency or provider behavior is needed.
