---
kind: review-attestation
pr: "162"
head_sha: "72e80fc8c45672fd13907d9741900848ce06b109"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "89961d4bc2af105a"
ticket_updated: "2026-08-22T08:48:20.419Z"
findings:
  - id: F-001
    severity: major
    summary: "Group-menu discovery and assignment previously crossed project tabs"
    disposition: fixed
    reason: "GUI-111 PR #164 implemented project-bound menu state, captured client/project identity, stale-result cancellation, active-root rendering gates, and project checks before awaited assignment steps; the child PASS attestation covers the exact implementation head merged here."
  - id: F-002
    severity: major
    summary: "listGroups failures previously appeared as an empty active-group result"
    disposition: fixed
    reason: "The merged child distinguishes loading, successful-empty, and discovery-error states and renders a disabled error entry; GUI-111 focused tests cover the error path."
  - id: F-003
    severity: major
    summary: "An archived group could previously be assigned after initial discovery"
    disposition: fixed
    reason: "The merged child rereads active groups immediately before updateItem and rejects archived or missing selections while preserving the expectedUpdated conflict check; the documented post-read archive race remains best-effort residual risk."
  - id: F-004
    severity: minor
    summary: "Large group submenus previously lacked bounded scrolling and keyboard visibility"
    disposition: fixed
    reason: "The merged child adds bounded overflow and keyboard scrollIntoView behavior, with the follow-up wheel guard preserving pointer scrolling inside the menu."
  - id: F-005
    severity: minor
    summary: "Groups manual previously misstated archive controls"
    disposition: fixed
    reason: "The merged child updates the source and generated manual to state that creation remains agent-only while GroupView supports archive/unarchive and retains memberships."
  - id: F-006
    severity: major
    summary: "Card-action failures previously disappeared during refresh"
    disposition: fixed
    reason: "The merged child preserves action errors through the following refresh only on failure and retains clear-on-success behavior."
  - id: F-007
    severity: minor
    summary: "The child wheel-dismissal regression was not in the original parent packet"
    disposition: fixed
    reason: "GUI-111 follow-up commit 51c4a3460f6bb3dfb866c541e1a7d9920394bb34 added the guarded wheel listener and ContextMenu regression; child focused tests pass 8/8, child review is PASS, and PR #164 merged that exact tree into 72e80fc8."
  - id: F-008
    severity: blocker
    summary: "GUI-111 remains a live blocker of GUI-109 after its child PR merged"
    disposition: open
    reason: "The live board item GUI-111 is still Verifying, has blocks: [GUI-109], and is not Done/released. Current hosted kanmer-gate run 32565459884 job 97013332192 failed with DEPENDENCY_BLOCKED: GUI-111. GUI-109 cannot pass or merge until the child verification/closeout dependency is reconciled."
  - id: F-009
    severity: major
    summary: "Parent ticket and packet traceability remain bound to the pre-remediation head"
    disposition: open
    reason: "GUI-109 get_item still records commits [c259af171a72fa83a9131f4f53a79d0cfd0f05b5] only; its post-implementation report and PR body describe the old 387-test tree; and the prior scratch/review attestation is bound to c259af171a72fa83a9131f4f53a79d0cfd0f05b5. Update parent commits/report/PR traceability to the merged child lineage and current head 72e80fc8 before a final pass."
  - id: F-010
    severity: blocker
    summary: "Current hosted verification is not green"
    disposition: open
    reason: "For run 32565459884, kanmer-gate job 97013332192 failed; verify job 97013332289 remained in_progress at review time. The gate log records DEPENDENCY_BLOCKED and STALE_REVIEW, so required hosted evidence is not yet passable."
  - id: F-011
    severity: minor
    summary: "Parent PR review threads remain unresolved administratively"
    disposition: open
    reason: "PR #162 still lists all six original Codex threads is_resolved:false (three current and three outdated), even though their code findings are fixed by merged PR #164. Resolve or otherwise disposition the GitHub threads before merge; do not silently treat the child code fix as thread resolution."
---
# Independent review — GUI-109 / PR #162

## Verdict

NEEDS-CHANGES. The merged tree at exact parent head 72e80fc8c45672fd13907d9741900848ce06b109 contains the GUI-111 remediation and the child PASS evidence supports F-001 through F-007. The implementation diff remains aligned with FRD-001: membership is ticket-owned, discovery uses existing listGroups, writes use updateItem with expectedUpdated, and no group storage/MCP/core model was added.

The parent packet is not review-clear. GUI-111 is still Verifying and blocks GUI-109, the latest hosted kanmer-gate failed on that dependency and the stale parent review record, the parent ticket/report/PR traceability still names only c259af171a72fa83a9131f4f53a79d0cfd0f05b5, and PR #162's six original review threads remain unresolved administratively. The parent report also still records the pre-child 44 files / 387 tests rather than the merged child's 45 files / 390 evidence.

## Child merge and finding dispositions

- GUI-111 PR #164 was independently passed at child head 51c4a3460f6bb3dfb866c541e1a7d9920394bb34 and merged at 2026-08-22T09:37:50Z with merge commit 72e80fc8c45672fd13907d9741900848ce06b109.
- F-001 through F-006: fixed in the merged child tree, with deterministic evidence recorded by GUI-111.
- F-007: fixed in the child follow-up and included in the merged parent tree; focused child groupMenu plus ContextMenu tests pass 8/8.
- F-008: open blocker — GUI-111 remains Verifying/blocks GUI-109 and needs its own verification/closeout before this parent can pass.
- F-009: open major traceability issue — refresh GUI-109 item commits, report, PR summary, and current review evidence to the merged lineage/head.
- F-010: open blocker — latest hosted gate failed and verify was still pending.
- F-011: open administrative review-thread issue — all six parent threads are still unresolved on GitHub, although their code findings are fixed.

## Evidence

- PASS (exit 0): exact-base git diff --check for 84a20f8414264f65f6d851ca51849af89c80acf9..72e80fc8c45672fd13907d9741900848ce06b109.
- PASS (recorded child evidence): focused GUI group-menu plus ContextMenu tests — 8/8; full GUI suite — 45 files / 390 tests; workspace typecheck; GUI build; manual build/check; child diff-check.
- PASS (recorded parent pre-remediation evidence): focused group-menu 5/5, full GUI 44 files / 387 tests, typecheck/build/manual/diff-check; these do not supersede the merged-child 45/390 evidence.
- INCONCLUSIVE: live Electron card-menu interaction and screenshot, explicitly parked by the packet.
- Hosted run 32563191261 is preserved as the prior stage-race attempt (verify PASS; gate failed because the event-time board snapshot saw Implementing/no review record).
- Hosted run 32565459884 is the current exact-head attempt: kanmer-gate job 97013332192 failed with DEPENDENCY_BLOCKED GUI-111 and STALE_REVIEW; verify job 97013332289 was still in progress when reviewed. No hosted PASS is claimed.

## Scope

The current PR diff is the original GUI-109 implementation plus the merged GUI-111 remediation tree: App/menu concurrency and error handling, active-group revalidation, bounded context-menu behavior and wheel regression, group-menu tests, source/generated manual updates. No unrelated provider, dispatch, core, IPC, or storage changes were observed.

No merge, move, verify, release, cleanup, or source changes were performed by this review.
