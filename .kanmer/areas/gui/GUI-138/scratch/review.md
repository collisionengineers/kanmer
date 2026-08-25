---
kind: review-attestation
pr: "263"
head_sha: "b38276f4545b25c5e720b5bf85dfa562883d8d81"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "c454dbe71cb339a3"
ticket_updated: "2026-08-25T06:10:20.162Z"
findings:
  - id: F-001
    severity: major
    summary: "A restarting tunnel could be attested as connected."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The production remote-status protocol did not carry the supervisor restart attempt."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Required hosted verify was red on the pre-CORE-104 base."
    disposition: fixed
  - id: F-004
    severity: major
    summary: "Supervisor attempt reset with retry budget and diverged from the provider's monotonic launch attempt after a stable-period reset."
    disposition: fixed
  - id: F-005
    severity: major
    summary: "The doctor snapshot labeled the remote ready token id as auth generation instead of the verifier fingerprint."
    disposition: fixed
  - id: F-006
    severity: major
    summary: "The doctor snapshot recorded doctor invocation time as provider transition time."
    disposition: fixed
  - id: F-007
    severity: major
    summary: "Remote-host readiness health transitions retain the previous provider changedAt timestamp."
    disposition: open
---

# Independent re-review — GUI-138

## Reviewed inputs and scope

Reviewed PR #263 at exact head b38276f4545b25c5e720b5bf85dfa562883d8d81 against the complete GUI-138 packet, HZN-007 control context, and FRD-025. The ticket remains in Review, the author is collisionengineers, and this is a separate reviewer role. The diff remains bounded to the six declared manager/supervisor/remote-host source and test files; no provider query, public routing, bearer/credential/log material, dependency, updater, release, or doctor semantic weakening appears.

Reviewer commands on the exact worktree passed: npm run test:http -w @kanmer/mcp-server (102 tests), focused GUI manager suite (12 tests), npm run typecheck, and git diff --check against e958ff2c182373a5461856e60d1a563f37d32b3d.

## Prior finding dispositions

### F-001 — major — FIXED

Restarting maps to degraded and the manager-to-doctor regression requires TUNNEL_PROCESS_READY to fail during backoff.

### F-002 — major — FIXED

The runtime now carries a real attempt through remote status to the manager and the doctor snapshot.

### F-003 — major — FIXED

CORE-104 repaired the unrelated hosted timeout; current hosted checks are separately pending for this new head.

### F-004 — major — FIXED

RemoteHost now derives its displayed attempt from the adapter's monotonic status rather than the resettable supervisor retry budget; restarting uses the next adapter launch attempt. The original GitHub thread remains to be marked resolved after this review record is accepted.

### F-005 — major — FIXED

The real ready event keeps remote tokenId separate and stores verifier fingerprint as auth generation. The manager regression now uses the production-shaped remote token id and sha256 fingerprint.

### F-006 — major — FIXED

The manager keeps providerChangedAt independently from UI status.updatedAt and passes that value to doctor; the restart regression asserts the supplied provider transition time after doctor action changes.

### F-007 — major — OPEN

RemoteHost.monitorHealth changes provider from running to degraded (and back) after provider-owned checkReadiness, but does not refresh its changedAt from the adapter's current status or otherwise stamp that readiness transition. The GUI therefore preserves the older connected transition time in the doctor snapshot. A direct exact-build reproduction started with adapter changedAt 2026-08-25T05:00:00.000Z, changed the adapter to degraded at 2026-08-25T06:00:00.000Z, invoked the injected health poll, and observed RemoteHost status degraded with the stale 05:00 timestamp. This violates truthful lifecycle timestamps required by FRD-025 RA-TUNNEL-2 and leaves readiness-age diagnostics inaccurate. Refresh changedAt for both health degradation and recovery and add coverage at the remote-host to GUI/doctor boundary. No GitHub thread exists yet for this new finding.

## Decision

The three former P2 findings are fixed, but F-007 is a current major production truthfulness defect. This attestation is needs-changes; do not merge or move GUI-138 until F-007 is corrected, the review threads are resolved/dispositioned, and exact-head required checks pass.
