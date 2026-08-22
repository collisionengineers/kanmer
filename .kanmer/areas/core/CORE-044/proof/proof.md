# CORE-044 merged-main proof

## Commit and target

- Verification target: origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9 (2026-08-23).
- All 22 recorded CORE-044 commits, including cumulative CORE-045/051/053/056/057/058 ancestry, are reachable from this origin/main target.
- No feature worktree source was used for the result; the temporary verification checkout was detached at origin/main.

## Deterministic rails

- npm run test -w @kanmer/core -- src/sources.test.ts src/store.test.ts — exit 0, 2 files / 91 tests passed.
- node --test packages/mcp-server/src/sources.test.mjs — exit 0, 32 tests passed.
- npm run test:http -w @kanmer/mcp-server — exit 1, 99 passed / 1 failed. The sole failure was project resolution fails before binding and leaves no listener; its child spawnSync node timed out with ETIMEDOUT in the shared Windows environment. This is preserved as INCONCLUSIVE, not a pass; the command's build completed and all source, HTTP, remote, doctor, and tunnel tests otherwise passed.
- npm run typecheck -w @kanmer/core — exit 0.
- npm run typecheck -w @kanmer/mcp-server — exit 0.
- npm run test:scripts — exit 0, 88/88.
- npm run verify:docs — exit 0.
- npm run verify:skills — exit 0.
- npm run verify:agents-block — exit 0, 31/31.
- git diff --check — exit 0.

## Boundaries

The full HTTP rail's one environment-sensitive child-process timeout remains INCONCLUSIVE. Live external-site/DNS-rebinding/private-network, crash-at-write, packaged update, and GUI-editor claims remain unavailable or explicitly deferred by the ticket packet; no such proof is fabricated. Deterministic source/cache/security contracts pass on merged main.
