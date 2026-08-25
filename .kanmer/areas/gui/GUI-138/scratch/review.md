---
kind: review-attestation
pr: "263"
head_sha: "b9aad2764564b487dfd8119bc933fd833c85d262"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "eb2abff500efd115"
ticket_updated: "2026-08-25T05:31:25.952Z"
findings:
  - id: F-001
    severity: major
    summary: "A restarting tunnel could be attested as connected."
    disposition: fixed
  - id: F-002
    severity: minor
    summary: "The tunnel snapshot hard-codes attempt 1 instead of preserving the child attempt."
    disposition: open
---

# Independent re-review — GUI-138

## Scope and evidence

Re-reviewed PR #263 at exact head `b9aad2764564b487dfd8119bc933fd833c85d262` against the complete packet, HZN-007 context, and FRD-025. The diff remains restricted to `manager.ts` and `manager.test.ts`; it has no provider, DNS, endpoint, secret, dependency, or doctor-semantics change. Reviewer checks on the exact PR content passed: focused manager tests 12/12, GUI typecheck, GUI build, and diff check.

## Finding dispositions

### F-001 — major — FIXED

The new `provider: "restarting" → "degraded"` mapping ensures the manager-derived snapshot is non-connected during restart backoff. The regression drives ready → restarting and makes the mock doctor fail `TUNNEL_PROCESS_READY` unless the snapshot actually says connected. This resolves the prior false-readiness safety defect.

### F-002 — minor — OPEN: restart attempt is still fabricated

The corrected regression deliberately emits child status `attempt: 2`, but `readLine` still ignores that value and snapshot serialization still emits `attempt: 1`. Thus the snapshot does not preserve its claimed manager-owned lifecycle attempt after a restart. This does not reintroduce the false-connected doctor pass, but it makes the diagnostic lifecycle metadata untruthful and leaves the original review thread’s explicit attempt requirement only partially addressed.

Persist/forward the manager-owned attempt from remote status events and assert the snapshot contains `2` in this regression. Do not weaken the test or remove the attempt field.

## Hosted state and merge decision

Required hosted `kanmer-gate` is green. Required hosted `verify` run 32813167087 is red: an unrelated core test, `KanmerStore > validates area only when the board defines areas; empty area always legal`, timed out at Vitest’s 5-second limit (309/310 passed). This failure is preserved and is not attributed to the GUI diff, but a required red check cannot support a merge. The previous GitHub P2 thread remains unresolved; its connected-state portion is fixed, but it must be dispositioned/resolved after the attempt correction.

No merge is authorized for this head. Packaged/public doctor and MCP evidence remain post-merge verification work and are not claimed here.
