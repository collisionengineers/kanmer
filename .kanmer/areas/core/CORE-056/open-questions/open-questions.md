# Open questions — CORE-056 source refresh remediation

All choices are resolved for the bounded implementation; no user decision blocks execution.

## Resolved

- [x] **Transaction lock scope:** use the existing per-source cache lock across read, freshness check, network fetch/revalidation, and atomic write. This avoids stale overwrites without adding a version field or dependency.
- [x] **304 byte overflow:** count the UTF-8 bytes of every retained cached document before appending it; omit an over-budget retained page and surface a failure rather than returning an over-budget result.
- [x] **Missing links:** parse the unchanged cached root with the existing bounded markdown-link helper and retry candidates absent from the cached document set without validators.

## Parked (explicitly deferred)

- [x] **Live DNS rebinding/private-network proof:** remains INCONCLUSIVE from CORE-044; this ticket does not change transport binding.
- [x] **Board-worktree cache ignore and plugin bundle path provenance:** remain linked CORE-044 review findings and are not absorbed into this three-finding remediation.
- [x] **Crash-at-exact-write and live external-site proof:** deterministic lock/atomic tests remain the available evidence; live/process-kill evidence is INCONCLUSIVE.
