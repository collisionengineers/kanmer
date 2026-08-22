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
