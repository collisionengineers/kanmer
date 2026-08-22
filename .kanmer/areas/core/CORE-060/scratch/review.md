## Independent review — NEEDS-CHANGES — fbb528734e43d2d86c24359b88395169f197506b

Reviewer: codex-core060-review, independent of the implementation author. Exact reviewed head: fbb528734e43d2d86c24359b88395169f197506b (PR #197), exact base CORE-043 head: 94f7094b0b103aecec452f0e58ebaf0ad370f8ff.

Scope and code review: the generated branch-mismatch provenance markers and exact-destination cleanup are correctly scoped; genuine pre-existing error/paused state is retained. The automatic predicate is separated from manual Sync now/Retry, and timer clear/re-arm wiring is centralized across open, close, preference changes, and migration.

Blocking findings:

1. P1 — automatic execution checks only cached status. `syncProject(projectId, true)` calls `shouldRunAutomaticSync(ctx.syncStatus)` and then `syncBoard(ctx.syncStatus)` without first inspecting the live board worktree branch. If an administrator renames or checks out the board worktree after the last refresh, the cached status can remain healthy and `syncBoard` can commit/rebase/push using the stale `status.branch` refspec. Refresh/inspect the symbolic ref before each automatic run and pause on a newly detected mismatch.

2. P2 — successful manual retry does not re-arm automatic sync. A prior automatic failure clears the only interval. The IPC Retry/Sync-now path calls `syncProject(projectId)` with `automatic=false`; when it succeeds, no `armSyncTimer` call restores the configured interval. Automatic sync therefore remains silently disabled until preferences are saved or the project is reopened. Re-arm after a successful manual retry (while preserving pause/mismatch guards).

Evidence: `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts` exit 0, 23/23; `npm run test -w @kanmer/core -- --run` exit 0, 283/283; `npm run test:scripts` exit 0, 89/89; `git diff --check 94f7094b...fbb528734e` exit 0. Reported GUI typecheck remains INCONCLUSIVE on inherited stale-core dispatch/antigravity errors; PR #197 has no hosted checks attached. These green rails do not cover either live-branch-before-automatic-run or manual-retry timer re-arm regression.

Verdict: NEEDS-CHANGES. Do not merge PR #197 or move CORE-060; re-review a new exact head after both fixes and tests are added.
