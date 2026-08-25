---
kind: review-attestation
pr: "263"
head_sha: "b992a34e2d54def121d2d65bfe95a600e14bf330"
verdict: pass
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
    severity: minor
    summary: "The tunnel snapshot hard-codes attempt 1 instead of preserving the child attempt."
    disposition: fixed
---

# Independent review — GUI-138

## Scope and governing contract

Reviewed PR #263 at exact head b992a34e2d54def121d2d65bfe95a600e14bf330 against the full GUI-138 packet, HZN-007 control context, and FRD-025. The three commits alter only manager.ts and manager.test.ts. The change passes an allowlisted, manager-owned Cloudflare readiness snapshot solely to the doctor child; it neither changes provider/DNS/doctor semantics nor adds dependencies, secrets, credentials, endpoint protocol, or updater behavior.

The snapshot contains only state, provider, positive lifecycle attempt, timestamp, public endpoint, project fingerprint, and opaque auth generation. It excludes bearer, secret, credential content, and raw provider output. Existing generation-conflict checks remain intact.

## Finding dispositions

### F-001 — major — FIXED

The manager maps the child provider restarting state to degraded, so it cannot serialize a connected tunnel during restart backoff. The regression drives ready to restarting and proves the mocked doctor fails TUNNEL_PROCESS_READY from the resulting non-connected snapshot.

### F-002 — minor — FIXED

The manager now owns providerAttempt, initializes it for a fresh runtime, accepts only positive integer attempts from child status events, and serializes that value to the doctor. The restart regression emits attempt 2 and asserts the snapshot reports attempt 2. This fully resolves the remaining lifecycle-metadata portion of the GitHub P2 thread.

## Evidence and merge decision

Reviewer commands on the exact worktree all exited 0: focused manager suite (12/12), GUI typecheck, GUI build, and exact diff check. Hosted run 32813387803 is terminal green on this head: verify passed in 3m29s and kanmer-gate passed in 1m0s. The sole GitHub review thread is addressed by F-001/F-002 and is being resolved; no other comments or blockers remain.

This is an independent PASS. Packaged public-doctor and remote MCP proof is deliberately deferred to merged-main verification; it is not claimed by this review.
