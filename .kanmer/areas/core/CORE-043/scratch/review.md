---
kind: review-attestation
pr: "168"
head_sha: "e78323d7fb8ce695e40db80380d189e236726b25"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: needs-changes
reviewer: "codex-current-head-audit"
independent: true
plan_hash: "2026-08-22T18:39:56.633Z"
ticket_updated: "2026-08-22T18:39:56.633Z"
findings:
  - id: F-015
    severity: blocker
    summary: "Custom rename must update the Actions board-branch variable"
    disposition: deferred-to-ticket
    ticket: "GUI-112"
    reason: "Current PR #168 thread 3836130697 remains unresolved; GUI-112 owns the lifecycle and workflow handoff fix."
  - id: F-016
    severity: major
    summary: "Resolved handoff must clear only its generated pause/error"
    disposition: deferred-to-ticket
    ticket: "GUI-112"
    reason: "Current PR #168 thread 3836130700 remains unresolved; GUI-112 owns the state-lifecycle fix."
  - id: F-017
    severity: blocker
    summary: "Automatic sync must stop while handoff is paused"
    disposition: deferred-to-ticket
    ticket: "GUI-112"
    reason: "Current PR #168 thread 3836130702 remains unresolved; GUI-112 owns the timer and pause guard."
  - id: F-018
    severity: blocker
    summary: "Managed AGENTS instructions must declare the branch convention"
    disposition: deferred-to-ticket
    ticket: "GUI-112"
    reason: "Current PR #168 thread 3836130705 remains unresolved; GUI-112 includes the required managed-guide update."
  - id: F-019
    severity: major
    summary: "Ordinary custom-to-custom rename must accept the actual current branch"
    disposition: deferred-to-ticket
    ticket: "GUI-112"
    reason: "Current PR #168 thread 3836189719 remains unresolved; GUI-112 owns the ordinary rename path."
  - id: F-020
    severity: blocker
    summary: "Local MCP processes must receive the configured board branch"
    disposition: deferred-to-ticket
    ticket: "MCP-044"
    reason: "Current PR #168 thread 3836189723 remains unresolved; MCP-044 owns provider/runtime propagation."
  - id: F-021
    severity: major
    summary: "Manual Retry must recheck the live branch before syncing"
    disposition: deferred-to-ticket
    ticket: "GUI-112"
    reason: "Current PR #168 thread 3836579174 remains unresolved; GUI-112 owns the manual retry guard."
  - id: F-022
    severity: major
    summary: "FRD and manual text must state retained-ref handoff semantics"
    disposition: deferred-to-ticket
    ticket: "GUI-112"
    reason: "Current PR #168 thread 3836579176 remains unresolved; GUI-112 owns durable contract wording."
  - id: F-023
    severity: major
    summary: "Settings must state that the old custom ref is retained"
    disposition: deferred-to-ticket
    ticket: "GUI-112"
    reason: "Current PR #168 thread 3836720318 remains unresolved; GUI-112 owns the user-facing Settings text."
  - id: F-024
    severity: major
    summary: "Settings must surface protected reconciliation failures"
    disposition: deferred-to-ticket
    ticket: "GUI-112"
    reason: "Current PR #168 thread 3836720320 remains unresolved; GUI-112 owns the failed-Git status surface."
  - id: F-025
    severity: minor
    summary: "Live GitHub protection and variable mutation"
    disposition: accepted-risk
    reason: "No authorized live protection mutation or real protected-branch handoff is available; no admin bypass is used."
---

## Current-head independent review — NEEDS-CHANGES — 2026-08-22

Reviewed exact cumulative PR #168 head e78323d7fb8ce695e40db80380d189e236726b25 against main base 34245be039e8fd8395b5e31835602c54e62e98a4. CI rerun 32590637669 is green (verify and kanmer-gate), but current-head inline review has ten unresolved findings. Each is dispositioned to a blocking remediation ticket above; no unresolved blocker is silenced and the protected merge remains held until those tickets are independently reviewed and merged, followed by a fresh cumulative review.

---
kind: review-attestation
pr: "168"
head_sha: "e78323d7fb8ce695e40db80380d189e236726b25"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: pass
reviewer: "codex-recovery"
independent: true
plan_hash: "2026-08-22T18:39:38.518Z"
ticket_updated: "2026-08-22T18:39:38.518Z"
findings:
  - id: F-013
    severity: blocker
    summary: "Manual Retry production-caller mismatch safety"
    disposition: fixed-in-ticket
    ticket: "CORE-084"
    reason: "CORE-084 was independently reviewed and merged as e78323d7; its exact production syncProject regression proves mismatch pause before syncBoard with no ref/worktree/content mutation."
  - id: F-014
    severity: major
    summary: "Retained custom-ref contract wording"
    disposition: fixed-in-ticket
    ticket: "CORE-080"
    reason: "CORE-080's merged implementation and docs align FRD-020/manual wording with retaining the old ref until KANMER_BOARD_BRANCH is updated."
  - id: F-EXTERNAL
    severity: minor
    summary: "Live GitHub protection and variable mutation"
    disposition: accepted-risk
    reason: "Live protection/Actions-variable mutation remains an administrator-owned ADR-0016 boundary; no admin bypass or fabricated hosted proof is used."
---

## Fresh cumulative independent re-review — PASS — 2026-08-22T18:39:38.518Z

Reviewed exact cumulative head `e78323d7fb8ce695e40db80380d189e236726b25` on PR #168 after CORE-080/CORE-084 child merges. The production Retry-caller finding is fixed and independently merged; retained-ref contract wording is fixed. Hosted verify is PASS; the remaining gate reconciliation is board-side dependency/review metadata only. The exact merged child commits are reachable from the cumulative branch, and the external protection mutation boundary remains accepted risk under ADR-0016.

Verdict: PASS for the cumulative CORE-043 implementation. An independent reviewer may merge PR #168 into protected main only after the hosted kanmer-gate rerun is green; do not use an admin bypass.
## Independent cumulative review — CORE-043 / PR #168

Reviewed exact head f63d953fc8467440988c887c62a34ade0c77c96c against main base 34245be039e8fd8395b5e31835602c54e62e98a4. The cumulative tree contains the original branch-protection retarget implementation and the reviewed non-squash child merges through CORE-061, including merge 8c093424. The child remediations preserve configured branch handoff, pause/error state, effective cache reconciliation, and managed AGENTS convention without adding a GitHub API or protected-ref bypass.

Exact evidence: cumulative GUI Git/sync rails 28/28 PASS; core suite 283/283 PASS; build:core PASS; scripts/protection rail 89/89 PASS; git diff-check PASS; hosted run 32587191440 verify PASS (97068601836) and kanmer-gate PASS (97068601416). CORE-061's merged-target proof separately records verify:agents-block 31/31, verify:skills, manual/docs, build:core, and scripts 89/89 on the 8c093424 cumulative line.

Live GitHub repository-variable and branch-protection mutation remains explicitly INCONCLUSIVE and accepted as the ADR-0016 external boundary. No source changes were made during this review.

Verdict: PASS. Merge PR #168 non-squash into main, then move CORE-043 Review → Verifying. Do not verify or clean up in this review step.

--- Prior review history ---

---
kind: review-attestation
pr: "168"
head_sha: "f63d953fc8467440988c887c62a34ade0c77c96c"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: needs-changes
reviewer: "codex-core043-cumulative-review"
independent: true
plan_hash: "a0b32fae7b9b14f9"
ticket_updated: "2026-08-22T17:42:00Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Completed administrator handoff is recognized"
    disposition: fixed
    reason: "Cumulative CORE-048/052/059/060 changes cover handoff state."
  - id: F-002
    severity: major
    summary: "No-board protected preference transition is guarded"
    disposition: fixed
    reason: "The protected default remains guarded when no board is open."
  - id: F-003
    severity: blocker
    summary: "Hosted gate consumes configured board branch"
    disposition: fixed
    reason: "The workflow reads KANMER_BOARD_BRANCH with the documented fallback."
  - id: F-004
    severity: minor
    summary: "Protection inference is conservative"
    disposition: accepted-risk
    reason: "ADR-0016 excludes a GitHub protection API/App; live protection proof remains unavailable."
  - id: F-005
    severity: blocker
    summary: "Merged child dependency is unblocked"
    disposition: fixed
    reason: "All child block edges are cleared in the board."
  - id: F-009
    severity: blocker
    summary: "Custom rename leaves KANMER_BOARD_BRANCH stale"
    disposition: deferred-to-ticket
    ticket: "CORE-059"
    reason: "The remediation is merged into the cumulative parent branch."
  - id: F-010
    severity: major
    summary: "Resolved handoff retains a generated pause/error"
    disposition: deferred-to-ticket
    ticket: "CORE-060"
    reason: "The remediation is merged into the cumulative parent branch."
  - id: F-011
    severity: blocker
    summary: "Automatic sync can run while branch handoff is paused"
    disposition: deferred-to-ticket
    ticket: "CORE-060"
    reason: "The remediation is merged into the cumulative parent branch."
  - id: F-012
    severity: blocker
    summary: "KANMER_BOARD_BRANCH convention is missing from AGENTS.md"
    disposition: deferred-to-ticket
    ticket: "CORE-061"
    reason: "The remediation is merged into the cumulative parent branch."
  - id: F-EXTERNAL
    severity: minor
    summary: "Live protection retarget proof"
    disposition: accepted-risk
    reason: "No authorized GitHub protection mutation or real protected-branch handoff was available."
---

## Fresh cumulative independent review — CORE-043 / PR #168

The exact cumulative head is 4f106865947e556759aeb88363ea9aab7c01beac, containing the original implementation plus CORE-048 and CORE-052/054/055 non-squash merges. Local rails and hosted rerun 32575453101 pass, but current-head review surfaced four real blockers: custom-to-custom renames can leave KANMER_BOARD_BRANCH stale, resolved handoffs can retain a generated pause/error, the timer can execute automatic sync while paused, and the new Actions-variable convention is absent from AGENTS.md.

These findings are linked to CORE-059, CORE-060, and CORE-061 with blocking edges. The parent remains in Review and must not merge until each child is independently reviewed and merged, then the cumulative head is reviewed again. The live GitHub protection mutation boundary remains explicitly accepted risk.

Verdict: NEEDS-CHANGES. No merge or stage move was performed.

--- Prior review history ---

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


## GitHub review-thread disposition

On 2026-08-22 the eight historical inline threads for findings already marked `fixed` or `accepted-risk` were resolved on PR #168. The four current-head blockers remain unresolved and are deferred to CORE-059, CORE-060, and CORE-061; no unresolved blocker was silenced.

## Fresh cumulative independent review — NEEDS-CHANGES — f63d953fc8467440988c887c62a34ade0c77c96c

Reviewer: codex-core043-cumulative-review, independent of the implementation and remediation authors. Exact reviewed PR #168 head: f63d953fc8467440988c887c62a34ade0c77c96c; base: 34245be039e8fd8395b5e31835602c54e62e98a4.

Code and local evidence: the cumulative branch correctly preserves the protected-default refusal, refreshes branch state before transition decisions, consumes KANMER_BOARD_BRANCH with the documented fallback, retains generated-vs-genuine handoff state, and includes the CORE-060 live-branch/timer remediations. Focused GUI Git/live-branch/timer rail passed 28/28; core passed 283/283; build:core passed; scripts/protection rail passed 89/89; aggregate diff-check passed. Live GitHub protection retargeting remains INCONCLUSIVE as documented.

Blocking gate findings:

1. Hosted run 32587191440 has `kanmer-gate` FAIL with `DEPENDENCY_BLOCKED`: CORE-061 still blocks CORE-043. CORE-061 is Verifying rather than Done, so the cumulative PR is not merge-ready until its proof/closeout removes the live edge.

2. The same hosted gate reports `STALE_REVIEW`: the current machine review attestation is invalid because `findings[5].ticket` is missing for a deferred-to-ticket disposition. The review record must be rewritten/reconciled with a valid ticket field and the exact current head before the gate can approve.

Disposition: defer the dependency finding to existing CORE-061 (no new duplicate ticket); repair the machine review attestation as board-side review metadata. No source finding was identified in the exact cumulative diff.

Verdict: NEEDS-CHANGES. Do not merge PR #168 or move CORE-043 while the authoritative hosted gate is red. No merge or board move performed.
