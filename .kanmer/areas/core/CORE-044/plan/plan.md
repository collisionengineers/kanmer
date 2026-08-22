# Plan — CORE-044: harden CORE-026 source fetch, cache, and concurrency

## Objective

Close the remaining CORE-026 / PR #163 source-boundary findings with the smallest coherent hardening change. Preserve the existing declaration/resolver feature and its F-001/F-002 fixes; make validation, remote fetch, cache persistence, board writes, skill guidance, and mandatory tests agree on one fail-closed contract.

## Governing docs

- docs/functional/frd/FRD-027-project-declared-sources.md — the implementation must retain project-scoped preference semantics, available-only consultation, redacted diagnostics, HTTPS/same-origin/depth/page/byte/time/content bounds, validator-aware cache, setup/GUI preservation, and deterministic focused/full rails. This remediation tightens those existing requirements; it adds no source authority or GUI feature.
- docs/architecture/adr/ADR-0020-project-declared-source-trust.md — every declaration remains preference rather than permission; redirects, destination policy, cache writes, and remote exposure fail closed; skills remain choreography only.
- The linked CORE-026 packet and PR #163 review findings are the acceptance inventory for this fix ticket. No unrelated ticket or provider/GUI redesign is included.

## Approach and alternatives

Use core as the authority for schema, board CAS, and atomic persistence, and keep network policy in the Node-only MCP helper. This reuses the existing seams and avoids a second parser or a new cache subsystem. A local-only fetch_source would be the simplest remote defense, but preserving the existing authenticated HTTP surface with explicit public-destination checks is compatible with the stated tool contract; if that cannot be proven safely, the implementation must choose local-only and record the boundary as INCONCLUSIVE. Rejecting query URLs is safer and smaller than trying to redact unknown credential formats. A full GUI editor, provider migration, or general crawler is not a remediation of these findings and remains a separate scope.

## Ordered implementation steps

1. **Unify declaration validation and identity in core.** Export the canonical source input schema/shape to MCP; normalize safe HTTPS URL identity; reject query-bearing llms.txt URLs; settle empty selectors as global; make duplicate detection and source keys use the canonical representation. Add core round-trip, duplicate, selector, and secret-bearing URL tests.
2. **Make board source writes optimistic.** Use a serialized core/store board update lock as the core-level atomic source patch: set_sources reads and mutates the board only while holding the lock, so concurrent GUI/agent edits are not silently overwritten; add two-writer tests and retain all existing board fields.
3. **Harden the fetch boundary.** Replace automatic redirect following with bounded manual redirects that validate every Location and final URL for HTTPS, same-origin, credential/query policy, and public destination policy. Return the validated final root URL for link resolution; remove fragments before deduplication; exclude image destinations before page slicing; require supported content type; redact URLs in errors/results where any allowed query can remain.
4. **Enforce one aggregate network budget.** Stream response bodies with the remaining byte allowance, charge bytes consumed on failures, and stop the candidate walk once the aggregate budget is exhausted. Preserve F-001 enriched-resolver validation and F-002 stream coverage; add over-budget failure-path network-byte assertions.
5. **Reconcile bounded cache lifecycle.** Revalidate linked documents within the bounded page/time budget instead of treating root 304 as proof that linked documents are fresh. Use core atomic writes plus cross-process coordination; make cache updates/cleanup fail visibly, keep sha256 metadata, and exclude .kanmer/data/sources from board Git synchronization. Add concurrent writers, malformed/crash-safe read, 304-linked freshness, and cleanup/ignore fixtures.
6. **Align source tools and agent guidance.** Derive set_sources input from core, retain expected-project/write annotations, ensure remote fetch uses the destination policy, update the canonical 37-tool roster/reference, and tell research to consult available entries while recording unknown/unavailable entries as skipped. Clarify the existing FRD/ADR GUI/setup preservation contract if needed; do not add GUI source editing.
7. **Make verification authoritative.** Register packages/mcp-server/src/sources.test.mjs in the mandatory test:http/verify path; expand protocol/smoke/plugin-sync checks for schema reuse, annotations, URL/destination policy, and test inclusion. Run focused tests first, then full test/typecheck/build/smoke/docs/skills/plugin/diff rails; preserve first failures and exact exits.
8. **Prepare review handoff.** Write the post-implementation report with each finding disposition, commit/PR/checks, and INCONCLUSIVE external limits. Re-read get_doc_gates, move only one boundary if implementation later authorizes it, and stop for independent review.

## Scope guard

This plan changes only the existing CORE-026 source contract, its board/cache persistence, its skills/tool/test surfaces, and governing-document traceability required by the findings. It does not implement GUI editing, provider registration migration, external auto-trust, OAuth, remote transport redesign, or an unbounded crawler.

## Proof plan

- Core fixtures prove canonical declaration parsing, no secret-bearing URLs, empty/global selector behavior, duplicate identity, and stale board CAS.
- Injected fetch/DNS/stream fixtures prove each redirect hop, public-destination rejection, relative-link base, image/fragment filtering, content-type requirement, query rejection, aggregate byte accounting, linked 304 behavior, and surfaced failures.
- Filesystem/process fixtures prove atomic cache JSON, cross-process serialization/lock behavior, cleanup/ignore handling, and no partial writes.
- The authoritative test command proves sources.test.mjs cannot silently regress; full hosted rails prove tool/schema/plugin/manual synchronization.
- Live external sites, real private-network access, crash-at-instruction, and packaged update behavior remain INCONCLUSIVE as recorded in open-questions.

## Risks and mitigations

- DNS changes between preflight and connect: use a bounded public-destination policy at each hop and fail closed; retain the live rebinding limit as INCONCLUSIVE.
- A lock can remain after a crash: use atomic exclusive claims, bounded stale-lock recovery, and surfaced failure rather than unbounded waiting.
- Existing boards may lack a board version: derive a content hash on read and require the caller's token for source writes without changing unrelated board files.
- Cache cleanup could remove a concurrently refreshed file: compare ownership/URL metadata and treat conflicts as surfaced retry/defer outcomes.

## Stop condition

Stop after the packet is complete and the implementation PR is Review-ready with independent review required. Do not self-review, merge, move to Verifying/Done, clean up, or start another ticket.

## Execution base

The implementation worktree is based exactly on CORE-026 review head `b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477` (PR #163), not bare origin/main. The remediation branch is `core-044-source-fetch-remediation` in .worktrees/core-044. This keeps the remediation diff reviewable against the still-unmerged CORE-026 implementation.
