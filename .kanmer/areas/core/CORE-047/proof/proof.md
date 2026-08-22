# Verification proof — CORE-047

## Verification target

The cumulative CORE-044 branch, `core-044-source-fetch-remediation`, at exact merged head `142af2f3b105b38b00d659019d1cfe99f3b50844`. PR #169 (CORE-047) merged into its CORE-046 base at `0f7ccc4efad0aeae2295f3ba08e0b6e886356679` on 2026-08-22T11:25:28Z; the later cumulative merges are present at the verification head.

This is exact cumulative evidence for this verification batch, not a claim that `origin/main` contains the chain. `origin/main` is `34245be039e8fd8395b5e31835602c54e62e98a4`; parent promotion remains open.

## Evidence

Commands run from clean `.worktrees/core-044`:

- `npm test -w @kanmer/core -- --run src/io.test.ts` — PASS, 25/25, including replacement-lock ownership, third-claimant protection, release-order, bounded retry, and inherited IO assertions.
- `node --test packages/mcp-server/src/sources.test.mjs` — PASS, 14/14.
- `npm run typecheck -w @kanmer/core` — PASS.
- `npm run build:core` — PASS.
- `git diff --check` — PASS.

The existing CORE-047 report also records focused core 109/109, source 14/14, typecheck/build/plugin parity PASS, and no hosted/external Windows stress claim.

## Outcome and boundaries

Ownership-safe token/lease reclaim behavior is present at the exact cumulative merged head and focused IO/source evidence passes. Genuine multi-process Windows crash/PID-reuse/process-termination stress and hosted proof remain INCONCLUSIVE; no such claim is made.

- PR: https://github.com/collisionengineers/kanmer/pull/169
- Merge date: 2026-08-22T11:25:28Z
- Verification basis: exact cumulative merged branch, not `origin/main`.
