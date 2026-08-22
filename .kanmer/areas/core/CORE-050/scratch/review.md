---
kind: review-attestation
pr: "172"
head_sha: "fc8e591e344cb7743204f8261eb5186b76f1d3aa"
verdict: pass
reviewer: "gui099-executor"
independent: true
plan_hash: "ea3f118942fb3cb6"
ticket_updated: "2026-08-22T12:04:00.542Z"
findings:
  - id: F-050-RETRY
    severity: blocker
    summary: "Per-attempt stale identity and owner-marker validation is fixed"
    disposition: fixed-in-head
    reason: "recoverStaleLock now supplies stillOwnsStaleLock to renameWithRetry; every transient EPERM/EBUSY/EACCES backoff re-reads contents/stat identity, parses the record, checks process liveness, and checks owner markers before another rename attempt. The transient-then-replacement regression proves the retry stops without acting on the replacement."
  - id: F-050-CLAIMANT
    severity: blocker
    summary: "Active replacement ownership is preserved"
    disposition: fixed-in-head
    reason: "withExclusiveFileLock rejects a third claim while an active owner marker remains beside a quarantined replacement. The inherited adversarial claimant test now waits for the active owner to release and asserts the third callback never observes the winner active."
  - id: F-050-CLEANUP
    severity: major
    summary: "Quarantine cleanup errors are surfaced"
    disposition: fixed-in-head
    reason: "cleanupOwnerQuarantines and hasActiveOwnerMarker suppress only ENOENT races; other readdir/read/remove failures propagate. The cleanup-error regression injects EACCES and observes it from the lock operation."
  - id: F-050-TOKEN
    severity: major
    summary: "Persisted token validation precedes marker path construction"
    disposition: fixed-in-head
    reason: "Lock records accept only UUID-shaped tokens and ownerMarkerPath validates every token. The malformed nested token regression rejects recovery and leaves the victim path untouched."
  - id: F-050-HTTP
    severity: minor
    summary: "Broad HTTP readiness timing remains an inherited boundary"
    disposition: preserved-inconclusive
    reason: "The packet preserves the unchanged broad MCP HTTP 81/82 TUNNEL_READINESS_TIMEOUT and isolated readiness 7/7; no assertion or unrelated source behavior was weakened."
  - id: F-050-HOSTED
    severity: minor
    summary: "No hosted workflow run is available for the reviewed head"
    disposition: inconclusive
    reason: "The exact-head workflow lookup returned no runs. Hosted CI and live Windows handle/crash/PID-reuse/process-termination evidence are not claimed."
---
# Independent review — CORE-050

## Verdict

PASS for the bounded CORE-050 remediation at exact head `fc8e591e344cb7743204f8261eb5186b76f1d3aa`. The cumulative CORE-049/046/047 findings in scope are closed by the diff and deterministic regressions. No source, merge, move, or cleanup was performed.

## Packet and lineage

I read the complete CORE-050, CORE-049, CORE-046, and CORE-047 packets; HZN-007 context; FRD-027; ADR-0020; prior independent findings; and the exact PR #172 diff. PR #172 is open and mergeable, based on CORE-049 head `8edfede9bdb663171601cb326a67bd03792065e2`; the compare is one commit and three files:

- `packages/core/src/io.ts`
- `packages/core/src/io.test.ts`
- `plugins/kanmer/mcp/kanmer-mcp.cjs`

The worktree is clean at the exact requested head. No source policy, resolver, network, GUI, provider, or board-store behavior is absorbed.

## Finding audit

- Per-attempt retry revalidation is implemented in the shared `renameWithRetry` path and rechecks stale contents, device/inode/mtime, parsed record, liveness, and owner markers before each retry. The adversarial transient replacement leaves the replacement untouched and does not retry after ownership changes.
- Claimant overlap is blocked by the active owner-marker guard while a replacement is quarantined. The inherited release/third-claimant protocol remains intact.
- Cleanup now fails closed while distinguishing the expected concurrent `ENOENT` race from other errors; non-ENOENT cleanup failures reach the owner and are covered by regression.
- Persisted tokens are constrained to UUID-shaped values before `ownerMarkerPath`; malformed/path-traversal input cannot construct a victim path.
- The regenerated standalone artifact carries the same changes and the packet records plugin byte/tool parity.

## Rails

- PASS: IO focused rail 22/22.
- PASS: combined core IO/source/store rail 113/113 (22 IO, 6 source, 85 store).
- PASS: core and all-workspace typecheck, exit 0.
- PASS: core build, standalone plugin build, plugin check/parity, and `git diff --check`, exit 0.
- Preserved setup failure: first plugin build used the stale ancestor `@kanmer/core` junction; the documented ignored worktree-local junction made the rerun pass without source or lockfile changes.
- Preserved broad HTTP boundary: 81/82 readiness timeout, with isolated readiness 7/7.
- No hosted run exists for this head. Genuine Windows handle contention, crash timing, PID reuse, and process termination remain INCONCLUSIVE.

## Governing-doc alignment

The change tightens FRD-027 fail-closed serialized filesystem behavior and ADR-0020's non-authority boundary without adding dependencies, source capabilities, or network policy. Inherited CORE-046/047/049 ownership, source, and artifact requirements remain represented and reachable.
