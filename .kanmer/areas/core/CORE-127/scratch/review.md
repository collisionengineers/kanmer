---
kind: review-attestation
pr: "307"
head_sha: "437c7182021137eae962228942b712b2045cdc57"
verdict: needs-changes
reviewer: "GitHub Codex exact-head review plus independent /root CORE-127 audits"
independent: true
plan_hash: "2b6c6392f7f58292"
ticket_updated: "2026-09-01T00:21:26.216Z"
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
    reason: "The approved retained shared-evidence contract binds group context.md; group-card metadata remains double-sampled issuance metadata."
  - id: F-014
    severity: major
    summary: "A prechecked successor step could bypass packet issuance and reconciliation."
    disposition: fixed
  - id: F-015
    severity: major
    summary: "Bounded authority decoding stripped UTF-8 BOM bytes and diverged from normal revision/CAS readers."
    disposition: fixed
  - id: F-016
    severity: blocker
    summary: "A clean tracked symlink could mutate outside the worktree without appearing in workspace snapshots."
    disposition: fixed
  - id: F-017
    severity: major
    summary: "Date-valued passthrough ticket metadata collapses to empty object authority and can evade revision staleness."
    disposition: open
  - id: F-018
    severity: blocker
    summary: "A tracked symlink chain may leave the worktree and return inside while its external hop remains unbound."
    disposition: open
  - id: F-019
    severity: major
    summary: "Batch manifests and the transitive ticket census are read and parsed before bounded execution-authority checks."
    disposition: open
  - id: F-020
    severity: blocker
    summary: "A clean tracked regular file may already be hard-linked outside the worktree at packet issuance."
    disposition: open
  - id: F-021
    severity: minor
    summary: "Two hosted handle-race tests pass an unphysical temporary-root alias and fail before their intended race hooks."
    disposition: open
---

# Consolidated exact-head review — CORE-127 / PR #307

Reviewed exact base `4fda54b4489fa4bc4b6b091c2af67715245ffa08` through exact head `437c7182021137eae962228942b712b2045cdc57`. GitHub's expected automated review settled on this head at 2026-09-01T00:31:45Z. The implementation worktree is clean.

A clean local Windows `npm run verify` passed at this exact head from 2026-09-01T00:23:28.0186862Z through 2026-09-01T00:33:53.2609777Z on Node v24.15.0 and npm 11.14.1. Hosted Actions run 33454522677 failed 210/212 only because two direct handle-reader tests used the raw `fs.mkdtemp` spelling rather than its physical `realpath`; production already physicalizes the worktree before calling the reader. That required check remains red until the fixtures are corrected and rerun.

## Prior findings

F-001 through F-012 remain fixed across their affected callers and tests. F-013 remains rejected-with-reason under the approved group-context evidence contract. F-014 through F-016 are fixed at this head and their focused and authoritative local suites pass.

## Current exact-head findings

Independent disposable reproductions confirmed all four production findings:

- F-017 changed an unknown YAML timestamp plus the exact checklist tick. Raw revisions differed, `itemAuthority` remained identical, and reconciliation incorrectly returned PASS. Date values need a distinct deterministic authority encoding, while invalid dates, non-finite numbers, cycles and unsupported object prototypes refuse.
- F-018 used a clean tracked link that traversed an external intermediate link and returned in-worktree. Equal before/after snapshots allowed an outside victim to change. Every link hop must stay confined; only the already-supported direct confined target remains admissible.
- F-019 showed a 2 MiB manifest and 2 MiB ticket records are read before the packet budget. Batch facts must join the core metadata-first authority snapshot with bounded manifest and complete warning-aware ticket censuses, reusing exact handle reads.
- F-020 showed a clean mode-100644 file with two links is accepted at issuance and can mutate an outside inode before later refusal. Both samples must metadata-check every already-bounded tracked regular entry before dispatch.
- F-021 is test-only but blocks the hosted required check: retain the allocated temp root for cleanup and pass its physical `realpath` into the direct reader tests.

## Required single remediation

1. Close F-017 with type-distinct, bounded ticket-authority canonicalization and end-to-end stale-authority tests.
2. Close F-018/F-020 at the shared tracked-index/filesystem-alias boundary, retaining direct confined links and refusing chained or multi-link authority before dispatch.
3. Close F-019 by folding bounded batch state into `ExecutionAuthoritySnapshot`; leave ordinary batch mutation, closeout and merge-gate paths unchanged.
4. Close F-021 without broadening error assertions or changing production behavior.
5. Update only already-authorized source, tests, canonical prose where the contract needs clarification, and the generated MCP bundle. Add no tool, schema, dependency, stage, writer or unrelated behavior.

## Decision

NEEDS CHANGES. Return the existing branch, worktree, lease and PR to Implementing for this one root-cause replan. Then require fresh exact-head hosted and local verification, automated settlement, one independent delta review over F-001 through F-021 and affected callers, synced-board `kanmer-gate`, merge and exact-merge verification.
