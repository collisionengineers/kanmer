---
kind: review-attestation
pr: "263"
head_sha: "76abfc07fdf218588a0f0940842eacaaa0c0e1e4"
verdict: pass
reviewer: "codex-doc021-review"
independent: true
plan_hash: "c454dbe71cb339a3"
ticket_updated: "2026-08-25T05:57:01.124Z"
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
---

# Independent re-review — GUI-138

## Inputs and scope

Independently reviewed PR #263 at exact head 76abfc07fdf218588a0f0940842eacaaa0c0e1e4, rebased onto CORE-104 merge e958ff2c182373a5461856e60d1a563f37d32b3d, against the complete GUI-138 packet, HZN-007 control context, and FRD-025. The changed scope is exactly the declared six lifecycle/status source and test files: GUI remote-access manager and regression, MCP tunnel supervisor and regression, and remote host/status regression. No provider query, public routing, bearer/credential/log material, dependency, updater, release, or doctor-contract weakening is introduced.

The production chain is complete: TunnelSupervisor emits its real bounded attempt; RemoteHostStatus carries it; remote-cli serializes that status object; and the GUI accepts only a positive integer, maps restarting/degraded to degraded, and supplies an allowlisted manager-owned doctor snapshot. The snapshot includes state, provider, attempt, timestamp, public endpoint, project fingerprint, and opaque auth generation only.

## Findings and dispositions

### F-001 — major — FIXED

A provider restart now maps the manager to degraded, so TUNNEL_PROCESS_READY cannot pass during restart backoff. The manager regression drives ready to restarting, requires a failing readiness check, and asserts the degraded snapshot.

### F-002 — major — FIXED

The real lifecycle attempt is now carried from TunnelSupervisor through RemoteHostStatus and remote-cli to the manager. Supervisor coverage asserts the bounded 1,1,2,2,2 sequence; the manager-to-doctor regression asserts attempt 2. Both GitHub review threads are resolved.

### F-003 — major — FIXED

The prior unrelated core timeout was repaired and merged separately as CORE-104. The exact rebased head's hosted workflow 32814833102 is terminal green: verify passed in 4m49s and kanmer-gate passed in 46s. Its gate snapshot predates this replacement attestation, so the gate must be refreshed before merge; no failing required check remains.

## Evidence and decision

Reviewer commands on the exact worktree all exited 0: npm run test:http -w @kanmer/mcp-server (102 tests), npm exec vitest run -- src/main/remoteAccess/manager.test.ts (12 tests), npm run typecheck, and git diff --check e958ff2c182373a5461856e60d1a563f37d32b3d...76abfc07fdf218588a0f0940842eacaaa0c0e1e4. GitHub has no unresolved review thread or ordinary PR comment. Packaged public-doctor and authenticated/unauthenticated remote MCP evidence is explicitly post-merge verification work and is not claimed by this review.

Verdict: PASS, contingent only on the post-attestation kanmer-gate refresh completing green at this unchanged head.
