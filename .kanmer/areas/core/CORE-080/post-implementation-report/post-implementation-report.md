# Post-implementation report — CORE-080

## Summary

Manual board-sync Retry now performs the same live-branch preflight as automatic sync before any commit, rebase, or push. An unexpected or detached live board branch remains paused with no Git mutation; an exact saved branch proceeds to the existing sync path, and genuine prior errors remain visible. FRD-020 R5 and the board-sync manual now describe retained custom old refs until the hosted `KANMER_BOARD_BRANCH` variable is updated.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/index.ts` | Modified `syncProject` to call the shared preflight for both automatic and manual sync, returning the rendered paused status before `syncBoard` when a manual Retry sees a live mismatch. | Prevents stale cached branches from being committed, rebased, or pushed through the Retry IPC path. |
| `apps/gui/src/main/kanmerGit.ts` | Added `preflightBoardSync`, reusing `inspectBoardWorktree` and `refreshBoardBranch`. | Keeps the live observation/mismatch transition in one production-used seam for both sync callers. |
| `apps/gui/src/main/kanmerGit.test.ts` | Added real-Git regressions for unexpected live-branch refusal/no mutation and preservation of a genuine paused error on the exact saved branch. | Proves the preflight contract against actual worktrees and retained assertions. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Updated R5, acceptance, and verified-code wording for retained old custom refs and manual Retry preflight. | Aligns the governing acceptance contract with the shipped safe handoff. |
| `docs/manual/board-sync.md` | Added Retry live inspection/no-mutation guidance and clarified retained-ref handoff. | Gives operators the same contract exposed by the GUI. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Regenerated the committed manual artifact. | Keeps the in-app manual synchronized with `docs/manual`. |

## Governing docs

- FRD-020 R5: custom-to-custom rename retains the old remote ref until `KANMER_BOARD_BRANCH` is updated; manual Retry now re-inspects the live worktree and refuses mismatches before `syncBoard`.
- ADR-0016: observation and repair remain separate; this change only observes live branch state and returns the existing fail-closed paused status before invoking the existing repair/sync path.
- No new dependency, provider behavior, protection mutation, or board-worktree implementation was added.

## Risks / follow-ups

- The full GUI rail and GUI typecheck retain inherited failures from the CORE-043 cumulative base: missing shared dispatch provider `antigravity`/core dispatch declarations and one dispatch assertion mismatch. Exact exit-1 output is preserved in CORE-080 scratch; no assertions were weakened.
- Hosted GitHub protection and Actions-variable mutation remain operator boundaries; live external proof is not claimed by this ticket.
- Independent review and merged-main verification remain required.

## Verification hand-off

On the merged commit, run:

- `npm test --workspace @kanmer/gui -- src/main/kanmerGit.test.ts` — expected 26/26 or newer exact focused count.
- `npm test --workspace @kanmer/gui` — record inherited provider/dispatch failures if the base remains unchanged.
- `npm run typecheck -w @kanmer/gui` — record the inherited core/dispatch declaration failures unless the parent cumulative base has repaired them.
- `npm run test:scripts`, `npm run verify:skills`, `npm run verify:docs`, `npm run check:manual`, and `git diff --check`.
- Confirm the generated manual is current and inspect the GUI Retry behavior against a live mismatched board worktree; no hosted protection mutation is required or claimed.
