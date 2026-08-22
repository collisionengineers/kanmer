# Plan — CORE-080: manual retry and retained-ref contract

## Objective

Prevent a manual board-sync Retry from pushing through a stale cached branch, and make FRD-020/manual guidance explicitly match the retained-ref custom-rename handoff.

## Starting state

CORE-043's head `f63d953fc8467440988c887c62a34ade0c77c96c` has live branch inspection, mismatch pause state, and custom rename retention. Automatic sync preflights the live branch; `syncProject(..., false)` does not, so Retry can call `syncBoard` with a stale branch. PR #168's independent review also identified that FRD-020's acceptance wording still implies deleting the old custom ref while the safe implementation retains it until `KANMER_BOARD_BRANCH` is updated.

## Governing docs

- `docs/functional/frd/FRD-020-board-git-worktree-sync.md`: Meets R3/R5 by applying the same live-branch safety rule to manual Retry and making the retained-ref handoff the explicit end state; no unrelated requirement changes.
- `docs/architecture/adr/ADR-0016-compiled-workflow.md`: Meets the observational health and explicit repair boundary; no change to the architectural decision.

## Required changes

1. In the existing GUI main-process `syncProject` path, inspect and refresh the live board branch before a non-automatic retry when the project is paused or otherwise has a board worktree. If the live branch is mismatched, return the paused status and do not call `syncBoard`; if it matches, preserve genuine errors and allow the existing retry path.
2. Add focused real-Git/regression coverage for the stale-cache retry case, the exact-destination handoff, and retained-ref messaging without weakening existing assertions.
3. Update FRD-020 R5/acceptance and board-sync manual wording to describe retained old refs until the hosted branch variable is updated, while preserving protected-default refusal and the operator cleanup step.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `apps/gui/src/main/index.ts` | Manual retry live-branch preflight. |
| Modify | `apps/gui/src/main/kanmerGit.test.ts` | Regression tests for retry safety and retained-ref contract. |
| Modify | `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Normative R5/acceptance wording. |
| Modify | `docs/manual/board-sync.md` | Operator-facing handoff and retry wording. |
| Verify | `apps/gui/src/main/kanmerGit.ts`, `apps/gui/src/main/syncBranch.ts`, `apps/gui/src/main/syncTimer.ts` | Reuse and invariant checks; no duplicate implementation. |

## Do not modify

GitHub protection or repository variables, MCP/core transport, unrelated GUI settings, or any ticket/board files outside Kanmer MCP.

## Constraints

- Preserve no-force/no-other-branch sync semantics, protected-default refusal, and genuine conflict error visibility.
- Do not add dependencies or a second branch-inspection helper.
- Tests must prove the production caller path, not only an isolated helper.
- Work on a dedicated CORE-080 branch based on the CORE-043 implementation head; do not merge the parent or bypass protection from this ticket.

## Ordered steps

1. Reproduce the paused manual Retry path and confirm the live mismatch can reach `syncBoard` through the cached branch.
2. Add the manual preflight using `inspectBoardWorktree`/`refreshBoardBranch`, returning early on mismatch and preserving genuine pause/error state.
3. Add focused regression tests for mismatch refusal and exact-destination retry, then run the GUI suite.
4. Align FRD-020 and board-sync manual text with retained-ref semantics and run documentation/prose checks.
5. Run the complete planned verification rail, write the post-implementation report, commit, and open a PR for independent review.

## Acceptance checks

- A manual Retry on a worktree observed on neither the cached nor requested branch does not invoke `syncBoard` or push any ref.
- A manual Retry after the worktree reaches the exact saved branch preserves genuine errors and can re-arm sync only after a successful sync.
- Custom-to-custom rename documentation explicitly retains the old remote ref until `KANMER_BOARD_BRANCH` is updated and then permits cleanup.
- Existing protected-default refusal and automatic timer safety tests remain passing.
- The changed code has a named production caller (`syncProject` IPC Retry path), and all tests retain their assertions.

## Commands

- `npm run typecheck -w @kanmer/gui`
- `npm test --workspace @kanmer/gui`
- `npm run test:scripts`
- `npm run verify-skill-prose`
- `git diff --check`
- After merge: `npm run verify` and the merged-main GUI/core/script checks required by the parent verification rail.

## Failure and deviation rules

Stop on a failing test, missing path, unresolved review finding, or conflict with FRD-020/ADR-0016. Record the failure and create/link a separate remediation ticket if it is outside this bounded retry/document scope.

## Stop condition

Stop after the implementation PR is opened with all pre-review evidence and the ticket is in Review. Do not merge or start another ticket from this lane.
