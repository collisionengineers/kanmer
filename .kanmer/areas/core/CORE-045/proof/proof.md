# CORE-045 merged-main proof

## Verification target

- Target: origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9 (2026-08-23).
- All 14 recorded CORE-045 commits, including its CORE-046/047/049/050/051/053 cumulative ancestry, are reachable from this target.
- Verification used the detached merged-main checkout, not the old cumulative feature worktree.

## Deterministic rails

- npm run test -w @kanmer/core -- --run src/io.test.ts — exit 0, 32/32.
- npm run test -w @kanmer/core -- src/sources.test.ts src/store.test.ts — exit 0, 91/91.
- node --test packages/mcp-server/src/sources.test.mjs — exit 0, 32/32.
- npm run typecheck -w @kanmer/core — exit 0.
- npm run typecheck -w @kanmer/mcp-server — exit 0.
- npm run test:scripts — exit 0, 88/88.
- npm run verify:docs — exit 0; npm run verify:skills — exit 0; npm run verify:agents-block — exit 0, 31/31; git diff --check — exit 0.
- npm run test:http -w @kanmer/mcp-server — exit 1, 99/100. The sole failure is the shared Windows project-resolution child spawnSync ETIMEDOUT; preserve as INCONCLUSIVE. All lock/source/HTTP/remote/doctor/tunnel cases otherwise passed.

## Boundaries

Live DNS rebinding, PID reuse, exact crash/unlink timing, packaged/live hosted proof, and external network reachability remain INCONCLUSIVE as explicitly parked by the packet. No external claim is fabricated.
