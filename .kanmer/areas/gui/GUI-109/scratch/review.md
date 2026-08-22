---
kind: review-attestation
pr: "162"
head_sha: "72e80fc8c45672fd13907d9741900848ce06b109"
verdict: pass
reviewer: "gui099-executor"
independent: true
plan_hash: "89961d4bc2af105a"
ticket_updated: "2026-08-22T09:42:55.466Z"
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
    reason: "Board readback now shows GUI-111 blocks=[]; its child PR is merged and the current hosted gate passes."
  - id: F-009
    severity: major
    summary: "Parent packet previously omitted the merged child lineage and current evidence"
    disposition: fixed
    reason: "The refreshed post-implementation report and PR body now record child head 51c4a3460f6bb3dfb866c541e1a7d9920394bb34, merged parent head 72e80fc8c45672fd13907d9741900848ce06b109, PR #164, and the authoritative 45 files / 390 tests. The parent ticket's c259af... entry remains the original GUI-109-owned implementation commit; the child ticket owns the merged remediation lineage."
  - id: F-010
    severity: blocker
    summary: "Hosted verification was previously incomplete"
    disposition: fixed
    reason: "The latest exact-head run 32565459884 is green: kanmer-gate job 97013673839 PASS and verify job 97013673947 PASS. The earlier gate failure job 97013332192 is preserved as a transient dependency/stale-review attempt."
  - id: F-011
    severity: minor
    summary: "Parent PR review threads were previously unresolved administratively"
    disposition: fixed
    reason: "Fresh GitHub thread readback shows all six original Codex threads resolved=true; outdated status is preserved where applicable, and no unresolved parent review thread remains."
  - id: F-012
    severity: note
    summary: "PR summary status wording was captured while verify was still running"
    disposition: accepted-risk
    reason: "The PR body records the exact run and says verify pending/rerun in progress because it was edited before the final job completed. Current authoritative workflow readback is green for both gate and verify; this transient wording does not alter the evidence decision."
---
# Independent review — GUI-109 / PR #162

## Verdict

PASS. The exact parent head 72e80fc8c45672fd13907d9741900848ce06b109 is independently reviewable, contains the GUI-111 remediation, matches the GUI-109 plan and FRD-001, and has no open blocker or major review finding. Membership remains ticket-owned, discovery uses existing listGroups, writes use updateItem with expectedUpdated, and no group storage/MCP/core model was added.

GUI-111 PR #164 was independently passed at child head 51c4a3460f6bb3dfb866c541e1a7d9920394bb34 and merged into this parent as 72e80fc8c45672fd13907d9741900848ce06b109. The parent board dependency is cleared, the parent packet and PR body record the child lineage and 45 files / 390 tests, and all six original parent GitHub review threads are resolved.

## Finding dispositions

- F-001 through F-006: fixed in the merged child tree.
- F-007: fixed in the child follow-up; focused groupMenu plus ContextMenu tests pass 8/8.
- F-008: fixed; GUI-111 blocks=[] and the dependency gate passes.
- F-009: fixed by the refreshed parent report/PR lineage and child ticket traceability; the original c259af... commit remains correctly associated with GUI-109's own implementation.
- F-010: fixed by hosted run 32565459884, with kanmer-gate and verify both PASS.
- F-011: fixed; all six parent threads are resolved=true.
- F-012: accepted as a transient PR-summary wording risk; current workflow results are authoritative and green.

## Evidence

- PASS (exit 0): exact-base git diff --check for 84a20f8414264f65f6d851ca51849af89c80acf9..72e80fc8c45672fd13907d9741900848ce06b109.
- PASS (recorded child evidence): focused GUI group-menu plus ContextMenu tests — 8/8; full GUI suite — 45 files / 390 tests; workspace typecheck; GUI build; manual build/check; child diff-check.
- PASS (hosted exact-head run 32565459884): kanmer-gate job 97013673839 and verify job 97013673947.
- Preserved hosted failure: earlier job 97013332192 on the same run failed with dependency/stale-review findings before the board sync rerun; it is not erased by the later pass.
- INCONCLUSIVE: live Electron card-menu interaction and screenshot, explicitly parked by the packet and not promoted to PASS.

## Scope

The current PR diff is the original GUI-109 implementation plus the merged GUI-111 remediation tree: App/menu concurrency and error handling, active-group revalidation, bounded context-menu behavior and wheel regression, group-menu tests, source/generated manual updates. No unrelated provider, dispatch, core, IPC, or storage changes were observed.

No merge, move, verify, release, cleanup, or source changes were performed by this review.
