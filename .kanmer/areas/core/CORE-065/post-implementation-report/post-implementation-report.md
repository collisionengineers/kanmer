# Post-implementation report

## Change

Failed board-worktree ignore reconciliation remains a distinct, retryable Git state. The GUI retains the canonical board root and error, shows the board path instead of the non-Git message, and `Sync now`/`Retry` re-runs in-place attachment reconciliation before attempting board sync. A successful repair restores normal availability and repeated retries are idempotent.

## Verification

- Focused GUI Git rail: `npm run test -w @kanmer/gui -- src/main/kanmerGit.test.ts` — PASS, 20/20.
- GUI typecheck: `npm run typecheck -w @kanmer/gui` — PASS.
- Script suite: `npm run test:scripts` — PASS, 88/88.
- Manual check: `npm run check:manual` — PASS, 22 chapters current.
- Documentation verification: `npm run verify:docs` — PASS.
- `git diff --check` — PASS.

## Regression

The real-Git regression forces the attached `.gitignore` path to fail, verifies the retained board root/error/paused status, repairs that exact path, then verifies successful retry and a repeated idempotent retry. The production sync path now retries retained failed-Git attachments, and Settings distinguishes that state from a non-Git project.

## Limitations

External Windows lock/permission and hosted GUI evidence remain unavailable in this run.
