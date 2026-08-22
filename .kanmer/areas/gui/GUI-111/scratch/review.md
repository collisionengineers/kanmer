---
kind: review-attestation
pr: "164"
head_sha: "51c4a3460f6bb3dfb866c541e1a7d9920394bb34"
verdict: pass
reviewer: "gui099-executor"
independent: true
plan_hash: "f4367fbaea22e62e"
ticket_updated: "2026-08-22T09:27:45.730Z"
findings:
  - id: F-001
    severity: major
    summary: "Card-menu discovery and assignment previously crossed project tabs"
    disposition: fixed
    reason: "Menu state records the opening project, async effects capture its client and cancel stale work, rendering is gated by the active root, and addCardToGroup checks the project before each awaited boundary and before the write."
  - id: F-002
    severity: major
    summary: "listGroups failures previously appeared as an empty active-group result"
    disposition: fixed
    reason: "Loading, successful-empty, and discovery-error states are distinct in groupMenuItems; App preserves the real failure as a disabled error entry and focused tests cover loading and error output."
  - id: F-003
    severity: major
    summary: "An archived group could previously be assigned after initial discovery"
    disposition: fixed
    reason: "addCardToGroup rereads active groups immediately before updateItem and rejects an archived or missing selection while retaining the ticket revision check. The documented post-read archive race remains explicitly best-effort residual risk."
  - id: F-004
    severity: minor
    summary: "Large group submenus previously had no bounded scrolling or keyboard visibility"
    disposition: fixed
    reason: "The context-menu panel has bounded max-height/overflow and keyboard-active entries call scrollIntoView; the wheel fix preserves pointer scrolling inside the bounded menu."
  - id: F-005
    severity: minor
    summary: "Groups manual previously misstated archive controls"
    disposition: fixed
    reason: "The source and generated manual state that creation remains agent-only while GroupView supports archive/unarchive and retains memberships; manual freshness passes."
  - id: F-006
    severity: major
    summary: "Card-action failures previously disappeared during refresh"
    disposition: fixed
    reason: "runCardAction preserves action errors through the following refresh only on failure and retains clear-on-success behavior."
  - id: F-007
    severity: minor
    summary: "Wheel dismissal closed scrollable context menus before pointer scrolling"
    disposition: fixed
    reason: "The window wheel listener now uses the guarded close callback, preserving inside-menu wheel events while retaining outside dismissal. ContextMenu.test.tsx covers both cases; the GitHub thread PRRT_kwDOT2PEds6bX3xs is resolved and not outdated."
  - id: F-008
    severity: minor
    summary: "PR summary retains an older 389-test count"
    disposition: accepted-risk
    reason: "The detailed post-implementation report, checklist, author traceability comment, and fresh local evidence all record the authoritative full GUI result as 45 files / 390 tests. The PR description's historical 389 summary is non-blocking presentation drift; no pass-critical packet evidence remains stale."
---
# Independent review — GUI-111 / PR #164

## Verdict

PASS. The exact reachable PR head 51c4a3460f6bb3dfb866c541e1a7d9920394bb34 is independently reviewable, matches the stacked GUI-111 plan and scoped diff, and closes all seven implementation/review findings. The wheel dismissal remediation is present and covered by a focused inside/outside regression. The authoritative report and checklist are current at 45 files / 390 tests and 20/20 checklist items.

The PR is open and unmerged, based on gui-109-add-to-group at c259af171a72fa83a9131f4f53a79d0cfd0f05b5; no merge, move, verify, release, or cleanup was performed. The originally supplied SHA string had a suffix mismatch; this attestation binds to the exact GitHub/local reachable SHA above.

## Finding dispositions

- F-001 through F-006: fixed in the stacked remediation diff and covered by the packet's focused/full rails and source inspection.
- F-007: fixed in code and by ContextMenu.test.tsx; GitHub thread 3835707265 / PRRT_kwDOT2PEds6bX3xs is resolved with is_outdated: false.
- F-008: accepted as non-blocking presentation drift only. The authoritative report/checklist and exact local evidence say 45 files / 390 tests; the PR summary's historical 389 line does not change implementation or gate evidence.

## Evidence

- PASS (exit 0): fresh focused GUI group-menu plus ContextMenu tests — 8/8.
- PASS (exit 0): full GUI suite recorded in the refreshed report/checklist — 45 files / 390 tests.
- PASS (exit 0): workspace typecheck — all workspaces.
- PASS (exit 0): GUI Electron build.
- PASS (exit 0): manual build and freshness check — 22 chapters.
- PASS (exit 0): exact-base git diff --check.
- PASS (exit 0): local worktree clean at the bound head.
- INCONCLUSIVE/unavailable: hosted verify/gate, because the stacked PR targets gui-109-add-to-group while the repository PR workflow targets main; this is explicitly recorded rather than claimed as a hosted pass.
- INCONCLUSIVE: live Electron visual interaction and screenshot evidence in this headless lane.
- Preserved failure: the initial ContextMenu DOM test omitted its jsdom directive and failed with ReferenceError: document is not defined; the corrected test and full-suite rerun pass.

## Scope

The eight-file diff remains limited to GUI-111's stacked group-menu remediation, regression test, and manual source/generated output. No provider, dispatch, core, IPC, or storage behavior changed.
