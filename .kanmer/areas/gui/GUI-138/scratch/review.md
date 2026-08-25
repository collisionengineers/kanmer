---
kind: review-attestation
pr: "263"
head_sha: "76abfc07fdf218588a0f0940842eacaaa0c0e1e4"
verdict: needs-changes
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
  - id: F-004
    severity: major
    summary: "Supervisor attempt resets with retry budget and diverges from the provider's monotonic launch attempt after a stable-period reset."
    disposition: open
  - id: F-005
    severity: major
    summary: "The doctor snapshot labels the remote ready token id as auth generation instead of using the verifier fingerprint."
    disposition: open
  - id: F-006
    severity: major
    summary: "The doctor snapshot records doctor invocation time as provider transition time."
    disposition: open
---

# Independent re-review — GUI-138

## Reviewed inputs

Reviewed PR #263 at exact head 76abfc07fdf218588a0f0940842eacaaa0c0e1e4, rebased onto CORE-104 merge e958ff2c182373a5461856e60d1a563f37d32b3d, against the complete packet, HZN-007 control context, and FRD-025. The exact diff remains the six planned lifecycle/status files. Reviewer evidence is green: MCP HTTP/remote suite 102/102, GUI manager suite 12/12, all-workspace typecheck, and exact diff check. The post-attestation rerun of workflow 32814833102 is terminal green: kanmer-gate 57s and verify 4m21s.

## Dispositions

### F-001 — major — FIXED

Restarting maps to degraded and the manager-to-doctor test requires TUNNEL_PROCESS_READY to fail during restart backoff.

### F-002 — major — FIXED

Attempt propagation is now present from supervisor through RemoteHostStatus and remote-cli to the GUI, with the manager regression asserting attempt 2.

### F-003 — major — FIXED

CORE-104 repaired the unrelated hosted core timeout. The exact rebased head passes both required hosted checks.

### F-004 — major — OPEN

TunnelSupervisor emits this.restarts + 1 as the provider attempt. Its stable-period branch resets restarts before a later exit, while CloudflaredAdapter's owned TunnelStatus attempt remains monotonic across launches. After that reset the GUI doctor snapshot can report attempt 2 while the actual adapter lifecycle is at attempt 3 or higher. Track a separate monotonic launch/provider attempt and add the stable-reset regression. GitHub thread PRRT_kwDOT2PEds6b8_ga is unresolved.

### F-005 — major — OPEN

remote-cli emits both verifier.tokenId and verifier.fingerprint, while its remote host starts the tunnel with the fingerprint. Manager readLine stores tokenId in status.generation, then the doctor snapshot serializes it as authGeneration. Thus a normal remote identifier is mislabeled as a sha256 auth-generation value; the regression fabricated a sha256 token id and did not exercise the production values. Preserve event.fingerprint for the snapshot, or omit authGeneration absent a valid fingerprint, and cover the real ready event. GitHub thread PRRT_kwDOT2PEds6b8_ge is unresolved.

### F-006 — major — OPEN

manager.doctorNow emits action diagnosing before serializing KANMER_TUNNEL_STATUS_JSON. emit updates status.updatedAt for every UI action, so changedAt represents doctor start rather than the connected/degraded/restarting provider transition. Keep a dedicated provider-transition timestamp and prove diagnostic-action updates do not overwrite it. GitHub thread PRRT_kwDOT2PEds6b8_gi is unresolved.

## Decision

The new three exact-head P2 threads are substantiated and have no acceptable-risk or deferred disposition. This needs-changes attestation supersedes the prior PASS. Do not merge or move GUI-138 until the corrections are implemented, all threads are resolved, a current-head review attestation passes, and the required checks are green again. Packaged public-doctor and remote MCP evidence remains strictly post-merge verification work.
