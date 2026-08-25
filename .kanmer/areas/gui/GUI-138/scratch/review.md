---
kind: review-attestation
pr: "263"
head_sha: "a8ff5a3a02618f3ff237feaafa6682aaeaebbc54"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "c454dbe71cb339a3"
ticket_updated: "2026-08-25T05:44:14.685Z"
findings:
  - id: F-001
    severity: major
    summary: "A restarting tunnel could be attested as connected."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The production remote-status protocol does not carry the supervisor restart attempt."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Required hosted verify is red on the exact head."
    disposition: open
---

# Independent re-review — GUI-138

## Scope and contract

Reviewed PR #263 at exact head a8ff5a3a02618f3ff237feaafa6682aaeaebbc54 against the full packet, HZN-007 control context, and FRD-025. The packet was correctly expanded to the real owned lifecycle path: supervisor, remote host status, CLI status JSON, GUI manager, and doctor boundary. The six changed source/test files are within that declared scope; no provider query, DNS/endpoint, secret, doctor semantic, dependency, or updater change is introduced.

The status payload remains allowlisted. It contains no bearer, credential content, raw provider output, or session material. The doctor snapshot remains a manager-owned copy containing only state, provider, attempt, timestamp, public endpoint, project fingerprint, and opaque auth generation.

## Finding dispositions

### F-001 — major — FIXED

Restarting maps to degraded in the manager, so a public doctor cannot receive connected during tunnel restart backoff. The manager-to-doctor boundary regression requires TUNNEL_PROCESS_READY to fail and asserts the degraded snapshot.

### F-002 — major — FIXED

TunnelSupervisor now emits its real bounded lifecycle attempt (covered by the 1,1,2,2,2 sequence); RemoteHostStatus carries the value; remote-cli serializes the exact status object; and the manager accepts only a positive integer before passing it to doctor. The restart regression asserts attempt 2 in the doctor snapshot. This resolves both GitHub P2 review threads without fabricating a test-only protocol field.

### F-003 — major — OPEN: required hosted verification is red

Exact-head Actions run 32813997180 has a green kanmer-gate but failed verify. The only failure is the unchanged core test KanmerStore > validates area only when the board defines areas; empty area always legal timing out at the 5-second limit (309/310 passed). This is reproducibly unrelated to GUI-138's six-file remote-status diff and is being handled by a separate bounded remediation, but a required red check prohibits merge.

## Local evidence and decision

Reviewer commands all exited 0 on the exact worktree: MCP test:http (102 tests), focused GUI manager suite (12 tests), all-workspace typecheck, GUI build, and exact diff check. The two original code-review threads are fixed and resolved. Packaged public-doctor and remote MCP proof remains post-merge verification work and is not claimed here.

Source review passes, but this attestation is needs-changes solely because required hosted verify is red. No merge or stage move is authorized until the exact-head required rail is green.
