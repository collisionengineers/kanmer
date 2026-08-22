---
kind: review-attestation
pr: "164"
head_sha: "51c4a3460f6bb3dfb866c541e1a7d9920394bb34"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "f4367fbaea22e62e"
ticket_updated: "2026-08-22T09:27:45.730Z"
findings:
  - id: F-001
    severity: major
    summary: "Card-menu discovery and assignment previously crossed project tabs"
    disposition: fixed
    reason: "Menu state records the opening project, effects capture its client and cancel stale work, rendering is gated by the active root, and addCardToGroup checks the project before each awaited boundary and before the write."
  - id: F-002
    severity: major
    summary: "listGroups failures previously appeared as an empty active-group result"
    disposition: fixed
    reason: "Loading, successful-empty, and discovery-error states are distinct in groupMenuItems; App preserves the real failure as a disabled error entry. Focused tests cover loading and error output."
  - id: F-003
    severity: major
    summary: "An archived group could previously be assigned after initial discovery"
    disposition: fixed
    reason: "addCardToGroup rereads active groups immediately before updateItem and rejects an archived or missing selection while retaining the existing ticket revision check. The unavoidable post-read archive race remains documented as best-effort residual risk; no stronger transaction is claimed."
  - id: F-004
    severity: minor
    summary: "Large group submenus previously had no bounded scrolling or keyboard visibility"
    disposition: fixed
    reason: "The context-menu panel has a bounded max-height/overflow rail and keyboard-active entries call scrollIntoView. The fresh wheel fix preserves pointer scrolling inside the bounded menu without changing menu ownership or positioning."
  - id: F-005
    severity: minor
    summary: "Groups manual previously misstated archive controls"
    disposition: fixed
    reason: "docs/manual/groups.md and generated chapters now say creation remains agent-only and GroupView supports archive/unarchive while retaining memberships; manual freshness passes."
  - id: F-006
    severity: major
    summary: "Card-action failures previously disappeared during refresh"
    disposition: fixed
    reason: "runCardAction preserves the action error through the following refresh only on failure and retains clear-on-success behavior."
  - id: F-007
    severity: minor
    summary: "Wheel dismissal closed scrollable context menus before pointer scrolling"
    disposition: fixed
    reason: "At this head useDismissOnOutside passes its guarded close callback to the window wheel listener; wheel events originating inside .ctx-menu are ignored while outside wheel dismissal remains active. ContextMenu.test.tsx covers both cases. Focused groupMenu plus ContextMenu tests pass 8/8 and the full GUI suite passes. The corresponding GitHub thread PRRT_kwDOT2PEds6bX3xs remains administratively unresolved and must be resolved before merge, but the code finding is fixed."
  - id: F-008
    severity: minor
    summary: "Packet and PR full-GUI test count is stale after adding the regression file"
    disposition: open
    reason: "Fresh exact-head npm run test -w @kanmer/gui passes 45 files / 390 tests, while post-implementation-report and the PR body still state 44 files / 389 tests. Update those verification records and re-read them before a PASS review."
---
# Independent review — GUI-111 / PR #164

## Verdict

NEEDS-CHANGES. The fresh head fixes F-007: the guarded wheel listener preserves pointer scrolling inside the bounded context menu while retaining outside dismissal, and the new regression test passes. All six original GUI-109 remediation findings remain fixed. The packet is not yet review-clear because its report and PR body retain the stale full-suite count of 44 files / 389 tests; the fresh exact-head run is 45 files / 390 tests.

The requested SHA 51c4a346d5e6e7cbca3b1e76ab9c25012edb56c5 is not the reachable GitHub/local commit. This attestation is bound to the exact live PR/local head 51c4a3460f6bb3dfb866c541e1a7d9920394bb34, based on c259af171a72fa83a9131f4f53a79d0cfd0f05b5.

## Finding dispositions

- F-001 through F-006: fixed in the stacked remediation diff, with the original project-binding, error-surfacing, active-group revalidation, bounded-menu, manual, and action-error behaviors preserved.
- F-007: fixed in code and by the new inside/outside wheel regression. The old GitHub review thread remains unresolved administratively; resolve it before merge.
- F-008: open minor packet-traceability issue. Refresh the report and PR body to state 45 files / 390 tests, then obtain a fresh readback.

## Evidence

- PASS (exit 0): focused GUI group-menu plus ContextMenu tests — 8/8.
- PASS (exit 0): full GUI suite — 45 files / 390 tests.
- PASS (exit 0): npm run typecheck — core, MCP server, UI, and GUI workspaces.
- PASS (exit 0): npm run build -w @kanmer/gui — Electron main/preload/renderer bundles built.
- PASS (exit 0): npm run check:manual — 22 chapters up to date.
- PASS (exit 0): git diff --check against the exact GUI-109 base.
- PASS (exit 0): local worktree clean at the bound head.
- INCONCLUSIVE/unavailable: hosted verify/gate for this stacked PR because the repository workflow targets main and reports no checks for the gui-109-add-to-group base.
- INCONCLUSIVE: live Electron interaction and screenshot evidence in this headless lane.
- The initial ContextMenu test attempt lacked the jsdom directive and failed with ReferenceError: document is not defined; the corrected rerun and full-suite result are recorded in the implementation report and preserved as a failed attempt.

## Scope and stop condition

The diff remains limited to the planned GUI-111 stacked remediation plus its regression test and generated manual output. No merge, move, verify, release, cleanup, or source changes were performed by this review.
