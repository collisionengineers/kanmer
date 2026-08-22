# CORE-047 merged-main proof

## Verification target

- Target: origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9 (2026-08-23).
- Both recorded commits 47169144c0bd13bd205e42922c0282bfd56c466a and 67e2be792e8480d29df7ff13128fb8c7886056a9 are reachable from this target.
- Verification used detached merged-main source; the old feature worktree was not used as shipped proof.

## Deterministic rails

- npm run test -w @kanmer/core -- --run src/io.test.ts — exit 0, 32/32, including forward/reversed stale-lock ownership and inherited assertions.
- npm run test -w @kanmer/core -- src/sources.test.ts src/store.test.ts — exit 0, 91/91.
- node --test packages/mcp-server/src/sources.test.mjs — exit 0, 32/32.
- npm run typecheck -w @kanmer/core — exit 0; npm run typecheck -w @kanmer/mcp-server — exit 0.
- npm run test:scripts — exit 0, 88/88; npm run verify:docs — exit 0; npm run verify:skills — exit 0; npm run verify:agents-block — exit 0, 31/31; git diff --check — exit 0.
- npm run test:http -w @kanmer/mcp-server — exit 1, 99/100 because the shared Windows project-resolution child spawnSync timed out; this is INCONCLUSIVE and preserves the first failure.

## Boundaries

Genuine multi-process Windows crash/PID-reuse/process-termination stress, live DNS rebinding, hosted proof, and packaged proof remain INCONCLUSIVE as explicitly parked. No external claim is fabricated.
