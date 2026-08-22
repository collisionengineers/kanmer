---
kind: review-attestation
pr: "168"
head_sha: "4f106865947e556759aeb88363ea9aab7c01beac"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: pass
reviewer: "codex-root"
independent: true
plan_hash: "a0b32fae7b9b14f9"
ticket_updated: "2026-08-22T13:20:30.915Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Completed administrator handoff is recognized"
    disposition: fixed
    reason: "CORE-048 and CORE-052 refresh the requested destination and preserve mismatch state."
  - id: F-002
    severity: major
    summary: "No-board protected preference transition is guarded"
    disposition: fixed
    reason: "The guard retains the protected default when no Git board is open."
  - id: F-003
    severity: blocker
    summary: "Hosted gate consumes configured board branch"
    disposition: fixed
    reason: "The workflow reads KANMER_BOARD_BRANCH with the documented fallback; rerun 32575453101 passed kanmer-gate."
  - id: F-004
    severity: minor
    summary: "Protection inference is conservative"
    disposition: accepted-risk
    reason: "ADR-0016 excludes a GitHub protection API/App; literal protected-default inference is the documented boundary."
  - id: F-005
    severity: blocker
    summary: "Merged child dependency is unblocked"
    disposition: fixed
    reason: "CORE-048 and CORE-052 child edges are removed after their non-squash merges."
  - id: F-009
    severity: blocker
    summary: "Actions-variable handoff documentation"
    disposition: fixed
    reason: "Workflow comment, Settings, board-sync/settings manuals, troubleshooting, and generated guidance name KANMER_BOARD_BRANCH."
  - id: F-010
    severity: blocker
    summary: "Requested destination equality"
    disposition: fixed
    reason: "refreshBoardBranch marks any non-destination live branch as mismatch and paused; child guards skip all rename paths."
  - id: F-011
    severity: major
    summary: "Paused/error state preservation"
    disposition: fixed
    reason: "Refresh retains existing error/paused state on a valid handoff and surfaces mismatch state otherwise."
  - id: F-012
    severity: major
    summary: "Troubleshooting guidance contradiction"
    disposition: fixed
    reason: "The protected-default refusal and retarget-first sequence are documented and the manual is regenerated."
  - id: F-EXTERNAL
    severity: minor
    summary: "Live protection retarget proof"
    disposition: accepted-risk
    reason: "No authorized GitHub protection mutation or real protected-branch handoff was available; deterministic and hosted gate evidence is recorded, but live protection remains INCONCLUSIVE."
---

## Fresh cumulative independent review — CORE-043 / PR #168

The exact cumulative head is 4f106865947e556759aeb88363ea9aab7c01beac, containing the original implementation plus CORE-048 and CORE-052/054/055 non-squash merges. I reread the full packet, all prior findings, FRD-020, ADR-0016, and the exact diff. The implementation now documents KANMER_BOARD_BRANCH, validates branch equality before accepting a handoff, preserves paused/error state, and blocks both rename paths on mismatch. The generated/manual surfaces agree with the workflow.

Evidence: exact detached-head GUI Git 12/12 PASS; build:core, manual 22 chapters, verify-docs, scripts 89/89, and diff-check PASS; hosted rerun 32575453101 passed both kanmer-gate and verify. Broad dispatch/provider typecheck/build and live GitHub protection mutation remain explicitly preserved boundaries.

Verdict: PASS. Merge non-squash into main, then move CORE-043 to Verifying. Do not verify or clean up in this review step.

--- Prior review history ---

---
kind: review-attestation
pr: "168"
head_sha: "11930038542d402865bb26a23787d7d3cad3e2c5"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "a0b32fae7b9b14f9"
ticket_updated: "2026-08-22T12:04:34.929Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Completed administrator handoff is recognized"
    disposition: fixed-in-child
    reason: "CORE-048 refreshes the open worktree branch before protected-transition decisions; focused regression evidence is present."
  - id: F-002
    severity: major
    summary: "No-board protected preference transition is guarded"
    disposition: fixed-in-child
    reason: "guardGitBranchPreference retains the protected default when no Git board is open and allows the requested branch once a board is available."
  - id: F-003
    severity: blocker
    summary: "Hosted gate consumes the configured board branch"
    disposition: fixed-in-child
    reason: "pr.yml reads KANMER_BOARD_BRANCH with the kanmer-board fallback and hosted workflow run 32571224767 completed success."
  - id: F-004
    severity: minor
    summary: "Protection inference remains a conservative branch-name boundary"
    disposition: accepted-risk
    reason: "ADR-0016 explicitly excludes a GitHub protection API/App. The literal protected default and retarget-first administrator handoff are an acknowledged bounded risk."
  - id: F-005
    severity: blocker
    summary: "Merged CORE-048 dependency is unblocked"
    disposition: fixed-in-child
    reason: "CORE-048 is Verifying with blocks empty, and hosted run 32571224767 is successful."
  - id: F-009
    severity: blocker
    summary: "Administrator handoff omits the KANMER_BOARD_BRANCH repository-variable step"
    disposition: open
    reason: "The new workflow reads vars.KANMER_BOARD_BRANCH, but Settings, board-sync manual, and the handoff text do not instruct the administrator to create/update this variable. Without it, the documented rename can leave kanmer-gate on the stale default."
  - id: F-010
    severity: blocker
    summary: "Refresh accepts any branch mismatch as a completed handoff"
    disposition: open
    reason: "refreshBoardBranch replaces the cached branch with any observed actual branch and clears state without checking that it equals the requested destination. A typo/intermediate branch can therefore be renamed, pushed, and potentially have its remote ref deleted."
  - id: F-011
    severity: major
    summary: "Branch refresh clears paused sync errors"
    disposition: open
    reason: "refreshBoardBranch returns error:null and paused:false for any branch mismatch. A conflict-paused project can lose its visible error and resume sync before a successful sync resolves the conflict."
  - id: F-012
    severity: major
    summary: "Troubleshooting manual contradicts the protected-default refusal"
    disposition: open
    reason: "docs/manual/troubleshooting.md still instructs users to rename through Settings and says closed projects are migrated automatically, contradicting the retarget-first refusal documented in board-sync and Settings."
  - id: F-THREADS
    severity: major
    summary: "Current PR #168 inline findings remain unresolved"
    disposition: open
    reason: "The fresh F-009 through F-012 findings are current-head comments and are not covered by the prior child attestation. They must be fixed or explicitly accepted before merge; the older F-001 through F-004 findings are dispositioned above."
  - id: F-EXTERNAL
    severity: minor
    summary: "Live protection retarget remains unavailable"
    disposition: inconclusive
    reason: "No GitHub protection API mutation or real protected-branch handoff was attempted. Local and hosted checks do not prove live protection state."
---
# Independent review - CORE-043 cumulative head

## Verdict

NEEDS-CHANGES for PR #168 at exact cumulative head 11930038542d402865bb26a23787d7d3cad3e2c5, based on main 34245be039e8fd8395b5e31835602c54e62e98a4. CORE-048 closes the original three code blockers, clears the board dependency, and hosted run 32571224767 is successful. The current head nevertheless has four fresh documentation/state-safety blockers. No source, merge, move, or cleanup was performed.

## Scope and lineage

The cumulative compare is three commits and ten changed files. CORE-048 PR #170 was merged non-squash into CORE-043 at 11930038542d402865bb26a23787d7d3cad3e2c5. The ticket report and item record the cumulative implementation and child merge, while the PR body still carries the original commit-only summary.

## Finding audit

The original F-001 administrator-refresh, F-002 no-board guard, and F-003 workflow source findings are fixed, and CORE-048 has blocks empty. The current refreshBoardBranch implementation still accepts any observed branch as a completed handoff, clears paused/error state unconditionally, and allows later migration to rename an arbitrary typo/intermediate branch. The administrator instructions omit the repository Actions variable consumed by the workflow. The troubleshooting manual still contradicts the retarget-first refusal.

The literal kanmer-board protection inference remains an explicitly accepted ADR-0016 risk, not a new blocker.

## Evidence

- Focused GUI Git: 16/16 PASS.
- Workflow static rail: 1/1 PASS.
- Scripts after core build: 89/89 PASS.
- Core build, docs/manual checks, and diff check: PASS.
- Hosted run 32571224767: verify PASS and kanmer-gate PASS.
- Full GUI, all-workspace typecheck, and GUI build base dispatch/provider parity failures remain preserved from the packet.
- Live GitHub protection retargeting remains INCONCLUSIVE.

## Required disposition

Document the KANMER_BOARD_BRANCH repository-variable handoff, require observed branch equality with the requested destination, preserve paused/error state during refresh, and update troubleshooting.md plus generated manual. Then refresh the PR body/thread dispositions and request another independent review. No stage move or merge was performed.
