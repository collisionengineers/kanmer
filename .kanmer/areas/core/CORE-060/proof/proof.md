# Verification proof — CORE-060

Remediated automatic-sync pause and generated mismatch-state cleanup while preserving genuine errors and manual Retry. PR #197 merged at `f63d953fc8467440988c887c62a34ade0c77c96c`; child PRs #198 and #199 merged at `7b0238cf` and `f44b6fd8`. Recorded implementation SHAs are reachable from `origin/main`.

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

The merged GUI Git suite passed 48/48, including generated-state cleanup, genuine-error preservation, and automatic-sync safety predicates. The production-caller sync suite was environment-limited (3/11 PASS; 8/11 INCONCLUSIVE due Windows EPERM/timeouts). No unreachable-stack condition remains for the recorded CORE-060 commits on current `origin/main`; hosted branch-variable retargeting remains INCONCLUSIVE and operator-owned.
