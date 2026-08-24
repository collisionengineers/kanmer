# Checklist

## Core — the retry
- [x] `renameWithRetry` retries only `EPERM` / `EBUSY` / `EACCES`
- [x] backoff `10, 25, 60, 150, 300` ms
- [x] non-transient codes throw on the first attempt
- [x] temp removed in a `finally`, success or failure
- [x] success path is still a single `rename` — no added cost
- [x] rename injectable for tests, documented as a test seam

## Core — convergence
- [x] `migrateToV3` skips the rewrite when the ticket already has a profile and no priority
- [x] doc-move loops untouched
- [x] `resumed` on `V3Report`, plus a note
- [x] `writeVersion` stays last

## Core — hygiene
- [x] stale `.tmp-*` swept, older than 60 s only
- [x] swept count in the report
- [x] `ensureIgnore` covers the temp pattern

## GUI
- [x] `CH.migrate` stops the watcher and sync timer
- [x] both restored in a `finally`, including on throw
- [x] restored watcher is stored back on the context

## Tests
- [x] injected EPERM clearing on the third attempt
- [x] non-transient code fails fast
- [x] no temp left after permanent failure
- [x] re-run rewrites zero tickets; `resumed` true
- [x] real-board fixture: current-main fixture passed — 48 migrated, 194 byte-untouched, 47 remapped, 0 needs-restage, 5 stale temps swept, version 3.
- [x] second fixture run is a clean `alreadyV3` no-op — current-main fixture passed with zero changed ticket files.

## Docs and rail
- [x] FRD-007 M4 corrected
- [x] `npm test`, both smokes, typecheck, GUI build, boot smoke — fresh GitHub-origin current-main `npm run verify` passed: Core 310, GUI 468, MCP HTTP 102, scripts 98, typecheck/build/smokes/headless all green.
- [x] `plugin:build` + `plugin:check` — passed in the fresh GitHub-origin current-main verification clone.

## Progress notes

- 2026-08-21 — Historical implementation commit d0f927a3f9aab7fa6f4716410138126f3ff1fc35 is reachable from origin/main 52073fc6. It contains the scoped core retry/resume/temp hygiene, GUI watcher/sync pause, FRD-007 correction, tests, and plugin artifact; the fresh CORE-022 branch has no source diff.
- 2026-08-21 — Fresh branch/worktree core-022-migration-eperm/.worktrees/core-022 was taken without force for merged-main reconciliation. Existing PR #28 is already merged at dfc2b059aaab7f6dbaac5085c9a2b475c538cd09; no duplicate PR was created.
- 2026-08-21 — Focused IO/migration tests passed 28/28; full core passed 257/257. All-workspace typecheck, core/server build, GUI build, protocol smoke 42/42, discovery smoke 13/13, headless smoke after build, scripts 79/79, and diff-check passed.
- 2026-08-21 — First headless smoke exited 1 before the server build: ENOENT for packages/mcp-server/dist/standalone/kanmer-mcp.cjs at smoke-headless.mjs:19. After npm run build, the rerun exited 0 with all six checks passing.
- 2026-08-21 — Root npm test exited 1 after core 263/263 and GUI 349/349: MCP HTTP test-http failed 2/61 (project-resolution spawnSync node ETIMEDOUT; readiness TUNNEL_READINESS_TIMEOUT). A separate rerun failed 1/61 with the project-resolution spawnSync ETIMEDOUT persisting while readiness passed. npm run test:scripts passed 79/79 separately. These unrelated failures remain preserved and are not attributed to CORE-022.
- 2026-08-21 — npm run plugin:check exited 1 with the linked-worktree guard: @kanmer/core resolved to C:\Users\Alex\Documents\GitHub\kanmer\packages\core\dist\index.js instead of this worktree. plugin:build passed but produced a linked-worktree-relative generated artifact; that generated-only delta was restored, leaving no source diff.
- 2026-08-21 — No real Windows file-lock/EPERM run or real 242-ticket board fixture was available in this lane. Existing proof remains historical evidence only; no new Windows or fixture claim is made.
- 2026-08-22T00:09:07.715Z — Independent merged-main rerun at af61144ce743f74b2aba92fb0778588b0b9bedd0: focused IO/migration 28/28, full core 263/263, core typecheck, core build, and diff-check all exited 0. The two fixture/Windows boxes remain unchecked and INCONCLUSIVE; no Done move is claimed.

- 2026-08-22 — Exact origin/main at b6c8eb02a82d8180b965094c4956109d4646e60b rerun in a detached verification worktree: focused IO/migration 28/28, full core 269/269 (13 files), core typecheck, core build, and diff-check all exited 0; implementation d0f927a3f9aab7fa6f4716410138126f3ff1fc35 reachable. The real 242-ticket fixture and genuine Windows lock/EPERM run remain INCONCLUSIVE; the two checklist boxes stay unchecked and no Done move is claimed.
