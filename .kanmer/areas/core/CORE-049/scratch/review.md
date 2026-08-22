---
kind: review-attestation
pr: "171"
head_sha: "8edfede9bdb663171601cb326a67bd03792065e2"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "031022f0c419ab92"
ticket_updated: "2026-08-22T11:42:42.505Z"
findings:
  - id: F-049-RETRY-RACE
    severity: blocker
    summary: "Retrying raw quarantine rename does not repeat ownership validation"
    disposition: open
    reason: "The new wrapper applies renameWithRetry around the raw rename seam, but validation occurs only before the retry loop. If the first rename gets EPERM/EBUSY/EACCES, another reclaimer can quarantine the stale inode and claim a replacement before the retry; the retry can then move that active replacement, leaving the path empty for a third claimant. Re-run the complete stale-inode/owner-marker validation for each retry, with an adversarial transient-then-replacement regression."
  - id: F-049-TRACE
    severity: major
    summary: "Cumulative CORE-046 traceability is refreshed"
    disposition: fixed-in-head
    reason: "CORE-046 report and item now record CORE-047 source head 67e2be79, merge 0f7ccc4e, and pending CORE-049 8edfede9/PR171 without claiming the child is merged. The exact base/head lineage is reachable."
  - id: F-167-P2
    severity: major
    summary: "Original transient-rename PR thread is resolved"
    disposition: fixed-in-parent
    reason: "PR167 thread PRRT_kwDOT2PEds6bYPz8 is resolved with an evidence-backed reply naming PR171, IO19/19, full core297/297, and plugin parity."
  - id: F-167-ACTIVE
    severity: blocker
    summary: "Separate parent thread still permits a claimant while a replacement owner is quarantined"
    disposition: deferred-to-separate-remediation
    reason: "PR167 has a new unresolved P1 thread PRRT_kwDOT2PEds6bYZxB. This is outside CORE-049's bounded retry scope, but it still blocks a clean cumulative CORE-046 merge."
  - id: F-167-CLEANUP
    severity: major
    summary: "Separate parent cleanup-error thread remains unresolved"
    disposition: deferred-to-separate-remediation
    reason: "PR167 thread PRRT_kwDOT2PEds6bYZxC reports broad suppression in cleanupOwnerQuarantines; CORE-049 does not absorb unrelated parent source changes."
  - id: F-167-TOKEN
    severity: blocker
    summary: "Separate parent token-path validation thread remains unresolved"
    disposition: deferred-to-separate-remediation
    reason: "PR167 thread PRRT_kwDOT2PEds6bYZxD reports unvalidated persisted tokens before owner-marker path construction; CORE-049 does not absorb this unrelated security remediation."
---
# Independent review — CORE-049

## Scope and exact head

I read the complete CORE-049 packet, CORE-046/047 packets and attestations, HZN-007 context, FRD-027, ADR-0020, CORE-046 cumulative report/traceability, PR #171, and the exact one-commit diff from base 0f7ccc4efad0aeae2295f3ba08e0b6e886356679 to head 8edfede9bdb663171601cb326a67bd03792065e2. The diff is scoped to packages/core/src/io.ts, packages/core/src/io.test.ts, and the regenerated standalone plugin artifact. No source changes were made by this review.

## Bounded retry audit

The intended fix is present: withExclusiveFileLock wraps the injected/default quarantine rename with the existing renameWithRetry helper, preserving bounded EPERM/EBUSY/EACCES handling. The deterministic regression covers all three codes and proves recovery/no residue.

However, the retry loop surrounds only the raw rename. The stale content/inode and active owner-marker checks are outside that loop. A transient first rename can give another reclaimer time to move the stale inode and claim a replacement; the retry then acts on the replacement without revalidation. A third claimant can observe the empty path during that transition and enter concurrently. This is a true in-scope concurrency blocker.

## Traceability and inherited acceptance

CORE-046's cumulative report now distinguishes CORE-046, merged CORE-047 (67e2be79 into 0f7ccc4e), and pending CORE-049 (8edfede9/PR171). CORE-047 token/lease behavior, inherited source/DNS policy, and plugin artifact parity remain preserved. The fixed original transient-rename thread on PR167 is resolved with evidence.

Three later PR167 findings remain unresolved and outside CORE-049's bounded scope: active replacement quarantine/third claimant overlap, suppressed non-ENOENT quarantine cleanup failures, and unvalidated token path construction. They must be separately remediated before CORE-046 can claim a clean cumulative merge.

## Evidence

- IO focused rail: 19/19 PASS, exit 0.
- Focused core IO/source/store rail: 110/110 PASS, exit 0.
- MCP source rail: 14/14 PASS, exit 0.
- Plugin check: PASS, 37 tools and bundle bytes synchronized.
- git diff --check: PASS, exit 0.
- Isolated readiness fixture: 7/7 PASS.
- Broad MCP HTTP rail: 81/82 twice, exit 1, unchanged TUNNEL_READINESS_TIMEOUT at src/tunnels/readiness.test.mjs:54; preserved, not weakened.
- No hosted workflow run is associated with 8edfede9.
- Live Windows handle contention, crash timing, PID reuse, and process-termination evidence remain explicitly INCONCLUSIVE.

## Verdict

NEEDS-CHANGES. The requested transient retry contract and traceability update are present, but retrying without repeating ownership validation leaves an in-scope race. Separate unresolved CORE-046 parent threads also prevent cumulative closure. No merge, move, cleanup, or source edit was performed.
