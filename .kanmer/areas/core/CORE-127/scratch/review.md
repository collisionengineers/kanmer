---
kind: review-attestation
pr: "307"
head_sha: "7d899869523ac5b55ef2debbf67d0324ebe4fb78"
verdict: needs-changes
reviewer: "Codex subagent /root/core127_final_review"
independent: true
plan_hash: "07b4c609bc102b46"
ticket_updated: "2026-08-31T23:27:52.038Z"
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
    summary: "Compile-time glob proof did not bound alphabet transitions, queues or caches."
    disposition: fixed
  - id: F-011
    severity: major
    summary: "Free-form allowed-symbol authority could not prove changed source ranges."
    disposition: fixed
  - id: F-012
    severity: major
    summary: "Ticket, document and group limits were applied after full reads."
    disposition: fixed
  - id: F-013
    severity: note
    summary: "Group-card metadata is not retained evidence when context.md is unchanged."
    disposition: rejected-with-reason
    reason: "The approved retained evidence contract binds group context.md; group-card metadata remains double-sampled issuance metadata."
  - id: F-014
    severity: major
    summary: "A prechecked successor step can bypass packet issuance and reconciliation."
    disposition: open
  - id: F-015
    severity: major
    summary: "Bounded authority decoding strips UTF-8 BOM bytes and diverges from normal revision/CAS readers."
    disposition: open
  - id: F-016
    severity: blocker
    summary: "A clean tracked symlink can mutate outside the worktree without appearing in either workspace snapshot."
    disposition: open
---

# Independent exact-head review — CORE-127 / PR #307

Reviewed exact base `4fda54b4489fa4bc4b6b091c2af67715245ffa08` through exact head `7d899869523ac5b55ef2debbf67d0324ebe4fb78` after the hosted verifier and expected automated reviewer settled on that head. The worktree was clean and `git diff --check` passed.

The clean Windows `npm run verify` rail passed at this head from 2026-08-31T23:29:36.9215632Z through 2026-08-31T23:41:13.1373612Z on Node v24.15.0 and npm 11.14.1. Hosted `verify` passed in Actions run 33450867582, job 99680222069. Those results become historical when remediation changes source. `kanmer-gate` is correctly red because this needs-changes attestation and the current review threads block merge.

## Independent evidence

- Core focused suites: 206/206 PASS.
- Workspace collector suite: 24/24 PASS.
- `git diff --check`: PASS.
- 16 GitHub review threads remain unresolved; seven are current at this exact head.
- No source, board, PR, GitHub or release state was mutated by the reviewer, and no duplicate full verification rail ran.

## Prior findings

F-001 through F-012 remain fixed across their affected callers, contracts and focused tests. F-013 remains rejected-with-reason: the approved retained shared-evidence contract binds `<group-id>/context.md`; group-card metadata is double-sampled issuance metadata, so adding it as persisted packet authority would expand the product contract without a release criterion.

## Blocking findings

### F-014 — major: prechecked successor bypass

A checklist state of `[false, true]` compiles and strict-verifies for step 1. After step 1 is checked, `nextStepIndex` sees every step complete, so step 2 never receives a packet or prior-step reconciliation. Compilation and strict verification must enforce one marker-level frontier: earlier mapped steps are complete, the selected step contains unchecked work, and no later mapped marker is checked. Verification must derive those states from the exact checklist bytes rather than trusting re-signed packet metadata.

### F-015 — major: BOM identity divergence

The bounded authority reader uses the default UTF-8 decoder BOM behavior, while canonical store reads retain U+FEFF. A BOM-prefixed fixture produced different normal/bounded document versions (`ebae2455941ee397` vs `eb390bca77822856`) and revisions (`rev1:0f75c489c47349d3` vs `rev1:f361d2863e0f1bd1`). Bounded decoding must preserve UTF-8 BOM bytes while remaining fatal on invalid UTF-8. Checklist parsing must recognize exactly one leading BOM without removing it from hashed authority or allowing it to change during the authorised marker transition.

### F-016 — blocker: clean tracked-link escape

A clean committed Git mode-`120000` link pointed outside the worktree. Writing through it changed external bytes while porcelain status remained empty and both bounded snapshots returned `ok: true`, `entries: []`. The shared snapshot collector must census tracked index modes and immutable object identities before both issuance and reconciliation, then fail closed for a link whose target cannot be proven confined to the physical worktree. Escaping, dangling, unreadable, unstable and budget-exhausted links must refuse. A clean internal link may remain supported only when its physical target is proven inside the worktree and its link/target identity participates in both samples. Gitlinks must also fail closed.

## Required consolidated remediation

1. Enforce the checklist frontier and content-derived step states in both packet compilation and strict verification.
2. Preserve BOM identity in the metadata-first bounded authority reader and BOM-aware checklist parsing while retaining invalid-UTF-8 refusal.
3. Extend the single bounded index census to cover modes/OIDs and physically confined tracked-link targets in both workspace samples.
4. Add focused negative and drift tests, update affected prose guards only where the contract changes, and regenerate the existing MCP bundle.
5. Add no tool, writer, stage, dependency, schema, board rewrite or unrelated feature.

## Decision

NEEDS CHANGES. Return the existing branch, worktree, lease and PR to Implementing for one consolidated F-014/F-015/F-016 root-cause remediation. Then require fresh exact-head automated settlement, one bounded independent delta review over all findings and changed callers, a clean Windows rail, hosted `verify`, synced-board `kanmer-gate`, merge and exact-merge verification.
