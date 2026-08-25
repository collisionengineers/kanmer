---
kind: review-attestation
pr: "263"
head_sha: "9705b3175ad802fd2f9eacaaaca857d685f65694"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "eb2abff500efd115"
ticket_updated: "2026-08-25T05:25:13.236Z"
findings:
  - id: F-001
    severity: major
    summary: "A restarting tunnel can be attested as connected."
    disposition: open
---

# Independent review — GUI-138

## Scope and evidence

Reviewed PR #263 at exact head `9705b3175ad802fd2f9eacaaaca857d685f65694` against the complete GUI-138 packet, HZN-007 context, and FRD-025. The two-file scope, use of a doctor-child-only environment value, configured hostname/fingerprint, and non-secret opaque generation are otherwise aligned with the packet. Local reviewer checks passed: `npm exec vitest run -- src/main/remoteAccess/manager.test.ts` (12/12), `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, and the PR diff check. Hosted `verify` and `kanmer-gate` on run 32812758769 passed, but the gate predates this review record.

## Findings

### F-001 — major — OPEN: restarting tunnel is reported as connected

`readLine` maps a child `provider: "restarting"` event to the existing record state. If the record was previously ready, its tunnel status stays `connected`; the new doctor snapshot then serializes `state: "connected"` and `attempt: 1` even though the supervisor is in restart backoff and no provider child is ready. Public doctor can therefore pass `TUNNEL_PROCESS_READY` and run dependent public checks on fabricated readiness. This violates the ticket’s truthful manager-owned readiness objective and FRD-025 tunnel lifecycle/doctor requirements.

Fix the manager’s handling of a restarting provider status so it becomes a non-connected owned state before snapshot creation, and add a regression that proves the restart window cannot pass tunnel readiness. Preserve the fail-closed behavior; do not solve this by weakening doctor checks or inventing provider status.

## Disposition and residual risk

F-001 is open; no merge is authorized for this head. GitHub has no other review threads or comments requiring a disposition. Post-merge packaged/public doctor verification remains separate work and is not claimed here.
