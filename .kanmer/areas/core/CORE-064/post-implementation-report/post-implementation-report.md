# Post-implementation report

## Change

When an existing board worktree is renamed onto the configured branch, an ignore-reconciliation failure now preserves that canonical `boardRoot` and returns a paused, unavailable status with the error. Callers cannot fall back to the source checkout after the rename has succeeded.

## Verification

- Focused GUI Git rail: `npm run test -w @kanmer/gui -- src/main/kanmerGit.test.ts` — PASS, 19/19.
- GUI typecheck: `npm run typecheck -w @kanmer/gui` — PASS.
- Script suite: `npm run test:scripts` — PASS, 88/88.
- Manual check: `npm run check:manual` — PASS, 22 chapters current.
- Documentation verification: `npm run verify:docs` — PASS.
- `git diff --check` — PASS.

## Regression

The new real-Git regression makes the board `.gitignore` path a directory, calls `ensureBoardWorktree` with an old existing branch and a new configured branch, and proves the rename occurs while the result retains the resolved board root, new branch, paused state, and actionable error.

## Limitations

External Windows lock/permission and hosted GUI evidence remain unavailable in this run.
