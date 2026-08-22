# Research — CORE-056 source refresh remediation

## Question

What is the smallest safe change that closes the three current CORE-044/PR #165 refresh findings without absorbing DNS rebinding, board-worktree ignore, plugin-bundle provenance, or other follow-up scope?

## Authoritative context

- CORE-044 PR #165 is still unmerged at cumulative head 142af2f3b105b38b00d659019d1cfe99f3b50844, based on CORE-026 head b5ae6f36. CORE-056 must stack on that exact head so its diff remains reviewable.
- FRD-027 and ADR-0020 require bounded same-origin HTTPS documentation retrieval, validator-aware cache behavior, aggregate page/byte limits, and preference-not-authority semantics. Cache bytes are derived local state and must not silently regress.
- CORE-044's current packages/mcp-server/src/sources.ts reads a cache before fetching, performs network refresh outside the cache lock, and calls writeCache under a lock only for the final atomic write. Two expired/forced calls can therefore compute independently and overwrite one another.
- revalidateLinkedDocuments starts its byte count with the root and increments it for changed linked responses, but a 304 appends the retained cached document without charging its UTF-8 size. A later changed linked response can therefore exceed the 2 MiB aggregate output/network budget.
- root 304 revalidation iterates cached.documents only. If a linked page failed during the prior root fetch and is absent from cached.documents, revalidation never reparses the unchanged cached root and never retries that missing candidate.
- The existing core withExclusiveFileLock primitive and atomic writer are the synchronization/commit seam. The per-source cache transaction must reuse them; no second cache format or new dependency is justified.

## Chosen bounded behavior

1. Acquire the existing per-source cache lock before reading the cache and hold it through freshness check, network refresh/revalidation, and atomic replacement. Split the existing unlocked write helper so the transaction does not recursively acquire the same lock. This serializes refreshes without changing the cache schema.
2. During root-304 revalidation, charge retained cached linked-document UTF-8 bytes against the same aggregate allowance before appending them. If a retained document would exceed the remaining bound, record a failure and omit it from the returned/cache document set rather than returning an over-budget result.
3. Reconstruct bounded direct candidates from the cached root document using its validated URL, then revalidate cached candidates and fetch candidates absent from the cached set. Preserve stale cached content only when it still fits the aggregate allowance; record failures for unavailable pages. Keep depth/page/origin/query/fragment/content rules unchanged.

## Evidence limits and out of scope

Deterministic injected fetch and delayed-response fixtures can prove serialization, byte accounting, and missing-link retry. Live public/private DNS rebinding, packaged plugin reproducibility, board-worktree ignore reconciliation, crash-at-exact-write, and external llms.txt evidence remain outside this ticket and must stay INCONCLUSIVE or linked follow-up findings. No source discovery, authority, GUI editor, schema redesign, or new dependency is included.
