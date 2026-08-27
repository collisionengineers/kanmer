# Plan — CORE-115: Replace permanent claims with renewable workspace leases

## Objective

Turn the CORE-121 bootstrap claim into the FRD-030 lease: a full additive lease record on the ticket, explicit heartbeat/expiry configuration, atomic revision-safe acquisition/renewal under a cross-process lock, one live writer per workspace, evidence-backed reclaim that preserves dirty work, and one lazy migration path for legacy claims — with the tool roster fixed at 38 and every board write readable by v0.3.12. Batch mode is [[CORE-124]].

## Starting state

- `packages/core/src/types.ts:431-447` claim fields; `claimState()` `:627` with legacy expiry derivation; `claimExpiryMinutes` `:383`; `ItemFrontmatterSchema` is passthrough.
- `packages/core/src/store.ts` `takeTicket :1087`, `releaseTicket :1145`, `transferTicket :1171`, `renewTicket :1224` — read/CAS/write with no cross-process lock (CORE-114 F-009); `withExclusiveFileLock` in `io.ts:452` used by `setBoard`.
- `packages/mcp-server/src/index.ts:1405-1453` `take_ticket` (actions take/release/transfer/renew); `execution-packet.ts:66-72, 500-535` claim block and occupancy refusal; `reconciliation.ts:213-320` evidence collector; `errors.ts` classifies `Conflict:` → `REVISION_CONFLICT`.
- `smoke.mjs:62` asserts 38 tools; `:2145, :2328, :2368, :2400` take second tickets on shared worktrees to set up packet refusals.
- Research, files and open-questions are written; decisions there are binding for this plan.

## Governing docs

- **FRD-030** — **Meets**: lease record fields (lease/project via board identity/controller-run/worker-run/workspace ids, assignee/provider, branch/worktree, phase, claimed/heartbeat/expiry, revision); heartbeat 5 min / expiry 30 min as board config; one live writer per workspace (`WORKSPACE_OCCUPIED`); atomic revision-safe acquire/renew (`LEASE_LIVE`, `LEASE_EXPIRED`, `REVISION_CONFLICT`) under a lock; reclaim re-reads board/branch/worktree/PR evidence, preserves dirty work, records old/new controller, never deletes; one migration path (`leaseState`); running-command state; final claim remains until closeout. AC4/AC5 (batch) deferred to CORE-124 by recorded scope decision — the FRD is not modified.
- **FRD-034** — **Meets**: controller acquires leases with run identity; worker renewal cadence is explicit for the durable run (SKILL-036 consumer).
- **FRD-029 / CORE-114** — **Meets**: `expected_revision` stays honoured on every action; the new lock closes F-009 for lease writes.
- **FRD-016** — **Meets**: `force` semantics unchanged and surfaced; worktree guard unchanged.
- No ADR needed: no new subsystem, storage or stage; decisions are recorded in open-questions.

## Required changes

1. **Types (`types.ts`)**: optional frontmatter `lease_id`, `lease_revision` (int ≥1), `lease_controller_run`, `lease_worker_run`, `lease_workspace`, `lease_provider`, `lease_phase` (`implementing|running-command|review|verifying|closeout`), `lease_heartbeat_at` (Timestamp), `lease_reclaimed_from`. Board `leaseHeartbeatMinutes` (default 5), `leaseCommandMaxMinutes` (default 120) with exported defaults. `LeaseState = { state: unclaimed|live|expired; legacy: boolean; expiresAt: string|null; heartbeatStale: boolean }` via `leaseState(item, now, config)`; `claimState` becomes a wrapper returning `.state`. `TakeTicketInput` gains `controllerRun?`, `workerRun?`, `provider?`, `phase?`; `RenewTicketInput { actor, leaseId?, leaseRevision?, phase?, extendMinutes?, expectedRevision? }`; `TransferTicketInput` gains `controllerRun?`, `workerRun?`, `provider?`, `recovery?: LeaseRecoveryEvidence` (`{ workspace: state|claimIdentity, pullRequest: state, commits: number, proof: state, boardWorktree: boolean }`). `ReconciliationEvidence.claim` gains `leaseId`, `leaseRevision`, `heartbeatAt`, `phase`, `legacy`.
2. **Frontmatter**: `KEY_ORDER` adds the lease keys after `remediation_budget` in the order above.
3. **Store**: private `withLeaseLock(fn)` = `withExclusiveFileLock(path.join(paths.kanmer, "leases.lock"))`; every lease verb re-reads the item inside the lock before `assertRevision`.
   - `takeTicket`: inside lock; existing board-worktree guard and `force` rule; new `WORKSPACE_OCCUPIED` when another non-archived taken ticket records the same normalised worktree (`normalizeWorktreePath` against `repoRoot`) or the same branch — applies with or without `force`; mints `lease_id` (crypto.randomUUID), `lease_revision: 1`, `lease_workspace`, `lease_phase` (input or `implementing`), `lease_heartbeat_at = taken_at`, run/provider ids when given; deletes `lease_reclaimed_from`.
   - `renewTicket(id, input)`: inside lock; `CLAIM_NOT_TAKEN` as today; if item has `lease_id`: `leaseId` required else `LEASE_ID_REQUIRED`; mismatch → `LEASE_EXPIRED: … lease <id> is no longer current (current lease <cur>, controller <c>)`; `leaseRevision` required and must equal → else `Conflict: "<id>" lease revision changed …` (classified `REVISION_CONFLICT`); a lease past expiry but still recorded renews (expiry is not deletion). Legacy lease (no `lease_id`): owner check as today, then mint the full record (migration). Phase update; `extendMinutes` only with phase `running-command`, clamped to `leaseCommandMaxMinutes`, else `claimExpiryMinutes`; sets `lease_heartbeat_at`, bumps `lease_revision`, activity + transition line when phase changes.
   - `transferTicket`: inside lock; refuses `CLAIM_LIVE` as today; refuses `RECOVERY_REFUSED` when `recovery.boardWorktree` or `recovery.workspace.claimIdentity === "foreign-repository"`; on success keeps branch/worktree/taken_at, sets `lease_reclaimed_from = previous controller`, new `lease_id`, `lease_revision + 1`, run/provider ids, heartbeat, and appends a transition line carrying the recovery summary (`workspace dirty|clean|missing|not-recorded|unavailable; pr open|absent|…; commits N`). Never touches `commits`/`prs`/docs.
   - `releaseTicket`: also clears every `lease_*` field.
   - Legacy migration: `leaseState` is the only expiry rule; export `isLegacyLease(item)`.
4. **Core reconciliation**: claim block populated with lease fields; `EVIDENCE_INCONCLUSIVE`/findings unchanged.
5. **MCP `take_ticket`** (`index.ts`): new optional params `lease_id`, `lease_revision`, `phase`, `extend_minutes`, `controller_run`, `worker_run`, `provider`; `renew` passes them; `transfer` first calls `collectReconciliationEvidence(store, id)` and passes `leaseRecoverySummary(evidence)`; description rewritten for lease semantics. `errors.ts`: classify `LEASE_EXPIRED:` and `WORKSPACE_OCCUPIED:`/`LEASE_LIVE:` prefixes into new `KanmerErrorCode`s (`LEASE_EXPIRED`, `LEASE_CONFLICT`). `get_status` reports `leases: { heartbeatMinutes, expiryMinutes, commandMaxMinutes }`.
6. **Packet**: `ExecutionPacketClaim` gains `leaseId`, `leaseRevision`, `phase`, `workspace`, `heartbeatMinutes`, `expiryMinutes`, `legacy`; occupancy logic unchanged.
7. **MCP reconciliation**: `collectReconciliationEvidence` fills lease fields; export `leaseRecoverySummary`.
8. **Tests**: core `claims.test.ts` (new describe "renewable leases (CORE-115)"): take mints record; second controller take → `LEASE_LIVE`; other ticket same worktree/branch → `WORKSPACE_OCCUPIED` (also with force); renew requires lease id, stale id → `LEASE_EXPIRED`, stale revision → `Conflict:` with file byte-identical; own expired lease renews; running-command extension clamped; legacy claim renew migrates and keeps derived expiry; transfer refuses foreign/board evidence, records dirty/missing/committed-no-PR summaries and old→new controller without touching branch/worktree/commits; release clears lease fields (GUI path); two `KanmerStore` instances renewing concurrently from the same revision → exactly one success (lock); v0.3.12 fixture unchanged. `reconciliation.test.ts` claim lease fields. MCP `reconciliation.test.mjs` `leaseRecoverySummary`; `smoke.mjs` lease checks and re-based shared-worktree setups (take the second ticket in a separate worktree/branch where the packet test needs a *taken* sibling, or assert `WORKSPACE_OCCUPIED` where the point was duplicate workspaces).
9. **Docs/skills**: `tool-reference.md` row + field semantics; `kanmer-execute` and `kanmer-auto` renew with `lease_id`/`lease_revision` from the packet at the heartbeat cadence; AGENTS.md §4 fields + §8 gotcha 16 (lease lock, lazy migration, `transfer` is reclaim); `docs/manual/glossary.md` lease entry. Rebuild plugin bundle from the main checkout.

## Expected files

| Action | Path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/types.ts` | schema, config, `leaseState`, inputs |
| Modify | `packages/core/src/frontmatter.ts` | key order |
| Modify | `packages/core/src/store.ts` | lease verbs under lock, occupancy, migration, recovery record |
| Modify | `packages/core/src/index.ts` | exports |
| Modify | `packages/core/src/reconciliation.ts` | lease fields in claim block |
| Modify | `packages/core/src/claims.test.ts`, `reconciliation.test.ts`, `store.test.ts` (if needed) | tests |
| Modify | `packages/mcp-server/src/index.ts`, `errors.ts`, `execution-packet.ts`, `reconciliation.ts` | tool params, evidence-gated transfer, packet/status |
| Modify | `packages/mcp-server/src/smoke.mjs`, `reconciliation.test.mjs` | MCP proof |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`, `kanmer-execute/SKILL.md`, `kanmer-auto/SKILL.md` | contract text |
| Modify (generated) | `plugins/kanmer/mcp/kanmer-mcp.cjs` and setup runtime via `npm run plugin:build` | committed artefact, built at repo root |
| Modify | `AGENTS.md`, `docs/manual/glossary.md` | docs |

## Do not modify

- `packages/mcp-server/src/http*.ts`, registry/endpoint files (MCP-054 lane) — stop and report if touched.
- `.worktrees/kanmer`, `.kanmer` contents by hand; `apps/gui/**`; board format/`migrate.ts`; `FRD-030`; existing test assertions (extend, never weaken); the 38-tool roster and the `take_ticket` action enum.

## Constraints

- Additive optional fields only; the live board is served by v0.3.12 (passthrough keeps them). No format bump.
- `Conflict:` prefix wording is matched by smoke and `errors.ts`; CORE-121 error prefixes stay.
- Core stays git-free; evidence is collected at the MCP boundary with bounded subprocesses.
- Lock file lives under `.kanmer/` (gitignored on the board branch); use the existing `withExclusiveFileLock` only.
- `expected_project` on every board write from this lane; `MSYS_NO_PATHCONV=1` for `git show ref:path`.
- Known host quirks are recorded, not chased; hosted verify is authoritative.

## Ordered steps

1. Worktree `.worktrees/core-115`, branch `core-115-workspace-leases` from `origin/main` (97dfc9f3); `take_ticket` with lease.
2. `types.ts` + `frontmatter.ts` + `index.ts` exports (change 1–2); typecheck core.
3. `store.ts` lease lock + `takeTicket` occupancy/minting (3); tests for take/occupancy/lock.
4. `renewTicket` semantics + legacy migration (3); tests.
5. `transferTicket` recovery + `releaseTicket` clearing (3); tests.
6. Core `reconciliation.ts` claim fields + test (4).
7. MCP `errors.ts`, `index.ts` `take_ticket`/`get_status`, `execution-packet.ts`, `reconciliation.ts` (5–7); `reconciliation.test.mjs`.
8. `smoke.mjs` additions and shared-worktree setup re-basing (8); run smoke + protocol smoke.
9. Docs and skills (9).
10. From the main checkout on the branch state: `npm run build && npm run plugin:build && npm run plugin:check`; commit bundle.
11. Full rail `npm run verify` (record exit codes; known quirks noted); post-implementation report; PR with `Kanmer: CORE-115` footer; move to Review.

## Acceptance checks

- Production callers: `take_ticket` handler (`index.ts`) → `store.takeTicket/renewTicket/transferTicket/releaseTicket`; GUI `CH.releaseTicket` → `store.releaseTicket`; packet `claim` block; `reconcile_ticket` evidence.
- FRD-030 AC1: test "a live competing controller cannot acquire or renew" (`LEASE_LIVE` on take, `LEASE_EXPIRED` on renew with foreign/non-current id) + concurrent-lock test.
- AC2: stale id → `LEASE_EXPIRED`, stale lease revision → `REVISION_CONFLICT`, file bytes unchanged in both.
- AC3: transfer recovery tests for dirty worktree, committed-no-PR, missing worktree; branch/worktree/commits preserved; old→new controller recorded.
- Edge: running-command extension bounded; expired lease still present until release (final claim remains).
- Migration: legacy fixture behaves as before; first renew/transfer writes the lease record.
- Artefact: plugin bundle bytes match (`plugin:check`), 38 tools.
- Commands retained with exit codes in the post-implementation report.

## Commands

- `npm run typecheck` (root)
- `npm test -w @kanmer/core`
- `npm run build` then `node packages/mcp-server/src/smoke.mjs` and `npm run smoke:protocol`
- `node --test packages/mcp-server/src/reconciliation.test.mjs`
- Main checkout: `npm run build && npm run plugin:build && npm run plugin:check`
- `npm run verify` (authoritative; foreground, 600000 ms timeout, log to a unique file)

## Failure and deviation rules

Stop and report on: any needed change to http/registry files; a test that can only pass by weakening an assertion; a required new tool; a format bump; `verify` failures not attributable to the recorded host quirks; a governing-doc conflict. Deviations are recorded in the post-implementation report, never silently redesigned.

## Stop condition

PR open against `main` with a `Kanmer: CORE-115` footer, ticket in Review with the post-implementation report written. No review, merge, verify, closeout or release.
