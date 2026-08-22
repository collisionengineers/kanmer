# CORE-043 post-implementation report

## Result

Implemented the protection-aware board-branch rename boundary. Kanmer now refuses to automatically rename away from the protected default `kanmer-board` before any Git mutation. The GUI reports the administrator handoff, and an open-project refusal retains the old persisted branch preference while applying the requested sync interval. Non-protected/custom branch renames retain the existing history-preserving push-before-delete behavior.

## Files changed

- `apps/gui/src/main/kanmerGit.ts` — protected-default constant and fail-closed refusal.
- `apps/gui/src/main/index.ts` — preflight refusal for open protected boards and preference preservation.
- `apps/gui/src/main/kanmerGit.test.ts` — 14 real-Git tests covering protected no-mutation, closed-project refusal, and custom history/remote behavior.
- `apps/gui/src/renderer/src/components/Settings.tsx` — retarget-first user guidance.
- `docs/functional/frd/FRD-020-board-git-worktree-sync.md`, `docs/manual/board-sync.md`, `docs/manual/settings.md` — governing/manual contract.
- `apps/gui/src/renderer/src/manual/chapters.generated.ts` — regenerated shipped manual.

## Verification

| Command | Result | Evidence |
|---|---|---|
| `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts` | PASS | 14/14, exit 0; protected default local HEAD/show-ref/remote/worktree unchanged; custom history/remote rename preserved. |
| `npm run build:core` | PASS | exit 0. |
| `npm run test:scripts` (after core build) | PASS | 88/88, exit 0. |
| `npm run check:manual` | PASS | generated manual current, exit 0. |
| `npm run verify:docs` | PASS | docs/manual/provider checks and generated manual current, exit 0. |
| `git diff --check` | PASS | exit 0. |

## Typed failures retained

- Initial `npm run test:scripts` attempt failed 2 tests because `packages/core/dist/index.js` was absent in the clean worktree; the prerequisite `npm run build:core` then passed and the rerun was 88/88. Both attempts are retained in scratch.
- `npm run test -w @kanmer/gui` on the clean `origin/main` base ran 41 passing files/294 passing tests but failed 4 dispatch/provider cases because the base lacks shared `antigravity` dispatch parity; the focused CORE-043 file passed.
- `npm run typecheck` failed in unrelated MCP/GUI dispatch parity (`dispatchDeliverableProven` missing export, `verifyDeliverable` option/type errors, and `antigravity` provider type mismatch).
- `npm run build -w @kanmer/gui` failed on the same unrelated missing `dispatchDeliverableProven` export from `packages/core/dist/index.js`.

## External boundary

No GitHub credentials, protection API/App, or live branch-rule mutation was available or attempted. Live protection-retarget proof is INCONCLUSIVE; this packet makes no hosted protection claim. CORE-046 and other lanes were not touched.

## Traceability

- Branch: `core-043-protection-retarget`
- Worktree: `.worktrees/core-043`
- Commit: `1a06ead17cca8f7a6c715db3a6f6fed6b3de5da6`
- PR: #168 — https://github.com/collisionengineers/kanmer/pull/168
- Stop condition: open PR and move CORE-043 to Review; do not merge or self-review.
