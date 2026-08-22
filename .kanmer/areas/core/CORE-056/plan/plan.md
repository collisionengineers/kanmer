# Plan — CORE-056 source refresh remediation

## Objective

Close exactly the three current CORE-044 source-refresh findings while preserving the bounded FRD-027/ADR-0020 contract: serialize one source's cache refresh transaction, charge retained 304 bytes, and retry linked pages missing from an unchanged cached root.

## Governing docs

- docs/functional/frd/FRD-027-project-declared-sources.md: preserve preference-not-authority semantics, HTTPS/same-origin/depth-one/32-page/2 MiB/timeout bounds, validator-aware cache behavior, and deterministic source rails. The implementation changes only refresh consistency and revalidation accounting.
- docs/architecture/adr/ADR-0020-project-declared-source-trust.md: fetched documents/cache remain derived data; no source is installed, enabled, trusted, or crawled without bounds. Locking and retry must not expand authority or network scope.
- CORE-044/PR #165 exact cumulative head 142af2f3 is the execution base; this child addresses only the three findings identified in its independent review.

## Ordered implementation

1. Refactor fetchLlmsTxt into a per-source transaction under the existing cache lock. Read the cache, decide freshness, fetch/revalidate, and write the replacement while the lock is held. Keep atomic write and error surfacing; avoid recursive lock acquisition.
2. Make root-304 linked revalidation charge each retained cached document's UTF-8 bytes before appending it. Omit and report a retained document that would exceed the aggregate limit, so returned/cache documents remain bounded.
3. Rebuild bounded direct candidates from the cached root and validated final root URL. Revalidate cached candidates with validators and fetch candidates absent from cached.documents without validators; preserve only fitting stale documents and surface failures.
4. Add deterministic regressions for serialized concurrent refresh, 304 retained-byte budgeting, and retry of a previously missing linked page. Preserve every inherited assertion and existing source policy.
5. Build the server and regenerate the standalone plugin artifact required by the source change; run focused core/source tests, typechecks, scripts/docs, and feasible verification rails with exact exits and first failures retained.
6. Write the post-implementation report, checklist evidence, scratch handoff, commit/push, record PR traceability, and move only CORE-056 Implementing→Review. Do not merge or verify; DNS rebinding, board-worktree ignore, and bundle-provenance follow-ups remain explicit boundaries.

## Risks and mitigations

- Holding the cache lock during network I/O increases per-source contention but remains bounded by the existing request/page policy and prevents stale overwrite. A deterministic active-refresh test proves one transaction at a time.
- A retained 304 document can consume the remaining budget; omit it with a surfaced failure rather than violate the advertised aggregate cap.
- Missing links may be retried on every root 304; the existing page cap, same-origin checks, timeout, and aggregate limit bound this work.
- The generated plugin bundle may retain CORE-044's normal-checkout path-provenance limitation; record it as inherited INCONCLUSIVE and do not expand this ticket into artifact provenance remediation.

## Verification

Proof is not written in this implementation stage. The post-implementation report records exact local exits and external limits; kanmer-verify writes merged-main proof after independent review and merge.
