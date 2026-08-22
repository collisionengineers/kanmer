# Verification proof — CORE-049

## Verification target

The cumulative CORE-044 branch, `core-044-source-fetch-remediation`, at exact merged head `142af2f3b105b38b00d659019d1cfe99f3b50844`. PR #171 (CORE-049) merged into CORE-046 at `311c6eef4d6b5c1e6acea1b7e6d779660f792cea` on 2026-08-22T12:10:43Z, and its child PR #172 merged at `31e572dc54b311164444cd5ee1a6cba225d618f2`; both are included in the verification head.

This is exact cumulative evidence for this verification batch, not a claim that `origin/main` contains the chain. `origin/main` is `34245be039e8fd8395b5e31835602c54e62e98a4`; parent promotion remains open.

## Evidence

Commands run from clean `.worktrees/core-044`:

- `npm test -w @kanmer/core -- --run src/io.test.ts` — PASS, 25/25, including bounded EPERM/EBUSY/EACCES quarantine retry and ownership/concurrency regressions.
- `node --test packages/mcp-server/src/sources.test.mjs` — PASS, 14/14.
- `npm run typecheck -w @kanmer/core` — PASS.
- `npm run build:core` — PASS.
- `git diff --check` — PASS.

The existing cumulative CORE-049 report also records pre-child IO 19/19, child IO 22/22, focused core 113/113, source 14/14, typecheck/build/plugin parity PASS, and broad HTTP 81/82 with isolated readiness 7/7.

## Outcome and boundaries

Bounded stale-quarantine rename retry and child ownership revalidation are present at the exact cumulative merged head and focused evidence passes. Broad HTTP readiness remains an inherited 81/82 boundary; live Windows handle/crash/PID evidence and hosted proof remain INCONCLUSIVE.

- PR: https://github.com/collisionengineers/kanmer/pull/171
- Merge date: 2026-08-22T12:10:43Z
- Verification basis: exact cumulative merged branch, not `origin/main`.
