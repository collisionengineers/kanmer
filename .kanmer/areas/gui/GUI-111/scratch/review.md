---
kind: review-attestation
pr: "164"
head_sha: "f8631395aa415d4d2ca8142626e54c85f332d841"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "f4367fbaea22e62e"
ticket_updated: "2026-08-22T09:21:09.701Z"
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
    reason: "addCardToGroup rereads active groups immediately before updateItem and rejects an archived or missing selection while retaining the existing ticket revision check. The unavoidable post-read archive race is explicitly documented as best-effort residual risk; no stronger transaction is claimed."
  - id: F-004
    severity: minor
    summary: "Large group submenus previously had no bounded scrolling or keyboard visibility"
    disposition: fixed
    reason: "The existing context-menu panel now has a bounded max-height/overflow rail and keyboard-active entries call scrollIntoView without changing menu ownership or positioning."
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
    summary: "Wheel dismissal closes scrollable context menus before pointer scrolling"
    disposition: open
    reason: "The existing useDismissOnOutside hook installs a window wheel listener that calls onClose for every wheel event, including events originating inside .ctx-menu. The new max-height/overflow-y panel is therefore keyboard-scrollable but not pointer-scrollable, leaving large submenu entries inaccessible through normal wheel/trackpad interaction. PR #164 comment 3835706069 / thread PRRT_kwDOT2PEds6bX3xs must be fixed before review can pass."
---
# Independent review — GUI-111 / PR #164

## Verdict

NEEDS-CHANGES. Fresh local rails and source inspection confirm all six original GUI-109 remediation findings are fixed, but the current PR has one new unresolved P2 review thread: the window-level wheel dismissal handler closes the menu even when the wheel originates inside the newly scrollable .ctx-menu. The F-004 acceptance requires large menus to remain reachable; pointer scrolling is currently broken. No merge is authorized until the handler ignores wheel events whose target is inside .ctx-menu (while retaining outside-wheel dismissal), the focused regression is rerun, and the PR receives a fresh independent review.

## Original finding dispositions

- F-001 project binding: fixed in PR. The opening project id and captured client gate asynchronous discovery/rendering/action paths; stale results are cancelled or ignored and an active project switch hides the old menu.
- F-002 discovery errors: fixed in PR. The helper and renderer distinguish loading, successful empty, and failed listGroups calls; failures remain visible rather than becoming a misleading empty state.
- F-003 archive race: fixed in PR. The selected group is reread from active listGroups immediately before the ticket-owned updateItem call, with the existing expectedUpdated conflict check preserved. The report/open-questions correctly retain the non-atomic race after that final read as INCONCLUSIVE/best-effort residual, without inventing a core transaction.
- F-004 scalable menu: partially fixed; CSS bounds and keyboard scroll pass, but F-007 blocks pointer scrolling inside the bounded panel.
- F-005 manual: fixed in PR. Archive/unarchive is described as a GroupView control; only group creation remains agent-only.
- F-006 failure visibility: fixed in PR. Failed card actions retain their message through refresh, while successful actions preserve the prior clear-and-refresh path.
- F-007 wheel handling: open minor, current PR thread 3835706069 / PRRT_kwDOT2PEds6bX3xs. The global wheel dismiss listener must preserve wheel events from .ctx-menu so overflow scrolling works.

## Evidence

- PASS (exit 0): focused GUI group-menu test — 7/7.
- PASS (exit 0): full GUI suite — 44 files / 389 tests.
- PASS (exit 0): npm run typecheck — core, MCP server, UI, and GUI workspaces.
- PASS (exit 0): npm run build -w @kanmer/gui — Electron main/preload/renderer bundles built.
- PASS (exit 0): npm run check:manual — 22 chapters up to date.
- PASS (exit 0): git diff --check against the exact GUI-109 base.
- PASS (exit 0): branch ancestry confirms c259af171a72fa83a9131f4f53a79d0cfd0f05b5 is the base and the worktree is clean.
- Hosted verify/gate: INCONCLUSIVE/unavailable for this stacked PR because the repository PR workflow targets main and reports no checks for PR #164's gui-109-add-to-group base. This is preserved as unavailable, not promoted to PASS.
- Live Electron interaction and screenshot: INCONCLUSIVE in this headless lane.

## Scope

The diff remains limited to the seven planned GUI/manual files. No merge, move, verify, release, cleanup, or source changes were performed.
