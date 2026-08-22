# Post-implementation report — GUI-111

## Outcome

Implemented the six bounded GUI-109 review remediations on a dedicated stacked lane. The change is committed as `f8631395c8d078165bc353cf694ab3ea0f08a30f` and pushed to `origin/gui-111-review-remediation`. PR [#164](https://github.com/collisionengineers/kanmer/pull/164) is open against `gui-109-add-to-group`, the exact GUI-109 follow-up base, whose reviewed head was `c259af171a72fa83a9131f4f53a79d0cfd0f05b5`. No merge was performed.

## Scope and implementation

- F-001: card-menu state, gate/group discovery, dispatch-option loading, rendering, and assignment are bound to the opening project; stale async results are ignored and a project switch hides/closes the menu.
- F-002: group discovery now distinguishes loading, successful-empty, and error states; `listGroups` failures are visible as a disabled error entry rather than an empty active-group list.
- F-003: assignment rereads the ticket and immediately rereads active groups before `updateItem`, rejecting an archived/missing group and preserving the ticket-owned membership patch. The existing renderer/core contract has no transaction, so an archive after the final list response remains a documented best-effort race; it is surfaced as an action failure rather than silently creating a new storage model.
- F-004: context menus are bounded to `min(70vh, 480px)` with vertical scrolling, and keyboard navigation scrolls the active item into view.
- F-005: `docs/manual/groups.md` and the generated in-app manual now state that creation remains agent-only while GroupView supports archive/unarchive and memberships are retained.
- F-006: failed card actions preserve their error through the following refresh; successful actions retain the existing clear-on-success behavior.

Changed files are limited to `apps/gui/src/renderer/src/App.tsx`, `apps/gui/src/renderer/src/components/ContextMenu.tsx`, `apps/gui/src/renderer/src/components/ContextMenu.test.tsx`, `apps/gui/src/renderer/src/lib/groupMenu.ts`, its tests, context-menu CSS, and the groups manual/source-generated chapter. No core, MCP, IPC, provider, dispatch, or storage behavior changed.

## Verification evidence

- `npm run test -w @kanmer/gui -- --run src/renderer/src/lib/groupMenu.test.ts` — exit 0, 7/7 passed.
- `npm run test -w @kanmer/gui` — exit 0, 44 files / 389 tests passed.
- `npm run typecheck` — exit 0 for every workspace.
- `npm run build -w @kanmer/gui` — exit 0; Electron main/preload/renderer bundles produced.
- `npm run build:manual` — exit 0; 22 chapters generated.
- `npm run check:manual` — exit 0; manual up to date (22 chapters).
- `git diff --check` — exit 0.
- Hosted attempt: `gh pr checks 164 --watch=false` returned `no checks reported on the 'gui-111-review-remediation' branch`. `.github/workflows/pr.yml` triggers only pull requests targeting `main`, while this required stacked PR targets `gui-109-add-to-group`; therefore no hosted verify or kanmer-gate run was scheduled. This is recorded as unavailable, not as a hosted PASS.
- Live Electron visual interaction is INCONCLUSIVE in this headless lane.

The first GUI-only typecheck was intentionally preserved as an initial environment failure before the ticket-local core package was built/linked: `src/main/dispatch.ts(8,3): Module "@kanmer/core" has no exported member dispatchDeliverableProven`; `src/main/dispatch.ts(55,5): verifyDeliverable does not exist in DispatchSupervisorOptions`; `src/main/dispatch.ts(55,5): Parameter implicitly has an "any" type`; and `src/main/providers.ts(955,27): "antigravity" is not assignable`. After `npm run build:core` and correcting only the worktree's `@kanmer/core` junction to its ticket-local package, the full workspace typecheck passed. No source outside GUI-111 was changed to mask that baseline.

## Traceability and handoff

- Ticket: GUI-111, branch `gui-111-review-remediation`, worktree `.worktrees/gui-111`.
- Base: GUI-109 PR #162 head `c259af171a72fa83a9131f4f53a79d0cfd0f05b5`.
- Commit: `f8631395c8d078165bc353cf694ab3ea0f08a30f`.
- Follow-up commit: `51c4a3460f6bb3dfb866c541e1a7d9920394bb34`.
- PR: #164, base `gui-109-add-to-group`, open for independent review.
- Independent review owner: GUI-099; author will not self-review, merge, verify, release, or clean up.

## Follow-up P2 review thread — wheel dismissal

PR #164 review identified that the `wheel` listener passed `onClose` directly, bypassing the existing `.ctx-menu` target guard. This was valid: scrolling inside the newly bounded menu could close it. The follow-up commit changes only that listener to use the guarded `close` callback and adds `ContextMenu.test.tsx`.

Follow-up evidence:

- `npm run test -w @kanmer/gui -- --run src/renderer/src/components/ContextMenu.test.tsx` — initial attempt failed because the new DOM test omitted the jsdom directive (`ReferenceError: document is not defined`); the directive was added and the rerun passed 1/1.
- `npm run test -w @kanmer/gui -- --run src/renderer/src/components/ContextMenu.test.tsx src/renderer/src/lib/groupMenu.test.ts` — exit 0, 8/8 passed.
- `npm run typecheck -w @kanmer/gui` — exit 0.
- `git diff --check` — exit 0.

The fresh head is pushed to PR #164, which remains open and stacked on `gui-109-add-to-group`; no merge was performed.
