# Verification proof — CORE-070

## Merged source

- Verified on merged origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9.
- PR #191 (https://github.com/collisionengineers/kanmer/pull/191) merged at e966509c729194916d24194a87257cc1d39f308b on 2026-08-22T15:40:27Z.
- git merge-base --is-ancestor e966509c729194916d24194a87257cc1d39f308b origin/main — PASS.

## Deterministic merged-main evidence

- npm run build — PASS (core and MCP server ESM/standalone builds).
- npm run test -w @kanmer/core -- --pool=threads --maxWorkers=1 --minWorkers=1 — PASS, 310/310.
- npm run test -w @kanmer/gui -- src/main/kanmerGit.test.ts --pool=threads --maxWorkers=1 --minWorkers=1 — PASS, 31/31.
- npm run typecheck — PASS, all workspaces.
- npm run test:scripts — PASS, 88/88.
- npm run check:manual — PASS, 22 chapters current.
- npm run verify:docs — PASS.
- git diff --check — PASS.

## Ticket scope

The merged implementation for CORE-058 review: enforce effective cache ignore ordering is present in the reachable cumulative mainline and covered by the focused real-Git kanmerGit.test.ts suite. Linked dependency readback: [[CORE-058]].

## Preserved failures and boundaries

- The initial parallel attempt is preserved: core 307/310 with three Windows cleanup/timeouts, scripts 86/88 with two fresh-dist/setup failures, stale-dist typecheck errors, and concurrent GUI 18/31. After the required build and serialized single-worker rerun, the exact rails above passed.
- Live Windows lock/permission reproduction, hosted protection, packaged installer behavior, and visual/manual interaction evidence are unavailable and remain INCONCLUSIVE; no external evidence is fabricated.

## Outcome

Merged deterministic behavior is verified on fdaededcf8bff0c5d5867e386782d8bdc32324e9; proof is sufficient for Verifying→Done.
