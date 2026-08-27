# Checklist — CORE-115

- [x] Worktree `.worktrees/core-115` on branch `core-115-workspace-leases` from origin/main 97dfc9f3; ticket taken with the recorded branch/worktree.
- [x] `types.ts`: `lease_*` optional fields, `leaseHeartbeatMinutes`/`leaseCommandMaxMinutes` (defaults 5/120), `leaseState()` with `claimState` wrapper, input/evidence type extensions; `frontmatter.ts` KEY_ORDER; core exports.
- [x] `store.ts`: lease lock (`.kanmer/leases.lock`) around take/renew/transfer/release with re-read inside the lock.
- [x] `takeTicket`: mints lease record; `LEASE_LIVE` for a foreign live lease; `WORKSPACE_OCCUPIED` for same worktree/branch on another taken ticket (force does not bypass).
- [x] `renewTicket`: requires `lease_id` + `lease_revision` when a lease is named (`LEASE_EXPIRED` / `Conflict:`), own-expired renew allowed, phase + bounded `running-command` extension, heartbeat stamp, legacy claim migrated on first renew. Deviation: a renew naming no lease keeps the CORE-121 owner check (compatibility lane for installed skills; existing tests unchanged).
- [x] `transferTicket`: recovery evidence recorded (dirty / committed-no-PR / missing worktree), refuses board/foreign workspace, old→new controller in `lease_reclaimed_from` and `## Transitions`, branch/worktree/commits untouched.
- [x] `releaseTicket` clears all lease fields (GUI release path).
- [x] Core `reconciliation.ts` claim block carries lease fields (optional on the type; core policy passes them through; MCP collector fills them and its test asserts them).
- [x] Core tests added (contention, renewal ids/revision with byte-identical file on refusal, expiry, migration, occupancy, six-store concurrent lock, recovery cases, v0.3.12 fixture unchanged); `npm test -w @kanmer/core` green (19 files, 411 tests).
- [x] MCP: `errors.ts` lease codes; `take_ticket` params (`lease_id`, `lease_revision`, `phase`, `extend_minutes`, `controller_run`, `worker_run`, `provider`) and evidence-gated transfer; `get_status.leases`; packet claim block; `reconciliation.ts` lease fields + `leaseRecoverySummary`; still 38 tools.
- [x] `smoke.mjs` lease checks added (287/287); shared-worktree fixtures needed no re-basing (they use distinct paths/aliases); `smoke:protocol` 50/50.
- [x] Docs/skills: tool-reference, kanmer-execute, kanmer-auto, AGENTS.md §4/§8 (gotcha 16), manual glossary (+ regenerated `chapters.generated.ts`).
- [x] Plugin bundle rebuilt (`plugin:build`) and `plugin:check` green (38 tools, bytes match) — run in the worktree with its own `npm ci` node_modules; bundle committed.
- [x] [pre-review] `npm run typecheck` 0 and `npm run verify` 1 (only `test:scripts` antigravity EBUSY host quirk; every later rail step run individually, exit 0); no assertion weakened.
- [x] [pre-review] Post-implementation report written; PR #293 opened with `Kanmer: CORE-115` footer (head 80cdb6e4); ticket moved to Review. Stop.

## Progress notes

- 2026-08-27 typecheck (all four workspaces) exit 0; core suite exit 0; smoke 287/287; protocol 50/50; reconciliation.test.mjs pass; verify:docs PASS after `build:manual`.
- 2026-08-27 PR https://github.com/collisionengineers/kanmer/pull/293 at 80cdb6e4; verify:skills green at that head.
