# Post-implementation report — CORE-115

Branch `core-115-workspace-leases`, worktree `.worktrees/core-115`, base origin/main 97dfc9f3. Commits: 692d0d93 (implementation), 2f7334b6 and 80cdb6e4 (skill wording for the SKILL-037 prose check). Head 80cdb6e4.

## What changed and why

| File | Change |
| --- | --- |
| `packages/core/src/types.ts` | `lease_*` optional frontmatter fields; `leaseHeartbeatMinutes` / `leaseCommandMaxMinutes`; `LEASE_PHASES`, `LeaseConfig`/`leaseConfig()`, `LeaseState`/`leaseState()` (single expiry rule; `claimState()` is a wrapper), `isLegacyLease()`, `RenewTicketInput`, `LeaseRecoveryEvidence`, run/provider fields on take/transfer inputs; optional lease fields on `ReconciliationEvidence.claim`. |
| `packages/core/src/frontmatter.ts` | `KEY_ORDER` lease keys after `remediation_budget`. |
| `packages/core/src/store.ts` | `withLeaseLock` (`.kanmer/leases.lock`), `workspaceKey`, `assertWorkspaceFree`; `takeTicket` (LEASE_LIVE, WORKSPACE_OCCUPIED, lease minting), `renewTicket` (lease id/revision checks, phase, bounded extension, legacy migration; `(id, actor, opts)` overload retained), `transferTicket` (recovery evidence recorded, RECOVERY_REFUSED, new lease id, `lease_reclaimed_from`), `releaseTicket` (clears lease). The unused `claimWindowMinutes` helper was removed. |
| `packages/core/src/claims.test.ts` | New `leaseState / leaseConfig` and `renewable leases (CORE-115)` suites: record minting and key order, AC1 contention, workspace occupancy (incl. force and expired-unreleased), AC2 renewal id/revision with byte-identical file on refusal, own-expired renew, running-command bound, legacy migration (renew and transfer), AC3 recovery cases (dirty / committed-no-PR / missing worktree), RECOVERY_REFUSED, six-store concurrent renewal under the lock. Existing tests untouched. |
| `packages/mcp-server/src/errors.ts` | `LEASE_EXPIRED` and `LEASE_CONFLICT` codes classified from the store's stable prefixes. |
| `packages/mcp-server/src/index.ts` | `take_ticket`: lease params, evidence-gated transfer, rewritten description; `get_status.leases`. No new tool (38). |
| `packages/mcp-server/src/execution-packet.ts` | `claim` block gains lease id/revision/phase/workspace/heartbeat, `legacy`, and the three timing values. |
| `packages/mcp-server/src/reconciliation.ts` | Claim evidence uses `leaseState`; `leaseRecoverySummary()` exported. |
| `packages/mcp-server/src/reconciliation.test.mjs` | Claim-block deepEqual extended with the lease fields (strictly more asserted); new legacy/`leaseRecoverySummary`/reclaim test. |
| `packages/mcp-server/src/smoke.mjs` | Nine new checks (lease minting, `get_status.leases`, packet claim block, WORKSPACE_OCCUPIED, LEASE_LIVE, LEASE_EXPIRED/REVISION_CONFLICT with zero writes, running-command bound, phase return, transfer evidence). 287/287. |
| `plugins/kanmer/skills/…/tool-reference.md`, `kanmer-execute/SKILL.md`, `kanmer-auto/SKILL.md` | Lease contract for agents (renew with `lease_id`/`lease_revision`, heartbeat cadence, running-command phase, LEASE_EXPIRED is a stop). |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Rebuilt bundle (`plugin:build`; `plugin:check` green). |
| `AGENTS.md`, `docs/manual/glossary.md`, `apps/gui/src/renderer/src/manual/chapters.generated.ts` | §4 field example, §8 gotcha 16, glossary "Lease" entry and the regenerated manual it feeds. |

## Governing docs

- **FRD-030** — Meets: lease record with lease/controller-run/worker-run/workspace ids, assignee/provider, branch/worktree, phase, claimed/heartbeat/expiry, revision; explicit testable 5/30-minute timing; one live writer per workspace; atomic revision-safe acquisition/renewal (`LEASE_EXPIRED` / `REVISION_CONFLICT`); reclaim re-reads board/branch/worktree/PR evidence, preserves dirty work, records old/new controller, never deletes; one migration path for legacy claims; running-command state; final claim remains until closeout (expired lease still owns its workspace; only `release` clears it). AC4/AC5 (batch) → [[CORE-124]], blocked by this ticket; FRD unchanged.
- **FRD-034** — Meets: controller/worker run identity on the lease; heartbeat cadence explicit for the durable run.
- **FRD-029 / CORE-114 F-009** — Meets: `expected_revision` honoured on every action; lease writes are now under a cross-process lock.
- **FRD-016** — Meets: `force` semantics unchanged (and never bypasses the workspace rule); worktree guard unchanged.

## Deviations from the plan

1. **Renew compatibility lane.** The plan made `lease_id` mandatory on every renew of a leased ticket. Existing tests (`claims.test.ts` "renews only the owner's claim", `project.test.ts` F-004) and the installed v0.3.12 skills renew with only an actor; making the id mandatory would have required weakening those tests. A renew that names a lease is checked strictly (AC2); a renew that names none applies the CORE-121 owner check and still bumps the lease revision. Recorded in open-questions (parked item) and AGENTS.md gotcha 16.
2. **No extra activity entries or take-time transition.** `store.test.ts` asserts the exact activity `op` sequence for take/release; lease minting is visible in frontmatter and the reclaim/migration/phase transitions are still appended to `scratch/execution.md`.
3. **`apps/gui/src/renderer/src/manual/chapters.generated.ts`** changed: it is the generated manual mirror (`build:manual`) that `verify:docs` requires after the glossary edit; no hand-written GUI code was touched.
4. **Plugin bundle built in the worktree**, not the main checkout: the worktree has its own `npm ci` node_modules, so tsup bundled this branch's core and `plugin:check` accepted it (38 tools, bytes match). The main checkout carries unrelated uncommitted changes to AGENTS.md, so switching it to this branch was not safe.
5. Smoke fixtures that take two tickets on shared paths needed no re-basing: they use distinct paths/junction aliases, which the store's normalised comparison does not collapse (physical aliasing stays the packet's job).

## Commands and exit codes (cwd `.worktrees/core-115`, head 80cdb6e4 unless noted)

| Command | Exit |
| --- | --- |
| `npm ci` | 0 |
| `npm run typecheck` (core, mcp-server, ui, gui) | 0 |
| `npm test -w @kanmer/core` | 0 (19 files, 411 tests) |
| `npm run build` | 0 |
| `node packages/mcp-server/src/smoke.mjs` | 0 (287/287) |
| `npm run smoke:protocol` | 0 (50/50) |
| `node --test packages/mcp-server/src/reconciliation.test.mjs` | 0 |
| `npm run build:manual` then `npm run verify:docs` | 0 / 0 |
| `npm run plugin:build` / `npm run plugin:check` | 0 / 0 |
| `npm run verify` (at 692d0d93) | 1 — `npm test` → `test:scripts`: the two antigravity launcher tests fail with the known host `EBUSY` quirk (`kanmer-agy-*\Kanmer\bin` rmdir); core 411 and GUI 493 tests passed in that run. Recorded, not chased. |
| `npm run test:scripts` (alone) | 1 — same two EBUSY tests; 67 others pass |
| `npm run smoke:headless` / `mcpb:check` / `smoke:discovery` / `verify:agents-block` | 0 each |
| `npm run verify:skills` | 1 at 692d0d93 (wording regex), 0 at 80cdb6e4 |

## Risks and follow-ups

- The compatibility lane means a foreign controller that guesses the assignee name could still renew a leased ticket without the lease id; closing it requires the installed skills to send `lease_id`/`lease_revision` first (parked question).
- `WORKSPACE_OCCUPIED` compares normalised paths, not physical aliases; the packet's physical checks remain the alias guard.
- Batch mode ([[CORE-124]]) will need the workspace rule's "same frozen batch" exception; the lock and `assertWorkspaceFree` are the extension points.
- Mutating reconciliation (HZN-008 order 6) can now consume `leaseState`, `transfer` with evidence and `RECOVERY_REFUSED`.

## For kanmer-verify (on the merged SHA)

- `npm test -w @kanmer/core` (lease suites in `claims.test.ts`), `node packages/mcp-server/src/smoke.mjs` (lease checks), `node --test packages/mcp-server/src/reconciliation.test.mjs`, `npm run plugin:check` from a normal checkout, `npm run verify:docs`.
- Confirm a v0.3.12 server still lists a ticket carrying `lease_*` fields (passthrough): the live board is served by 0.3.12 and this ticket's own frontmatter will carry them once a candidate server takes it.
