# Post-implementation report

## Change

`ensureBoardWorktree` now preserves the canonical attached board worktree path when `.gitignore` reconciliation fails. It returns a paused, unavailable status with the known `boardRoot` and actionable error instead of returning an empty status that lets callers fall back to the source checkout.

## Verification

- Focused GUI Git rail: `npm run test -w @kanmer/gui -- src/main/kanmerGit.test.ts` — PASS, 18/18.
- GUI typecheck: `npm run typecheck -w @kanmer/gui` — PASS.
- Core build: `npm run build:core` — PASS.
- Script suite: `npm run test:scripts` — PASS, 88/88.
- Manual documentation check: `npm run check:manual` — PASS, 22 chapters current.
- Documentation verification: `npm run verify:docs` — PASS.
- `git diff --check` — PASS.

## Regression

The real-Git regression makes the attached worktree `.gitignore` path a directory, forcing reconciliation to fail deterministically. It proves `available: false`, `paused: true`, a non-empty error, and the resolved canonical `boardRoot` while the worktree remains on the configured branch.

## Scope and limitations

The change is limited to the attached-worktree reconciliation path identified in CORE-058 review. No external Windows lock/permission or hosted GUI evidence was available in this run.
