# Plan — CORE-045 lock recovery and public destination classification

## Objective

Close only CORE-044 review blockers F-003 and F-009 on a branch stacked exactly on CORE-044 head 33f32e3aae9819f1c2344863272dacb5c958fbac. Preserve the source/cache contract and fail closed when lock ownership or network destination cannot be proven safe.

## Governing docs

- docs/functional/frd/FRD-027-project-declared-sources.md: retain bounded HTTPS/same-origin source retrieval, public-destination policy, and deterministic verification; no new source authority or GUI feature.
- docs/architecture/adr/ADR-0020-project-declared-source-trust.md: declarations remain preference-only and remote/cache boundaries fail closed; stale recovery must not make an unknown owner writable.
- CORE-044's linked review report and scratch are the acceptance inventory; CORE-045 fixes only F-003/F-009 and blocks CORE-044 until independently reviewed.

## Ordered steps

1. Add a core exclusive-lock record with PID/timestamp metadata, a conservative stale age, and bounded injected seams for clock, liveness, and retry delays.
2. On EEXIST, inspect the lock atomically enough for the filesystem contract: recover only an old lock whose owner is demonstrably dead; preserve fresh, active, malformed, unreadable, uncertain, and racing locks and surface contention after the existing bounded retries.
3. Add deterministic core lock tests for dead-stale recovery, active/fresh protection, malformed protection, callback cleanup, and no unbounded wait.
4. Replace the source private-address shortcut with a dependency-free complete known non-global IPv4/IPv6 classifier, including documentation/benchmark/reserved blocks and IPv4-mapped forms; retain DNS lookup and fail closed on lookup failure/empty results before every hop.
5. Add injected source tests for every newly classified range, mapped addresses, a representative public address, and redirect-hop reuse; keep the authoritative source suite unchanged in the rail.
6. Run focused and proportionate shared rails, record first failures and exact exits, write the report and scratch, push the stacked PR, record traceability, re-read gates, and move only Implementing → Review.

## Proof plan

- Core unit tests inject now/liveness/retry options and create deterministic stale lock records; they assert dead stale recovery, active/unknown/malformed lock preservation, callback result, and final cleanup.
- Source tests inject lookup results for every special-use family and verify public addresses continue to reach the fetch seam while no private address does.
- Typecheck/build/source/core/HTTP and relevant docs/plugin rails provide exact local evidence. Live DNS rebinding, PID reuse, exact crash timing, and packaged proof remain INCONCLUSIVE.

## Risks and mitigations

- Removing a live lock would permit concurrent cache writes: require both age and demonstrably dead PID, otherwise never remove.
- PID reuse or a race after inspection could make recovery uncertain: use conservative liveness and catch unlink races; any uncertainty fails closed.
- An incomplete IP table could preserve SSRF: use explicit RFC special-use/documentation/benchmark/reserved ranges and mapped-address conversion tests, with lookup errors rejected.

## Scope guard and stop condition

Only packages/core/src/io.ts and its tests, packages/mcp-server/src/sources.ts and its tests, and required pipeline docs are in scope. No new dependency or unrelated source/editor/provider work. Stop at Review with independent review required; do not merge, verify, close out, or clean up.

## Execution base

The implementation worktree will be based exactly on CORE-044 head 33f32e3aae9819f1c2344863272dacb5c958fbac (PR #165), not origin/main. Branch: core-045-lock-dns-remediation; worktree: .worktrees/core-045.
