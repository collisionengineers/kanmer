---
kind: review-attestation
pr: "162"
head_sha: "c259af171a72fa83a9131f4f53a79d0cfd0f05b5"
verdict: needs-changes
reviewer: "core041-executor"
independent: true
plan_hash: "89961d4bc2af105a"
ticket_updated: "2026-08-22T08:48:20.419Z"
findings:
  - id: F-001
    severity: major
    summary: "Group-menu discovery and action are not bound to the project that opened the menu"
    disposition: deferred-to-ticket
    ticket: "GUI-111"
  - id: F-002
    severity: major
    summary: "listGroups failures are converted into a misleading empty-group state"
    disposition: deferred-to-ticket
    ticket: "GUI-111"
  - id: F-003
    severity: major
    summary: "A group archived after discovery can still be assigned"
    disposition: deferred-to-ticket
    ticket: "GUI-111"
  - id: F-004
    severity: minor
    summary: "The group submenu has no bounded scrolling for large active-group sets"
    disposition: deferred-to-ticket
    ticket: "GUI-111"
  - id: F-005
    severity: minor
    summary: "Manual text incorrectly says archiving remains an agent action"
    disposition: deferred-to-ticket
    ticket: "GUI-111"
  - id: F-006
    severity: major
    summary: "runCardAction clears assignment conflicts after refresh and hides the failure"
    disposition: deferred-to-ticket
    ticket: "GUI-111"
---

# Independent review — GUI-109 / PR #162

## Changes reviewed

The PR adds an Add to group submenu to the existing ticket card ContextMenu in apps/gui/src/renderer/src/App.tsx, with pure append/label/duplicate helpers and focused tests in apps/gui/src/renderer/src/lib/groupMenu.ts and groupMenu.test.ts. It updates the source and generated manual chapters. No new storage, IPC, MCP, or core contract is added.

The ticket is in Review, the implementation worktree is clean at the exact recorded head, and the packet's plan/report/checklist/open-questions and HZN-007 context were read. The plan's FRD-001 requirements for ticket-owned membership, existing-group discovery, append preservation, and no duplicate model are otherwise reflected in the diff.

## Findings and dispositions

- F-001 — major, deferred-to-ticket GUI-111 — GitHub thread 3835659776. The menu remains mounted while root changes during a project/tab switch. The group-loading effect depends only on cardMenu, while clientRef.current and the action callback follow the newly active project. A late result from project A can populate the menu used in project B, and selecting a matching ticket/group id can mutate project B using stale project-A menu state. Close the menu on project changes or bind the menu's read/write client/project identity.
- F-002 — major, deferred-to-ticket GUI-111 — GitHub thread 3835659781. The listGroups rejection handler sets cardMenuGroups([]), so IPC/store failures are presented as “No active groups available” with an instruction to create a group. This violates the packet's stated error-surface expectation and hides operational failure. Preserve an explicit loading/error state or route the error through the existing visible error surface.
- F-003 — major, deferred-to-ticket GUI-111 — GitHub thread 3835659784. listGroups excludes archived groups at discovery time, but addCardToGroup only re-reads the ticket. If another actor archives the selected group before the write, core's current membership validator accepts existing archived groups, leaving a membership that disappears from active chips/filter views. Revalidate active group state immediately before assignment and handle the concurrent archive according to the governing semantics.
- F-004 — minor, deferred-to-ticket GUI-111 — GitHub thread 3835659786. Every active group is rendered directly into the nested ContextMenu, but the context-menu CSS has no max-height/overflow behavior and keyboard navigation does not scroll the active entry into view. Large boards can render entries outside the viewport and make later groups unreachable. Add bounded scrolling/visibility handling or an equivalent scalable picker.
- F-005 — minor, deferred-to-ticket GUI-111 — GitHub thread 3835659787. The updated manual says “creating or archiving a group remains an agent action,” but GroupView already exposes an Archive/Unarchive button through updateGroup. Document only creation as agent-only and describe the existing group-detail archive control accurately.
- F-006 — major, deferred-to-ticket GUI-111 — GitHub thread 3835659788. runCardAction sets the assignment error in its catch and then always calls refresh; successful refresh clears error, so an optimistic-concurrency failure from getItem/updateItem is immediately erased after the menu closes. Preserve the failure across refresh or clear the error only after a successful action.

All six review threads are preserved in GUI-111, which blocks GUI-109. None is fixed, rejected, or accepted as risk in this review.

## Evidence

- Focused helper tests: PASS, 5/5.
- Full GUI suite: PASS, 44 files / 387 tests.
- Workspace typecheck: PASS, all workspaces.
- GUI production build: PASS.
- Manual freshness: PASS, 22 chapters up to date.
- git diff --check HEAD^ HEAD: PASS.
- Live Electron card-menu interaction and screenshot: INCONCLUSIVE, as already parked by the packet; not promoted to PASS.
- Prior hosted run 32563191261: verify job 97007849315 PASS; kanmer-gate job 97007849283 failed on the event-time Implementing/no-review snapshot. This is preserved as a stage-race attempt; a rerun follows this current Review attestation.

## Verdict

NEEDS-CHANGES. The deterministic rails and bounded membership model pass, but the open major correctness findings prevent an independent pass or merge. GUI-109 remains in Review for the author to address and for re-review at a fresh PR head.
