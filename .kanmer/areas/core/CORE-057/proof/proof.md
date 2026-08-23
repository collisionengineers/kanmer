# Verification proof — CORE-057

Remediated DNS-address pinning and resolver deadline enforcement. PR #178 merged at `7403a7cfb7079fafa88c2d18ec5b33b1a7407013`; recorded implementation SHAs are reachable from `origin/main`.

## Merged-main target

The recorded implementation and merge commits for this ticket are ancestors of `origin/main` at verification head `a8cc6b01ca95340f1186bccc9770238036d080d8` (each `git merge-base --is-ancestor <recorded SHA> origin/main` exited 0). The PRs are MERGED; no feature-branch-only evidence is being used.

## Merged-main evidence

Verification checkout: detached `origin/main` at `a8cc6b01`.

- `node vitest.mjs run --run src/io.test.ts src/sources.test.ts src/store.test.ts` — PASS, 123/123 (IO 32, sources 6, store 85).
- `node --test packages/mcp-server/src/sources.test.mjs` — PASS, 32/32.
- `npm run typecheck -w @kanmer/core` — PASS, exit 0.
- `npm run build:core` — PASS, exit 0.
- `npm run build:server` — PASS, exit 0.
- `npm run test:scripts` — PASS, 89/89.
- `npm run plugin:build` — PASS; committed and freshly built plugin SHA-256 both `F52D9C5B3817B12432E211438913146908C32874BF74AC261839A21EE31EA58C`.
- `git diff --check` — PASS, exit 0.

## Boundaries

Live Windows handle contention, packaged-host behavior, hosted branch/protection state, and external DNS/network behavior are INCONCLUSIVE unless explicitly proved by the above deterministic rails. No assertion was weakened and no external proof is fabricated.

The merged source rail passed 32/32, including redirect-hop DNS validation, validated-address request binding, and bounded DNS resolution. Live DNS rebinding and external network proof remain INCONCLUSIVE.
