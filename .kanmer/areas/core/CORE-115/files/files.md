# Files — CORE-115

## Files the change touches

| File | Change | Risk |
| --- | --- | --- |
| `packages/core/src/types.ts` | `lease_*` optional frontmatter fields; `leaseHeartbeatMinutes` / `leaseCommandMaxMinutes` on `BoardConfigSchema`; `LeaseState`, `leaseState()` (with `claimState` kept as alias), `TakeTicketInput`/`TransferTicketInput`/`RenewTicketInput` extensions, `LeaseRecoveryEvidence`; `ReconciliationEvidence.claim` lease fields | Medium — schema is passthrough so additive fields are safe; every field must stay optional |
| `packages/core/src/frontmatter.ts` | `KEY_ORDER` entries for the lease fields after `remediation_budget` | Low |
| `packages/core/src/store.ts` | lease lock wrapper; `takeTicket` occupancy + lease minting; `renewTicket` id/revision checks, phase, bounded extension; `transferTicket` evidence recording; `releaseTicket` clears lease fields; helpers for workspace normalisation and sibling scan | High — the writes are the contract; keep `Conflict:` wording and CORE-121 error prefixes |
| `packages/core/src/index.ts` | export new types/functions | Low |
| `packages/core/src/claims.test.ts` | lease contract tests: contention, renew ids/revision, expiry, own-expired renew, legacy migration, workspace occupancy, cross-process lock (two stores), recovery evidence recording, v0.3.12 fixture unchanged | Medium |
| `packages/core/src/store.test.ts` | keep "takes and releases" green (force semantics unchanged) | Low |
| `packages/core/src/reconciliation.ts` (+ test) | claim block reads lease fields when present | Low |
| `packages/mcp-server/src/index.ts` | `take_ticket` schema params (`lease_id`, `lease_revision`, `phase`, `extend_minutes`, `controller_run`, `worker_run`, `provider`); transfer collects evidence via `collectReconciliationEvidence` before the store call; description text; `get_status` reports lease cadence | Medium — no new tool; keep 38 |
| `packages/mcp-server/src/execution-packet.ts` | `ExecutionPacketClaim` gains `leaseId`, `leaseRevision`, `phase`, `workspace`, `heartbeatMinutes`, `expiryMinutes` | Low |
| `packages/mcp-server/src/reconciliation.ts` (+ `reconciliation.test.mjs`) | claim evidence carries lease ids; export a `leaseRecoverySummary(evidence)` used by transfer | Low |
| `packages/mcp-server/src/smoke.mjs` | MCP checks: lease fields on take, renew with stale id → `LEASE_EXPIRED`, stale lease revision → `REVISION_CONFLICT`, workspace occupancy refusal, transfer records recovery | Medium — existing setups that take two tickets on one worktree (`:2145`, `:2328`, `:2368`, `:2400`) must be re-checked against the new occupancy rule |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `take_ticket` row and field semantics | Low |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md`, `kanmer-auto/SKILL.md` | renew with lease id/revision from the packet; heartbeat cadence | Low — text only |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` (+ setup runtime) | rebuilt bundle via `npm run plugin:build` from the main checkout | Medium — must be built at repo root (AGENTS.md §8 gotcha 8) |
| `AGENTS.md` | §4 field list, §8 gotcha for the lease lock and legacy migration, tool description in §5 if present | Low |
| `docs/manual/` (glossary/stages or sync) | brief lease mention where claims are described | Low |

## Ripple effects

- Callers of `claimState`: `execution-packet.ts:503`, `mcp-server/reconciliation.ts`, `claims.test.ts` — keep signature, add `leaseState`.
- `releaseTicket` is also the GUI path (`apps/gui/src/main/index.ts:1178`); clearing lease fields there is what keeps a GUI release complete. No GUI code change.
- Smoke fixtures that deliberately take two tickets on one worktree to exercise packet refusals will now be refused at take time; those checks must move to a setup that still yields the packet refusal (e.g. take with a different branch but the same worktree only when the store rule allows, or assert the new `WORKSPACE_OCCUPIED` instead).
- `plugin:check` compares bundle bytes; core changes require `npm run build && npm run plugin:build` before commit.
- `docs/contributing/doc-structure.md` mirror / `verify:docs` only if `/docs` changes.

## Out of scope (deliberately)

- Batch mode (frozen membership, shared PR/attestation, cleanup-waits-for-all) — split to its own ticket, blocked by this one.
- Mutating reconciliation (`apply_reconciliation`) — HZN-008 order 6, after this ticket.
- GUI display of lease state — after GUI-144.
- Any change to `packages/mcp-server/src/http*.ts` or the endpoint registry (MCP-054 lane).
- Board format bump or `migrate_board` step — not needed (additive fields).

## Context files (read before implementing)

| File | What it tells you |
| --- | --- |
| `docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md` | The contract, acceptance and edge cases |
| `.kanmer` HZN-008 `context.md` | One writer per workspace, no silent deletion, v0.3.12 stays live, interim ownership rule |
| `packages/core/src/store.ts:1087-1247` | The four claim verbs to extend; `Conflict:` wording is matched by smoke and `errors.ts` |
| `packages/core/src/io.ts:452` | `withExclusiveFileLock` semantics (stale recovery, retry bounds) |
| `packages/core/src/types.ts:620-653` | `claimState` legacy expiry derivation — the migration rule to preserve |
| `packages/mcp-server/src/reconciliation.ts:213-310` | Evidence collector to reuse for reclaim; injected `run` for tests |
| `packages/mcp-server/src/execution-packet.ts:254-362, 490-535` | Existing workspace safety and occupancy refusals — do not duplicate their git checks in core |
| `packages/mcp-server/src/errors.ts` | How `Conflict:` becomes `REVISION_CONFLICT`; add `LEASE_EXPIRED` classification |
| `packages/core/src/claims.test.ts` | Test conventions and the `ageClaim` helper |
| CORE-114 `scratch/review` F-009 | Why the lock is required |
| AGENTS.md §8 gotcha 8, §10 | Build the plugin bundle from the main checkout; verification checklist |
