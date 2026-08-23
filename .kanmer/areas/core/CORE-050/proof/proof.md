# Verification proof — CORE-050

Remediated transient quarantine ownership revalidation, replacement-lock overlap, cleanup errors, and persisted-token validation. PR #172 merged at `31e572dc54b311164444cd5ee1a6cba225d618f2`; recorded implementation `fc8e591e` is reachable from `origin/main`.

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

The IO rail covers the adversarial lock/retry and cleanup paths (32/32 PASS). Live Windows EBUSY/handle contention and hosted/package evidence remain INCONCLUSIVE.
