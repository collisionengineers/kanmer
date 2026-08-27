# Checklist — CORE-115

- [ ] Worktree `.worktrees/core-115` on branch `core-115-workspace-leases` from origin/main 97dfc9f3; ticket taken with the recorded branch/worktree.
- [ ] `types.ts`: `lease_*` optional fields, `leaseHeartbeatMinutes`/`leaseCommandMaxMinutes` (defaults 5/120), `leaseState()` with `claimState` wrapper, input/evidence type extensions; `frontmatter.ts` KEY_ORDER; core exports.
- [ ] `store.ts`: lease lock (`.kanmer/leases.lock`) around take/renew/transfer/release with re-read inside the lock.
- [ ] `takeTicket`: mints lease record; `LEASE_LIVE` for a foreign live lease; `WORKSPACE_OCCUPIED` for same worktree/branch on another taken ticket (force does not bypass).
- [ ] `renewTicket`: requires `lease_id` + `lease_revision` on leased tickets (`LEASE_EXPIRED` / `Conflict:`), own-expired renew allowed, phase + bounded `running-command` extension, heartbeat stamp, legacy claim migrated on first renew.
- [ ] `transferTicket`: recovery evidence recorded (dirty / committed-no-PR / missing worktree), refuses board/foreign workspace, old→new controller in `lease_reclaimed_from` and `## Transitions`, branch/worktree/commits untouched.
- [ ] `releaseTicket` clears all lease fields (GUI release path).
- [ ] Core `reconciliation.ts` claim block carries lease fields; test updated.
- [ ] Core tests added (contention, renewal ids/revision with byte-identical file on refusal, expiry, migration, occupancy, two-store concurrent lock, recovery cases, v0.3.12 fixture unchanged); `npm test -w @kanmer/core` green.
- [ ] MCP: `errors.ts` lease codes; `take_ticket` params (`lease_id`, `lease_revision`, `phase`, `extend_minutes`, `controller_run`, `worker_run`, `provider`) and evidence-gated transfer; `get_status` lease cadence; packet claim block; `reconciliation.ts` lease fields + `leaseRecoverySummary`; still 38 tools.
- [ ] `smoke.mjs` lease checks added and shared-worktree fixtures re-based; `smoke.mjs` and `smoke:protocol` green.
- [ ] Docs/skills: tool-reference, kanmer-execute, kanmer-auto, AGENTS.md §4/§8, manual glossary.
- [ ] Plugin bundle rebuilt from the main checkout; `plugin:check` green; bundle committed.
- [ ] [pre-review] `npm run typecheck` and `npm run verify` run with exit codes recorded (host quirks noted, not chased); no assertion weakened.
- [ ] [pre-review] Post-implementation report written; PR opened with `Kanmer: CORE-115` footer; ticket moved to Review. Stop.

## Progress notes
