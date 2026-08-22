# CORE-046 merged-main proof

## Verification target

- Target: origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9 (2026-08-23).
- All 7 recorded CORE-046 commits, including CORE-047/049/050 cumulative ancestry, are reachable from this target.
- Verification used a detached checkout of origin/main; no feature worktree source was treated as shipped proof.

## Deterministic rails

- npm run test -w @kanmer/core -- --run src/io.test.ts — exit 0, 32/32, including concurrent stale-lock quarantine/reclaimer and inherited IO assertions.
- node --test packages/mcp-server/src/sources.test.mjs — exit 0, 32/32, including IPv6 and redirect/linked-hop destination policy.
- npm run test -w @kanmer/core -- src/sources.test.ts src/store.test.ts — exit 0, 91/91.
- npm run test:http -w @kanmer/mcp-server — exit 1, 99/100. The only failure is the shared Windows project-resolution child spawnSync ETIMEDOUT; preserve as INCONCLUSIVE. All lock/source/HTTP/remote/doctor/tunnel cases otherwise passed.
- npm run typecheck -w @kanmer/core — exit 0; npm run typecheck -w @kanmer/mcp-server — exit 0.
- npm run test:scripts — exit 0, 88/88; npm run verify:docs — exit 0; npm run verify:skills — exit 0; npm run verify:agents-block — exit 0, 31/31; git diff --check — exit 0.
- Initial plugin:check in the depth-nested detached worktree exited 1 because the committed bundle differed from a fresh build. After rebuilding the local artifact in that same checkout, plugin:check exited 0 with 37 tools and matching bytes. This path-depth-sensitive artifact comparison is recorded as INCONCLUSIVE for the committed-main artifact, not fabricated as a mainline PASS.

## Boundaries

Live DNS rebinding, PID reuse, exact crash timing, Windows handle behavior, packaged/live hosted proof, and external network reachability remain INCONCLUSIVE as parked by the ticket. Deterministic ownership and destination-policy contracts pass on merged main.
