---
kind: review-attestation
pr: "154"
head_sha: "41ba4e3fb906b5619606daf3b88ed75db653099d"
verdict: needs-changes
reviewer: "root"
independent: true
plan_hash: "0b4fccdb467e66c9"
ticket_updated: "2026-08-22T05:17:07.036Z"
findings:
  - id: F-001
    severity: major
    summary: "Protected verifier/client has no public doctor invocation or sanitized doctor result path"
    disposition: open
  - id: F-002
    severity: major
    summary: "Remote lifecycle proves create and gate refusal but not document update/readback/archive and activity/version evidence"
    disposition: open
  - id: F-003
    severity: minor
    summary: "New remote-public evidence helpers are unreachable and duplicate the active policy evaluator"
    disposition: open
  - id: F-004
    severity: minor
    summary: "Session-close errors are swallowed and fixture cleanup idempotence is not asserted"
    disposition: open
---

## Review scope

Independently reviewed PR #154 at head 41ba4e3fb906b5619606daf3b88ed75db653099d against the MCP-028 plan, FRD-025, ADR-0017, the full 158-item checklist, predecessor MCP-021/025/026/027 evidence, the Worker-client roadmap amendment, and the complete diff. Local deterministic rails reported by the author are core 269, GUI 362, HTTP 63/63, scripts 83/83, manual freshness, typecheck, and mcpb byte checks; hosted verify run 32553943168/job 96985075079 was still pending at review time.

## Findings

- F-001 open: the protected operator script only checks cloudflared presence and invokes the MCP client. It has no public doctor command/result input or sanitized doctor evidence, although the ticket and roadmap require public doctor health in the complete run.
- F-002 open: runRemotePublicClient creates a disposable item and attempts a gate-blocked move, but does not perform the required document update/readback/version/hash/activity assertion or archive/delete the disposable ticket. Fixture root deletion is not a substitute for the named ticket lifecycle proof.
- F-003 open: remote-public-evidence.ts exports deterministicChecks and protected inconclusive checks that no test or operator script calls, while remote-public.ts implements a second policy evaluator. This leaves duplicate/unreachable evidence code in the shipped surface.
- F-004 open: client.close errors are caught and discarded, and fixture close is only called once without an idempotence assertion; cleanup failures therefore cannot surface as required.

The real Cloudflare Tunnel, public DNS/TLS, disposable Worker deployment, bearer, rotation/restart, and GUI multi-project lanes remain INCONCLUSIVE because this environment has no protected credentials or tunnel. No external capability is inferred from the local fake boundary.
