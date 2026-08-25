---
kind: review-attestation
pr: "263"
head_sha: "cf6d206c92f2927c24d59aa905ea0bd16e3b342a"
verdict: pass
reviewer: "codex-doc021-review"
independent: true
plan_hash: "c454dbe71cb339a3"
ticket_updated: "2026-08-25T06:14:43.376Z"
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
    summary: "Remote-host readiness health transitions retained the previous provider changedAt timestamp."
    disposition: fixed
---

# Independent final re-review — GUI-138

## Scope and contract

Independently reviewed PR #263 at exact head cf6d206c92f2927c24d59aa905ea0bd16e3b342a against the complete ticket packet, HZN-007 control context, and FRD-025. The source remains confined to the six declared GUI manager, remote-host, and supervisor source/test files. The production path is complete: Cloudflared adapter status supplies a monotonic attempt and lifecycle metadata to RemoteHost; remote-cli serializes the status; the GUI records only allowlisted status facts and supplies doctor with the manager-owned snapshot. No provider query, public routing, bearer/credential/log content, dependency, updater, release, or doctor-contract weakening is introduced.

## Finding dispositions

### F-001 — major — FIXED

Restarting maps to degraded, and the manager-to-doctor regression proves TUNNEL_PROCESS_READY fails during backoff.

### F-002 — major — FIXED

Attempt is carried across the real status path to the GUI snapshot.

### F-003 — major — FIXED

The prior unrelated core timeout was repaired separately by CORE-104; the exact head passes hosted verification.

### F-004 — major — FIXED

RemoteHost derives its attempt from the adapter's monotonic status rather than its supervisor retry budget; a restarting status represents the next adapter launch attempt.

### F-005 — major — FIXED

The production-shaped remote ready event retains tokenId separately and uses the verifier sha256 fingerprint as auth generation.

### F-006 — major — FIXED

providerChangedAt is separate from UI status.updatedAt and is passed unchanged to doctor.

### F-007 — major — FIXED

RemoteHost now stamps fresh changedAt values on provider health degradation and recovery. The regression proves connected, degraded, and recovered timestamps differ, so a health-driven snapshot cannot retain the old connected transition time.

All original review threads (F-001 through F-007) are resolved. GitHub has no ordinary PR comments.

## Evidence and decision

Reviewer commands on the exact worktree exited 0: npm run test:http -w @kanmer/mcp-server (102 tests), npm exec vitest run -- src/main/remoteAccess/manager.test.ts (12 tests), npm run typecheck, and git diff --check e958ff2c182373a5461856e60d1a563f37d32b3d...cf6d206c92f2927c24d59aa905ea0bd16e3b342a. Exact-head workflow 32816113735 is terminal green: verify 4m5s and kanmer-gate 1m0s. That gate snapshot predates this replacement record, so it must be refreshed before merge. Packaged public-doctor and authenticated/unauthenticated remote MCP evidence remains post-merge verification work and is not claimed here.

Verdict: PASS, contingent only on the post-attestation gate refresh at this unchanged head.
