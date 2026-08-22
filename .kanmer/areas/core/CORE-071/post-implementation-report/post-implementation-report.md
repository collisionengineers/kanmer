# Post-implementation report

## Change

The cumulative CORE-071 implementation preserves concurrent `.gitignore`
edits by using append-only `O_APPEND` reconciliation. It appends only missing
or re-invalidated managed rules, never rewrites a stale snapshot, and retains
the symlink refusal.

## Verification

- Initial full GUI Git rail after the first compare-and-retry implementation:
  FAIL, one stale assertion expected the old canonical line position.
- Corrected cumulative GUI Git rail after CORE-074: `npm test -w @kanmer/gui
  -- --run src/main/kanmerGit.test.ts` — PASS, 25/25.
- GUI typecheck after clean worktree install and core build — PASS.
- Core build: `npm run build:core` — PASS.
- Script suite: `npm run test:scripts` — PASS, 88/88.
- `git diff --check` — PASS.

## Traceability

- CORE-071 implementation: `37bc2265` / PR #192.
- CORE-074 remediation: `59e7e0fe` / PR #193, merged as `c8ee9a4e`.
- Cumulative review head: `c8ee9a4e96c5e9d0268e21c59247db00ed958b0b`.

## Limitations

Hosted Windows GUI and remote proof remain unavailable in this run.
