# Plan — GUI-127: deterministic Windows real-Git fixture cleanup

## Objective

Make the existing real-Git GUI integration fixture clean up reliably on Windows so the authoritative root verification rail can complete. Preserve all product and regression assertions; this is test-fixture lifecycle work only.

## Governing docs

- `docs/functional/frd/FRD-020-board-git-worktree-sync.md` requires safe, real board-worktree behavior. The existing tests continue to exercise those real Git operations in isolated local fixtures; no production branch/worktree semantics change.

## Approach

Use Node's awaited `fs/promises.rm` for the fixture root rather than the current synchronous remove. Give the lifecycle hook the same bounded 30-second real-Git fixture allowance as the test body and configure the documented retry mechanism only for transient Windows cleanup errors. Assert the root no longer exists once cleanup resolves.

This is preferred over a global Vitest timeout because only this real filesystem/Git fixture needs the allowance. It is preferred over sleeps, skipped tests, or test-level retries because a failed cleanup remains an explicit failure and every original operation still runs once.

## Steps

1. Inspect the current test imports, lifecycle hooks, GUI Vitest config, root test scripts, and GUI-085 evidence; record the current failure and confirm no production leak is proven.
2. In `apps/gui/src/main/kanmerGit.test.ts`, replace synchronous `rmSync` cleanup with `await rm` from `node:fs/promises`, using a named bounded cleanup budget and documented retry options for transient Windows filesystem errors.
3. Apply the same scoped cleanup-hook timeout used for real-Git lifecycle work and assert the root is absent after cleanup. Do not alter global Vitest configuration, production Git code, test assertions, test execution count, or fixture source paths.
4. Run the focused test repeatedly on Windows. For each controlled run, record its exit status and inspect only that run's fixture roots for leakage; do not delete historical OS-temp entries.
5. Run the complete GUI suite, root `npm run verify`, typecheck, and `git diff --check`. Open a PR so the existing Windows authoritative workflow runs; do not add a duplicate CI job.
6. Record exact local/hosted outputs, then hand the PR to independent review. Do not merge this ticket's PR.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Retrying masks a live process leak. | Cleanup remains bounded, awaited, and assertion-backed; a remaining root fails the hook. Production code stays unchanged until a leak is proven. |
| A global timeout hides unrelated regressions. | The allowance is scoped to this file's real-Git cleanup hook. |
| Removing stale user/system temporary data. | Only fixture paths created by each controlled run are observed; no historical `kanmer-git-*` roots are deleted. |
| Test-only change weakens FRD-020 coverage. | All current local remote, branch rename, worktree, and error assertions remain untouched. |

## Acceptance checks

- Repeated focused Windows runs pass without roots from those runs remaining.
- Full GUI and root verification complete successfully locally.
- The existing PR Windows workflow passes without a retry or CI exclusion.
- `git diff --check` passes and only the test fixture is changed.

## Stop condition

Stop with a focused test-fixture-only PR, post-implementation report, local evidence, and hosted Windows result. Do not change production board logic, merge the PR, or treat other tickets' external verification conditions as met.

## Scope amendment — companion real-Git fixture

Current-main full-suite evidence found the same synchronous cleanup hook in `apps/gui/src/main/index.sync.test.ts`. Extend steps 2–4 to that companion file: after clearing its owned sync timer and test context, await the same bounded removal, assert the exact fixture root is absent, and give the hook the scoped real-Git timeout. Preserve all application/mock assertions. This is the same defect class, not a new product feature.

Do not address `settings.test.ts` here: its fixed-path atomic write rename failure is a separate non-Git fixture issue and requires its own ticket.
