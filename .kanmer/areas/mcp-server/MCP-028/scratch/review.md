---
kind: review-attestation
pr: "154"
head_sha: "45449d0f4935b8cc1193eeaf7cc4b5227f468f08"
verdict: pass
reviewer: "root"
independent: true
plan_hash: "0b4fccdb467e66c9"
ticket_updated: "2026-08-22T05:24:14.432Z"
findings:
  - id: F-001
    severity: major
    summary: "Protected verifier/client has no public doctor invocation or sanitized doctor result path"
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Remote lifecycle proves create and gate refusal but not document update/readback/archive and activity/version evidence"
    disposition: fixed
  - id: F-003
    severity: minor
    summary: "New remote-public evidence helpers are unreachable and duplicate the active policy evaluator"
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "Session-close errors are swallowed and fixture cleanup idempotence is not asserted"
    disposition: fixed
---

## Review scope

Independently reviewed PR #154 at head 45449d0f4935b8cc1193eeaf7cc4b5227f468f08 against the MCP-028 plan, FRD-025, ADR-0017, the complete ticket checklist, predecessor remote-access evidence, the Worker-shaped client contract, and the remediation diff. The remediation wires the public doctor matrix through the protected client seam, proves document version/readback, item update/readback, gate refusal, archive, and activity evidence, uses the single deterministic evidence evaluator, and surfaces client/fixture cleanup failures. Local rails PASS: HTTP 63/63, deterministic remote integration 2/2, doctor 9/9 when run from the package workspace, build:server, typecheck, and mcpb sync. Hosted verify PASS run 32554249103/job 96985834506.

## Findings and dispositions

- F-001 fixed: runRemotePublicClient now invokes runDoctor through a deterministic protected-client fixture seam and records status, exit code, and sanitized counts; the public doctor check is asserted by the integration test.
- F-002 fixed: mutate mode now writes and reads a research document with version/canary, updates and reads the item, observes gate refusal, archives and reads the disposable item, and records activity entries. Fixture teardown removes the isolated board.
- F-003 fixed: deterministicChecks is the single active policy evaluator used by the client; remote-public.ts delegates protected inconclusive checks to the shared helper.
- F-004 fixed: client close failures are captured and make the returned boundary checks fail; the fixture test calls close twice and asserts the root is gone.

The real Cloudflare Tunnel, public DNS/TLS, disposable Worker deployment, bearer rotation/restart, degradation recovery, and GUI multi-project lanes remain INCONCLUSIVE because this environment has no protected credentials, cloudflared executable, or tunnel endpoint. No external capability is inferred from the local fixture.
