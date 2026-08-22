# CORE-022 merged-main verification proof

## Merge target and reachability

- Verification checkout: `main`, merged HEAD `af61144ce743f74b2aba92fb0778588b0b9bedd0`.
- The implementation commit `d0f927a3f9aab7fa6f4716410138126f3ff1fc35` is an ancestor of that HEAD (`git merge-base --is-ancestor` exit 0).
- Existing PR #28 is merged at `dfc2b059aaab7f6dbaac5085c9a2b475c538cd09`.

## Real merged-main checks

- `npm run test -w @kanmer/core -- src/io.test.ts src/migrate.test.ts` — PASS, 2 files / 28 tests. This includes transient EPERM/EBUSY/EACCES retry and bounded backoff, fail-fast non-transient errors, original-error propagation, temp cleanup, interrupted/resumed v2→v3 migration, per-ticket non-rewrite, idempotence, and stale-temp age handling.
- `npm run test -w @kanmer/core` — PASS, 12 files / 263 tests.
- `npm run typecheck -w @kanmer/core` — PASS, exit 0.
- `npm run build -w @kanmer/core` — PASS, ESM/browser/DTS build and browser check, exit 0.

## Evidence boundary

The planned real 242-ticket fixture (48 migrations, 194 untouched, 47 `todo` remaps, zero `needs-restage`, five stale temps swept, then a clean second no-op) is not present in this environment. No genuine Windows file-lock/antivirus contention was created. Those two plan checks remain **INCONCLUSIVE**, not PASS; the deterministic injected-seam and synthetic migration tests above are the available evidence.

The prior execution record remains preserved: the first headless smoke failed before build with ENOENT and passed after build; the root rail retained unrelated MCP HTTP timeout failures (2/61, then 1/61); and `plugin:check` refused the linked worktree because `@kanmer/core` resolved to the main checkout. These are not erased or reclassified by this merged-main verification.

## Disposition

Deterministic merged behavior passes. Keep CORE-022 in **Verifying** pending the two explicitly unavailable real-board/Windows checks; no Done move, branch/worktree release, or cleanup is authorized while that evidence is inconclusive.


## Independent merged-main rerun — 2026-08-22T00:08:04.176Z

The deterministic verification commands were rerun from the normal checkout on merged `main` at `af61144ce743f74b2aba92fb0778588b0b9bedd0`; `d0f927a3f9aab7fa6f4716410138126f3ff1fc35` remained reachable (merge-base exit 0).

- `npm run test -w @kanmer/core -- src/io.test.ts src/migrate.test.ts` — exit 0, 2 files / 28 tests.
- `npm run test -w @kanmer/core` — exit 0, 12 files / 263 tests.
- `npm run typecheck -w @kanmer/core` — exit 0.
- `npm run build -w @kanmer/core` — exit 0, ESM/DTS/browser build check.
- `git diff --check` — exit 0; no tracked source diff was present.

These reruns strengthen the deterministic merged-main evidence only. The planned 242-ticket fixture and genuine Windows handle/EPERM run remain INCONCLUSIVE and are not reclassified.


## Independent merged-main rerun — 2026-08-22T00:08:18.382Z

The deterministic verification commands were rerun from the normal checkout on merged `main` at `af61144ce743f74b2aba92fb0778588b0b9bedd0`; `d0f927a3f9aab7fa6f4716410138126f3ff1fc35` remained reachable (merge-base exit 0).

- `npm run test -w @kanmer/core -- src/io.test.ts src/migrate.test.ts` — exit 0, 2 files / 28 tests.
- `npm run test -w @kanmer/core` — exit 0, 12 files / 263 tests.
- `npm run typecheck -w @kanmer/core` — exit 0.
- `npm run build -w @kanmer/core` — exit 0, ESM/DTS/browser build check.
- `git diff --check` — exit 0; no tracked source diff was present.

These reruns strengthen the deterministic merged-main evidence only. The planned 242-ticket fixture and genuine Windows handle/EPERM run remain INCONCLUSIVE and are not reclassified.
