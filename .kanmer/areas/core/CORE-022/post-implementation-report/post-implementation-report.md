# Post-implementation report

## Reconciliation outcome

CORE-022's scoped implementation is already merged on main in commit d0f927a3f9aab7fa6f4716410138126f3ff1fc35, reachable from current origin/main af61144ce743f74b2aba92fb0778588b0b9bedd0. PR #28 (Migration survives EPERM and resumes per ticket (CORE-022)) is merged at dfc2b059aaab7f6dbaac5085c9a2b475c538cd09. A fresh branch/worktree was created and taken for this audit, but it has no source diff because the implementation, tests, GUI changes, FRD correction, and bundled artifact are already present on merged main. No duplicate or empty PR was created.

The shipped implementation provides the planned scoped behavior: renameWithRetry retries only EPERM/EBUSY/EACCES with 10/25/60/150/300 ms backoff; writeFileAtomic removes temps in finally; v3 migration skips already-shaped tickets and reports resumed; stale temps older than 60 seconds are swept and counted; ensureIgnore covers the temp pattern; and CH.migrate pauses/restores watcher and sync timer in finally. FRD-007 M4 is corrected and M5 documents contention behavior.

## Verification with exact outcomes

- npm run test -w @kanmer/core -- src/io.test.ts src/migrate.test.ts — PASS, 28/28.
- npm run test -w @kanmer/core — PASS, 12 files / 263 tests (independent merged-main rerun at af61144ce743f74b2aba92fb0778588b0b9bedd0).
- npm run typecheck — PASS, all workspaces, exit 0.
- npm run build — PASS, core and MCP ESM/standalone builds, exit 0.
- npm run build -w @kanmer/gui — PASS, Electron main/preload/renderer builds, exit 0. Existing gray-matter eval warning was non-fatal.
- npm run smoke:headless — first run FAIL exit 1 because dist/standalone/kanmer-mcp.cjs was absent (ENOENT at smoke-headless.mjs:19); after npm run build, rerun PASS exit 0 with six checks.
- npm run smoke:protocol — PASS, 42/42.
- npm run smoke:discovery — PASS, 13/13.
- npm run test:scripts — PASS, 79/79.
- git diff --check — PASS, exit 0.
- npm test — FAIL exit 1 after core 257/257 and GUI 349/349; MCP HTTP failed 2/61: project-resolution child spawn ETIMEDOUT and readiness TUNNEL_READINESS_TIMEOUT.
- npm run test:http -w @kanmer/mcp-server — rerun FAIL exit 1 with 60/61; project-resolution child spawn ETIMEDOUT persisted, while readiness passed. These are unrelated MCP HTTP timing failures and are retained, not attributed to CORE-022.
- npm run plugin:build — PASS, exit 0. It generated a linked-worktree-relative artifact delta, which was restored because the source implementation is already merged.
- npm run plugin:check — FAIL exit 1 by design in this linked worktree: @kanmer/core resolved to the main checkout dist rather than this checkout. No package install workaround was applied.

## Evidence limits

The injected rename seam proves the EPERM/EBUSY/EACCES retry policy, bounded attempts, fail-fast non-transient behavior, original-error propagation, and temp cleanup. The current tests prove migration convergence on synthetic fixtures, including zero rewrites for already-shaped tickets and stale-temp age handling. No genuine Windows handle lock was created in this lane, and the historical 242-ticket fixture described in the existing proof was not available to rerun. Therefore the real-board/Windows checklist boxes remain explicitly open; no fabricated platform or dataset result is claimed.

The GUI pause/restore is covered by source inspection and all-workspace typecheck/build; there is no main-process harness that exercises CH.migrate's throw path. This limitation remains explicit.

## Traceability and next step

- Ticket: CORE-022
- Branch/worktree: core-022-migration-eperm / .worktrees/core-022
- Existing implementation: d0f927a3f9aab7fa6f4716410138126f3ff1fc35
- Existing merged PR: https://github.com/collisionengineers/kanmer/pull/28 (merge dfc2b059aaab7f6dbaac5085c9a2b475c538cd09)
- No new source commit or PR was created in this reconciliation lane because main already contains the implementation; creating an empty PR would fabricate work.
- Independent root review should inspect the merged implementation and decide whether the retained real-board/Windows evidence is sufficient for verification. Author lane stops at Review if advanced.

## Independent merged-main rerun — 2026-08-22T00:09:07.715Z

The verifier reran the scoped deterministic rail from `main` at `af61144ce743f74b2aba92fb0778588b0b9bedd0`, with the implementation `d0f927a3f9aab7fa6f4716410138126f3ff1fc35` reachable (merge-base exit 0): focused IO/migration 28/28 exit 0, full core 263/263 exit 0, core typecheck exit 0, core build exit 0, and git diff --check exit 0. The unavailable 242-ticket fixture and live Windows file-lock/EPERM run remain INCONCLUSIVE; no broader root-rail or platform claim is made.
