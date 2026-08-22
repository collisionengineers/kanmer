# Post-implementation report

## Change

Paused projects now adopt the currently saved board branch when Git settings
change. Manual retry reads that saved branch before calling
`ensureBoardWorktree`, so a stale paused status cannot repair or attach the
wrong branch; an empty setting keeps the existing status branch.

## Verification

- Focused branch/timer regressions: `npm test -w @kanmer/gui -- --run src/main/syncBranch.test.ts src/main/syncTimer.test.ts` — PASS, 4/4.
- GUI Git integration rail: `src/main/kanmerGit.test.ts` — PASS, 23/23.
- Initial GUI typecheck failed because the fresh worktree had no installed workspace links; after the normal `npm install --ignore-scripts --no-audit --no-fund`, `npm run typecheck -w @kanmer/gui` — PASS.
- Core build prerequisite: `npm run build:core` — PASS.
- Script suite: `npm run test:scripts` — PASS, 88/88.
- `git diff --check` — PASS.

## Regression

Deterministic tests prove a changed saved branch wins over a stale paused
status, while an unavailable setting preserves the paused branch.

## Limitations

Hosted Windows GUI and remote proof remain unavailable in this run.
