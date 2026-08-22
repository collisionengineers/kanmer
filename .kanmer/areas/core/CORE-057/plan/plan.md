# Plan — CORE-057 pin DNS validation and bound resolution

## Governing docs

- FRD-027 project-declared sources: HTTPS/public-destination, same-origin, bounded timeout and deterministic retrieval contract.
- ADR-0020 project-declared source trust: fail closed at remote-fetch boundaries; declarations remain preferences, not authority.
- CORE-044 PR #165 cumulative head 142af2f3b105b38b00d659019d1cfe99f3b50844: parent implementation and review evidence.

## Steps

1. Inspect the current fetch transport, Node runtime APIs, and injected lookup/fetch tests at the exact CORE-044 head; choose the smallest existing seam that binds the actual request to the preflight-validated address.
2. Implement one request deadline that covers DNS lookup, redirect hops, and body reads. Abort or reject resolver work when the deadline expires and preserve stable surfaced errors.
3. Add deterministic tests proving lookup results are the addresses used by the request, a rebinding-style alternate result cannot bypass validation, resolver timeout is bounded, and existing redirect/SSRF/byte/cache tests remain intact.
4. Run focused source/core tests, the authoritative source/HTTP rails, typecheck/build/smoke/docs/plugin/diff checks as feasible; preserve every first failure and external INCONCLUSIVE boundary.
5. Write the post-implementation report and fully checked checklist, record parent lineage and PR, refresh gates, move only Implementing→Review, and stop for independent review.

## Acceptance boundary

PASS requires no independent native DNS lookup after validated preflight, or a documented safe equivalent that demonstrably binds the transport, plus one deadline spanning resolver and request. No live DNS rebinding or private-network proof may be represented as PASS.
