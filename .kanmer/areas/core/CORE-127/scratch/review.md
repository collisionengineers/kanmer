---
kind: review-attestation
pr: "307"
head_sha: "5302e445dc70714e89762dc19fb96754490e3fa9"
verdict: needs-changes
reviewer: "Codex subagent /root/core127_audit"
independent: true
plan_hash: "e6a8ce9e627e5392"
ticket_updated: "2026-08-31T22:05:07.511Z"
findings:
  - id: F-001
    severity: major
    summary: "Recursive runtime glob matching could revisit states exponentially."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "A selected constrained step could lack a checklist marker."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Checklist newline normalization could accept a whole-document EOL rewrite."
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "Duplicate group evidence could make an emitted packet fail its own verifier."
    disposition: fixed
  - id: F-005
    severity: blocker
    summary: "A linked worktree beneath the dedicated board could bypass protected-workspace checks."
    disposition: fixed
  - id: F-006
    severity: major
    summary: "Unique group references were resolved before their bounded census."
    disposition: fixed
  - id: F-007
    severity: major
    summary: "Literal path parsing and equality bypassed the shared runtime matcher budget."
    disposition: fixed
  - id: F-008
    severity: major
    summary: "Workspace validation and reading were not bound to one filesystem object."
    disposition: fixed
  - id: F-009
    severity: major
    summary: "Index flags could hide tracked edits from porcelain status."
    disposition: fixed
  - id: F-010
    severity: major
    summary: "Compile-time glob-language proof does not bound alphabet transitions, queue entries or move caches."
    disposition: open
  - id: F-011
    severity: major
    summary: "allowedSymbols is signed worker prose but actual same-file symbol changes are not reconciled."
    disposition: open
  - id: F-012
    severity: major
    summary: "Ticket, document and group byte limits are checked only after repeated full reads and allocation."
    disposition: open
  - id: F-013
    severity: note
    summary: "A later group title/body edit is not retained step evidence when context.md is unchanged."
    disposition: rejected-with-reason
---

# Independent exact-head delta review — CORE-127 / PR #307

Reviewed exact base `4fda54b4489fa4bc4b6b091c2af67715245ffa08` through exact head `5302e445dc70714e89762dc19fb96754490e3fa9` after the expected automated reviewer settled on that head.

The worktree was clean and `git diff --check` passed. Independent focused reruns passed 108/108 core plan/packet tests and 27/27 collector tests. The clean Windows `npm run verify` rail and hosted `verify` also passed at this exact head; those results become historical once remediation changes source.

## Prior findings

F-001 through F-009 are fixed and their affected contracts/tests remain green. F-010 is distinct from runtime matching: the exact NFA relation proof caps processed product states but not the full literal alphabet crossed with those states, queue-before-dedup work, or move-cache growth.

## Blocking findings

### F-010 — major

Add one aggregate proof-work budget covering alphabet construction, epsilon closure, transition scans, cache insertion and queue work. Deduplicate product states before enqueue. Exhaustion must remain `null` and surface as `PLAN_GLOB_COMPLEXITY`. Prove large distinct-alphabet containment and intersection exhaustion.

### F-011 — major

`allowedSymbols` is compiled, hashed and current-plan checked, but `StepReconciliationFacts` contains no collector-derived changed-symbol scope. A change to a different symbol in an allowed file can therefore PASS. Add bounded collector-derived scope evidence; every observed changed symbol must be authorised and unsupported or ambiguous resolution must be typed INCONCLUSIVE. Never accept a worker summary as proof.

### F-012 — major

`documentSample`, core revision reads, fixed/inventory reads and group reads allocate full contents before the packet budget is checked, and the double sample repeats them. Add a metadata-first bounded snapshot path that counts canonical ticket/document/group paths, then reads the ticket record, counted documents, group records and contexts through capped handles under one aggregate byte budget. Compute versions and revision from those bounded bytes. Real limit+1 and aggregate overflow fixtures must refuse before full allocation.

## Non-blocking disposition

F-013 is rejected as a current-scope defect. The retained shared evidence contract explicitly binds `<group-id>/context.md`; the live CORE-127 plan and HZN-008 place binding constraints there. Group kind/title/body are issuance-coherence response metadata, double-sampled around Git, not retained step evidence. Expanding retained authority to every group record field is a product-contract change and is not required for this release acceptance.

## Decision

NEEDS CHANGES. Return the existing branch, worktree and PR to Implementing for one consolidated F-010/F-011/F-012 root-cause remediation. Do not create follow-up tickets or expand the roster. After source changes, require fresh exact-head automated settlement, one bounded independent delta review, a clean Windows rail, hosted `verify`, synced-board `kanmer-gate`, merge and exact-merge verification.
