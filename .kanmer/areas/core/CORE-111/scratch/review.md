---
kind: review-attestation
pr: "283"
head_sha: "2c2df04dd26a0ec783d803f6ae476890280d6880"
verdict: needs-changes
reviewer: "codex-independent-reviewer:/root/review_core111_release_notes"
independent: true
plan_hash: "0589afab5e9fc822"
ticket_updated: "2026-08-26T19:06:01.562Z"
findings:
  - id: "F-CORE111-001"
    severity: blocker
    summary: "Required kanmer-gate failed on the reviewed head because its fetched-board gate reported CORE-111 missing."
    disposition: open
---

# Independent review — CORE-111 / PR #283

## Scope and binding inputs

Reviewed PR #283 at exact head `2c2df04dd26a0ec783d803f6ae476890280d6880`, bound to plan version `0589afab5e9fc822` and ticket timestamp `2026-08-26T19:06:01.562Z`. This is an independent reviewer role, distinct from the PR author/release controller.

The PR is open and mergeable, has one commit, and changes exactly `apps/gui/release-notes.md` (+17/-0). The diff adds only the v0.3.12 release-note entries for the already-merged stabilization PRs: #281 (portable Windows Codex Connect launcher registration, probe failure surfacing, and replacement of the legacy generated registration) and #282 (resume only with the recorded branch and worktree). Its base is merge commit `6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38` for #281, whose parent is merged #282 commit `7b3d7e1ffab10ba0f518fbd3e16fe7d1c92a8759`.

This matches the approved CORE-111 preparation scope: release notes only before the governed release command runs from clean merged main. It also satisfies FRD-021 R3's prerequisite that release notes name the version. There are no PR reviews, conversation comments, or GitHub review threads on this head.

## Required checks

- `verify`: still in progress at review decision time.
- `kanmer-gate`: failed for this exact head in workflow run 33003298889 / job 98290395437. The check annotation is `kanmer/gate [NO_TICKET]`: “Kanmer ticket CORE-111 was not found on the fetched board”, and the job exited 1 during “Run the phase-2 merge gate”.

## Finding and disposition

- **F-CORE111-001 — blocker, open.** A required check is failed and the other required check is not yet complete. This prevents a valid independent pass and merge regardless of the narrowly correct release-note diff. The release controller must reconcile the board-gate visibility/fetch result and obtain fresh green required checks at a reviewed current head. No scope expansion or release publication was performed by this review.

## Decision

**Needs changes.** CORE-111 remains in Review. Do not merge this PR or move the ticket to Verifying based on this attestation. A new current-head review attestation is required only after both required checks are green and the live PR/head/thread state is re-gathered.
