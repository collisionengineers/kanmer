---
kind: review-attestation
pr: "263"
head_sha: "b992a34e2d54def121d2d65bfe95a600e14bf330"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "eb2abff500efd115"
ticket_updated: "2026-08-25T05:34:50.081Z"
findings:
  - id: F-001
    severity: major
    summary: "A restarting tunnel could be attested as connected."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The production remote-status protocol does not carry the supervisor restart attempt."
    disposition: open
---

# Independent re-review — GUI-138

## Scope and evidence

Re-reviewed PR #263 at exact head b992a34e2d54def121d2d65bfe95a600e14bf330 against the full packet, HZN-007 control context, and FRD-025. The current diff is limited to manager.ts and manager.test.ts. Reviewer checks on that exact worktree passed: focused manager suite 12/12, GUI typecheck, GUI build, and exact diff check. Hosted run 32813387803 is terminal green on this head: verify 3m29s and kanmer-gate 1m0s.

## Finding dispositions

### F-001 — major — FIXED

Provider restarting maps to degraded, preventing the doctor snapshot from claiming connected during restart backoff. The regression drives ready to restarting and proves TUNNEL_PROCESS_READY fails from the non-connected snapshot.

### F-002 — major — OPEN: the test fabricates a field the production protocol never emits

The manager accepts a positive status attempt and the test injects attempt 2, but the child cannot emit it in production. RemoteHostStatus defines local, provider, publicVerification, endpoint, and reason only; TunnelSupervisor onState supplies only a state string; remote-host forwards that status unchanged; and remote-cli serializes that same status to the GUI process. Thus every real restarting event lacks attempt, so providerAttempt remains its locally initialized value 1 and the doctor snapshot is still not the child/supervisor's actual lifecycle attempt.

Propagate an owned positive attempt from TunnelSupervisor through RemoteHostStatus and remote-cli to the manager, then prove the production status protocol (not a hand-authored GUI test event) reaches the doctor snapshot. Update the packet plan/files/report for the required MCP-server path before implementation. Do not weaken or remove the attempt assertion.

## Merge decision

The new GitHub P2 thread at manager.ts:785 remains open and the earlier resolution is being corrected because its attempt requirement is not actually satisfied. A green CI rail does not override this semantic defect. No merge or board move is authorized. Packaged public-doctor and remote MCP proof remain merged-main verification work and are not claimed here.
