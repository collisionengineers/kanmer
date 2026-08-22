# Post-implementation report — GUI-109

## Outcome

Implemented Add to group in the existing ticket card ContextMenu. The menu discovers active groups through `ProjectClient.listGroups()`, disables memberships already present, and writes through `ProjectClient.updateItem(id, { groups, expectedUpdated })`. The latest ticket is re-read immediately before the write, so an external edit causes the core optimistic-concurrency conflict to surface through the existing error/refresh path instead of being overwritten. No new IPC/MCP/core contract or duplicate group model was added.

Updated `docs/manual/groups.md` and regenerated the 22-chapter in-app manual.

## Rails and exact results

All commands below ran in `.worktrees/gui-109` unless noted.

| Command | Exit | Result |
|---|---:|---|
| `npm run test -w @kanmer/gui -- --run src/renderer/src/lib/groupMenu.test.ts` (initial helper) | 0 | 4/4 PASS |
| `npm run typecheck -w @kanmer/gui` (initial fresh linked-worktree attempt) | 1 | Preserved baseline: stale main-checkout @kanmer/core junction lacked `dispatchDeliverableProven`, `verifyDeliverable`, and `antigravity` types. |
| `npm run build:core` | 0 | Ticket-local core build generated the required declarations/dist. |
| `npm run typecheck -w @kanmer/gui` (after ticket-local `node_modules/@kanmer/core` junction to `packages/core`) | 0 | PASS. |
| `npm run test -w @kanmer/gui` (before final concurrency assertion) | 0 | 44 files / 386 tests PASS. |
| `npm run build:manual` | 0 | Wrote 22 chapters. |
| `npm run check:manual` | 0 | Manual up to date, 22 chapters. |
| `npm run build -w @kanmer/gui` (before final concurrency assertion) | 0 | Electron main/preload/renderer bundles built. |
| `npm run typecheck` (final code) | 0 | Core, MCP server, UI, and GUI all PASS. |
| `npm run test -w @kanmer/gui -- --run src/renderer/src/lib/groupMenu.test.ts` (final code) | 0 | 5/5 PASS, including revision-bound patch assertion. |
| `npm run test -w @kanmer/gui` (final code) | 0 | 44 files / 387 tests PASS. |
| `npm run build -w @kanmer/gui` (final code) | 0 | Electron main/preload/renderer bundles built. |
| `git diff --check` (final code) | 0 | PASS. |
| `npm test` (before final concurrency assertion) | 0 | Manual PASS; core 14 files / 283 tests PASS; GUI 44 files / 386 tests PASS; MCP HTTP 68/68 PASS; scripts 88/88 PASS. Retained as a complete broader-rail attempt; final code additionally has the 5th focused concurrency test and final GUI/typecheck/build reruns above. |

## Scope and evidence boundaries

- PASS: existing-group discovery, labels, disabled duplicate entries, empty-group explanation, append-without-duplicates, latest-revision binding, ticket-owned update path, full deterministic GUI suite, manual freshness, typecheck, build, and diff check.
- INCONCLUSIVE: live Electron card-menu selection after reload and screenshot/visual proof. No controlled interactive desktop session was available; this remains parked in the checklist and is not promoted to PASS.
- Not claimed: group creation/archiving UI, new storage, provider/dispatch work, CORE-026, CORE-035, or MCP/core contract changes.

## Traceability

- Branch: `gui-109-add-to-group`
- Worktree: `.worktrees/gui-109`
- Commit: `c259af171a72fa83a9131f4f53a79d0cfd0f05b5`
- PR: #162 (`https://github.com/collisionengineers/kanmer/pull/162`)
- PR remains open and unmerged; author stops at Review for independent review.
