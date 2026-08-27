# Files — CORE-121

## Where the change lands

| Path | Why | Risk |
| --- | --- | --- |
| `packages/core/src/types.ts` | Add optional `claim_expires_at`, `claim_controller`, `review_round`, `remediation_budget` to `ItemFrontmatterSchema`; extend `TakeTicketInput` with `action`-specific inputs (`reason`, `actor`); add `claimExpiryMinutes?` to the board config schema; export `ClaimState` helper type. | Low — passthrough schema already tolerates the keys. |
| `packages/core/src/frontmatter.ts` | Insert the four keys into `KEY_ORDER` after `worktree` so files serialise stably. | Low. |
| `packages/core/src/store.ts` | `takeTicket`: set expiry on take; new `transferTicket`/`renewTicket` (or one `claimTicket` with action) with `CLAIM_LIVE`/`CLAIM_NOT_OWNED` refusals preserving branch/worktree; `assertMoveAllowed` + `updateItem` backward-move rule (`reason`, attestation check for Review → Implementing, `review_round`/budget); shared `claimState(item, now)` helper; committed `## Transitions` append via existing `setDoc(append)`. | Medium — touches the CAS path; must keep `conflictError` wording and `stageEntered` first-entry semantics. |
| `packages/core/src/store.test.ts` | Cases: take sets expiry; transfer live refused; transfer expired keeps worktree and records from/to; legacy claim expires by `taken_at`; renew owner-only; backward move without reason refused; Review → Implementing with needs-changes attestation succeeds and increments `review_round`; budget exhausted refused; operator override; fixture without new fields behaves unchanged; round-trip key order. | Low. |
| `packages/core/src/board.ts` (config schema) | Optional `claimExpiryMinutes` (positive int, default 30) on `board.yml`. | Low. |
| `packages/mcp-server/src/index.ts` | `take_ticket` action enum → `take \| release \| transfer \| renew`, add `reason`; `move_item` add `reason`; pass `actorName` for renew/transfer. Tool count unchanged (37). | Low. |
| `packages/mcp-server/src/execution-packet.ts` | Occupancy refusal distinguishes expired vs live and names the `transfer` remedy; ready packet gains `claim` block; same-actor expired claim allowed. | Medium — refusal text is asserted by smoke; keep existing strings for the live case. |
| `packages/mcp-server/src/smoke.mjs` | Assertions for the new actions/refusals, packet `claim` block, unchanged 37-tool count. | Low. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Document the two new actions and `reason`. | Low. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated plugin bundle (`npm run plugin:build`, checked by `plugin:check`). | Generated. |
| `AGENTS.md` | No tool-count change; add the backward-move/transfer conduct sentence to the managed block if the agents-block script owns it (verify with `node scripts/agents-block.mjs`). | Low. |

## Context files

| Path | What it tells the implementer |
| --- | --- |
| `packages/core/src/gates.ts:166-232` | Backward moves cross no boundary; leave this untouched and put the rule in the store so gate semantics (one gated boundary per move) stay intact. |
| `packages/core/src/store.ts:659-745, 753-812` | `updateItem` ordering is load-bearing (CAS check before gate, `stageEntered` first-entry only, no-op writes must not bump `updated`); `moveItem` must raise every refusal before `computeOrder`. |
| `packages/core/src/store.ts:862-926` | Current take/release semantics, including `force` deleting `worktree` and `release` not clearing `assignee`. |
| `packages/core/src/frontmatter.ts` | Passthrough + `KEY_ORDER`; where new keys must be listed. |
| `packages/core/src/activity.ts` | `op` union and best-effort append; why a committed `## Transitions` record is also needed. |
| `packages/mcp-server/src/execution-packet.ts:432-524` | Refusal order (documented in the tool description at `index.ts:651`), `resume` exact-match rule, `unsafeTakenWorktree` checks that must still run before any occupancy decision. |
| `packages/mcp-server/src/check-pr.mjs:51-88` | The attestation shape the store's Review → Implementing check must accept (do not invent a second schema; validate the same fields). |
| `packages/mcp-server/src/smoke.mjs:538-562, 794-797, 1915-2030` | Existing `take_ticket`/packet assertions and their exact strings. |
| `docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md` | Expiry/transfer invariants and the one-migration-path rule. |
| `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md` | Same-PR remediation, delta review, budget. |
| `.kanmer/groups/HZN-008/context.md` (board) | Interim rule this ticket formalises; the "no leases/revisions here" boundary. |

## Ripple effects

- Core, MCP smoke, plugin bundle and `plugin:check` must stay coherent; `npm run verify` is the rail.
- The GUI reads the new fields via passthrough but does not display them; a GUI claim/expiry indicator is out of scope (GUI-144 or a follow-up).
- Skills that describe `take_ticket` (`kanmer-execute`, `kanmer-closeout`, `kanmer-auto`) keep working unchanged; the new actions are documented for SKILL-037 to adopt.

## Out of scope

- Lease ids, heartbeat, batch membership, `LEASE_EXPIRED` (CORE-115); `project_id`, `REVISION_CONFLICT`, document-inclusive revisions (CORE-114); any reconciliation apply (CORE-122/CORE-113'); merge-gate or CI changes (CORE-123); skill rewrites (SKILL-037); GUI UI.
