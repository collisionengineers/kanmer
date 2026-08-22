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
    summary: "GUI-111 was previously a live blocker of GUI-109"
    disposition: fixed
    reason: "Board readback now shows GUI-111 blocks=[]; its child PR is merged and the current hosted kanmer-gate passes."
  - id: F-009
    severity: major
    summary: "Parent ticket and packet traceability remain bound to the pre-remediation head"
    disposition: open
    reason: "GUI-109 get_item still records commits [c259af171a72fa83a9131f4f53a79d0cfd0f05b5] only; its post-implementation report and PR body describe the old 387-test tree; and the parent packet does not record the merged GUI-111 lineage (child head 51c4a3460f6bb3dfb866c541e1a7d9920394bb34, merge commit 72e80fc8). Refresh parent commits/report/PR traceability and exact current evidence before a final pass."
  - id: F-010
    severity: blocker
    summary: "Hosted verification was previously incomplete"
    disposition: fixed
    reason: "The latest exact-head run 32565459884 is green: kanmer-gate job 97013673839 PASS and verify job 97013673947 PASS. The earlier gate failure job 97013332192 is preserved as a transient dependency/stale-review attempt."
  - id: F-011
    severity: minor
    summary: "Parent PR review threads remain unresolved administratively"
    disposition: open
    reason: "PR #162 still lists all six original Codex threads is_resolved:false (three current and three outdated), even though their code findings are fixed by merged PR #164. Resolve or otherwise disposition the GitHub threads before merge; do not silently treat the child code fix as thread resolution."
---
# Independent review — GUI-109 / PR #162

## Verdict

NEEDS-CHANGES. The exact parent head 72e80fc8c45672fd13907d9741900848ce06b109 contains the GUI-111 remediation, GUI-111 is no longer a live board blocker, and the hosted gate plus authoritative verify are now green. FRD-001 alignment remains sound: membership is ticket-owned, discovery uses existing listGroups, writes use updateItem with expectedUpdated, and no group storage/MCP/core model was added.

The parent packet is still not review-clear. GUI-109's live ticket metadata and post-implementation report remain bound to pre-remediation c259af171a72fa83a9131f4f53a79d0cfd0f05b5 and 44 files / 387 tests, while the merged tree includes the child remediation and its authoritative 45 files / 390 evidence. The PR description has the same stale verification summary. All six original parent GitHub threads remain unresolved administratively, although their code findings are fixed.

## Child merge and finding dispositions

- GUI-111 PR #164 was independently passed at child head 51c4a3460f6bb3dfb866c541e1a7d9920394bb34 and merged at 2026-08-22T09:37:50Z with merge commit 72e80fc8c45672fd13907d9741900848ce06b109.
- F-001 through F-006: fixed in the merged child tree.
- F-007: fixed in the child follow-up; focused child groupMenu plus ContextMenu tests pass 8/8.
- F-008: fixed; GUI-111 blocks=[] and the gate now passes.
- F-009: open major traceability issue. Update GUI-109 item commits, report, PR summary, and current review packet to the merged lineage/head and current 45/390 evidence.
- F-010: fixed by the green exact-head hosted rerun.
- F-011: open administrative issue. Resolve or otherwise explicitly disposition all six unresolved parent threads before merge.

## Evidence

- PASS (exit 0): exact-base git diff --check for 84a20f8414264f65f6d851ca51849af89c80acf9..72e80fc8c45672fd13907d9741900848ce06b109.
- PASS (recorded child evidence): focused GUI group-menu plus ContextMenu tests — 8/8; full GUI suite — 45 files / 390 tests; workspace typecheck; GUI build; manual build/check; child diff-check.
- PASS (recorded parent pre-remediation evidence): focused group-menu 5/5, full GUI 44 files / 387 tests, typecheck/build/manual/diff-check; these do not supersede the merged-child 45/390 evidence.
- PASS (hosted exact-head run 32565459884): kanmer-gate job 97013673839 and verify job 97013673947.
- Preserved hosted failure: earlier job 97013332192 on the same run failed with dependency/stale-review findings before the board sync rerun; it is not erased by the later pass.
- INCONCLUSIVE: live Electron card-menu interaction and screenshot, explicitly parked by the packet.

## Scope

The current PR diff is the original GUI-109 implementation plus the merged GUI-111 remediation tree: App/menu concurrency and error handling, active-group revalidation, bounded context-menu behavior and wheel regression, group-menu tests, source/generated manual updates. No unrelated provider, dispatch, core, IPC, or storage changes were observed.

No merge, move, verify, release, cleanup, or source changes were performed by this review.
