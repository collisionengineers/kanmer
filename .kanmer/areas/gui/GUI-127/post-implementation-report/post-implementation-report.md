# Post-implementation report — GUI-127

## Change

Commit `b4399665` changes only two GUI test files:

- `apps/gui/src/main/kanmerGit.test.ts` now awaits bounded `fs/promises.rm` cleanup, uses the existing scoped 30-second real-Git allowance for its lifecycle hook, and asserts that the controlled fixture root is gone.
- `apps/gui/src/main/index.sync.test.ts` applies the same cleanup pattern after retaining its existing timer and test-context teardown.

No production Git, board-worktree, notification, or settings code changed. Existing real Git, branch, worktree, and error assertions remain intact.

## Governing-doc alignment

FRD-020 requires reliable board-worktree behavior. The affected tests continue to exercise it through isolated local Git fixtures; this change makes the test lifecycle fail explicitly if those fixtures cannot be removed on Windows.

## Verification

| Command | Result |
| --- | --- |
| `npm run build -w @kanmer/core` | PASS before current-main focused testing. |
| `npm run test -w @kanmer/gui -- src/main/kanmerGit.test.ts` | PASS: 48/48 in 271.46 seconds; no controlled fixture roots remained. |
| `npm run test -w @kanmer/gui -- src/main/index.sync.test.ts` | Behavioral assertions PASS: 11/11; its controlled roots were removed. Process exit 1 due to two unhandled `Notification.isSupported` mock errors, tracked separately as GUI-128. |
| `npm run typecheck` | PASS across all workspaces. |
| `git diff --check` | PASS before commit. |
| `npm run verify` | FAIL before the companion fixture patch: it reproduced the companion cleanup failure and also exposed separate GUI-128 notification-mock and settings atomic-write failures. It is not claimed green. |

## Risks and follow-ups

- The cleanup retry is bounded and assertion-backed; it does not retry test cases or hide a leftover fixture.
- GUI-128 must complete the Electron Notification mock before `index.sync.test.ts` and the full GUI rail can exit cleanly.
- The unrelated settings atomic-write `EPERM` remains outside this ticket and needs separate triage.
- Re-run the full GUI/root rails and the hosted Windows workflow after these dependent fixture defects are resolved. Re-evaluate the single concurrent-orphan assertion only in that clean run.

## Reviewer brief

Confirm that both cleanup hooks remain scoped to real Git fixtures, that teardown occurs after required timer/context cleanup, and that no production behavior or test assertions were weakened.
