# Verification proof — CORE-045

## Verification target

The cumulative CORE-044 branch, `core-044-source-fetch-remediation`, at exact merged head `142af2f3b105b38b00d659019d1cfe99f3b50844`. PR #166 (CORE-045) merged into that branch at this SHA on 2026-08-22T12:55:09Z; the cumulative head includes CORE-045 plus the reviewed CORE-047/049/050/051/053 descendants.

This is the exact cumulative evidence permitted for this verification batch. It is not a claim that `origin/main` contains the chain: `origin/main` is currently `34245be039e8fd8395b5e31835602c54e62e98a4`, while the parent promotion remains a separate open PR.

## Evidence

Commands run from the clean cumulative worktree `.worktrees/core-044`:

- `npm test -w @kanmer/core -- --run src/io.test.ts` — PASS, 25/25.
- `node --test packages/mcp-server/src/sources.test.mjs` — PASS, 14/14.
- `npm run typecheck -w @kanmer/core` — PASS.
- `npm run build:core` — PASS.
- `git diff --check` — PASS.

Existing cumulative report evidence, read back from CORE-045, records full core 303/303, source 14/14, plugin/typecheck/build parity PASS, scripts/protocol/discovery/docs rails PASS, and the broad HTTP rail 81/82 with isolated readiness 7/7.

## Outcome and boundaries

The stale-lock ownership/reclaim and complete DNS destination-policy behavior is present at the exact cumulative merged head and the deterministic focused rails pass. Live DNS rebinding, Windows handle/crash/PID/PID-reuse stress, and external hosted proof remain INCONCLUSIVE as recorded in the implementation report; no such claim is made here.

- PR: https://github.com/collisionengineers/kanmer/pull/166
- Merge date: 2026-08-22T12:55:09Z
- Verification basis: exact cumulative merged branch, not `origin/main`.
