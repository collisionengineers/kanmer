# Plan — CORE-081: source transport and cache lifecycle

## Objective

Close the seven valid current-head PR #163 findings that remain after the cumulative CORE-026 source implementation, with deterministic regressions and no loss of prior safety or cache guarantees.

## Starting state

CORE-026 is at review on cumulative head `3a05ab7a21f55152a4f493169300ac9e622baab7`. Earlier review findings for SSRF/DNS, canonical URLs, cache writes, roster/ignore handling, and baseline source safety are already represented in that head. This ticket is a blocking remediation and must merge into the CORE-026 branch before the parent can be independently re-reviewed.

## Governing docs

- `docs/functional/frd/FRD-027-project-declared-sources.md`: preserve and make explicit the fetch/cache/encoding/crawl-budget contract for declared sources.
- `docs/architecture/adr/ADR-0020-project-declared-source-trust.md`: preserve the source trust boundary and fail-closed behavior while correcting lifecycle details.

## Required changes

1. Preserve validators when a same-origin manifest redirect changes the effective URL, including the cache key and conditional request headers.
2. Cancel response bodies on every early-abandon path, including status rejection, size/budget rejection, decode failure, and redirect refusal.
3. Make an in-flight refresh observable and wait/reuse it beyond the short lock retry window rather than starting competing refreshes.
4. Encode request identity explicitly and decode `Content-Encoding` before size/accounting and parsing, retaining bounded behavior for unsupported encodings.
5. Charge partial body-read failures against the aggregate byte budget before surfacing the read error.
6. Stop Markdown link collection exactly at the 32-page cap, without issuing additional linked-page fetches.
7. Surface a linked-page `304` when there is no cached body; never cache an empty document as a successful result.
8. Add deterministic tests for each behavior and update the cumulative CORE-026 packet with exact review-comment dispositions and evidence.

## Constraints

- Reuse the current source transport/cache helpers and production tool caller.
- Add no dependency and do not weaken or remove existing assertions.
- Preserve SSRF/DNS, canonical URL, atomic cache, schema, and aggregate safety behavior already proven on the parent head.
- Keep provider-hosted and external-network evidence explicitly INCONCLUSIVE when it cannot be run; do not fabricate a hosted PASS.

## Ordered steps

1. Inspect the current source/cache helpers and reproduce each residual finding with the existing deterministic fixtures.
2. Implement the smallest shared-helper changes covering redirect validators, body cancellation, refresh coordination, identity/encoding, and byte accounting.
3. Correct the crawl cap and uncached linked-page `304` behavior, then add focused regressions.
4. Update FRD-027/ADR-0020 only where the normative wording needs to match the corrected lifecycle.
5. Run focused source tests, full core/server/script/type checks required by the packet, and `git diff --check`.
6. Write the post-implementation report, commit, open a PR targeting `core-026-project-declared-sources`, and stop at Review for independent review.

## Acceptance checks

- Same-origin manifest redirects retain validators and issue conditional requests against the effective cache entry.
- Every early-abandon response path cancels/consumes the body; tests detect no leaked bodies.
- Concurrent refresh callers wait for/reuse the active refresh rather than racing after the short lock retry interval.
- Request identity and `Content-Encoding` behavior are explicit and tested.
- Partial read failures count toward the aggregate byte budget.
- Link discovery performs no more than 32 linked-page fetches.
- An uncached linked-page `304` is surfaced as a non-successful cache miss, never an empty cached document.
- Existing CORE-026 safety tests remain green and all changed code has a production caller.

## Commands

- `npm test -w @kanmer/mcp-server -- --run src/sources.test.ts`
- `npm test -w @kanmer/core`
- `npm run typecheck -w @kanmer/mcp-server`
- `npm run test:scripts`
- `git diff --check`
- After merge: the parent CORE-026 merged-main verification rail.

## Stop condition

Stop after the implementation PR is opened with the report, checklist, and exact evidence; do not merge, verify, or start CORE-082/083 from this lane.
