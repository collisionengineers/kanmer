# CORE-022 merged-main verification proof

## Merge target and reachability

- Verification checkout: `main`, merged HEAD `1b5ae0d4546d1b57be393b38f4813f9ecfb6e7d5`.
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
