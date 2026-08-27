# Files — CORE-124

## Files the change touches

| File | Change | Risk |
| --- | --- | --- |
| `packages/core/src/types.ts` | `lease_batch`, `lease_batch_frozen_at` optional frontmatter fields; `TakeTicketInput.batch` / `batchMembers`; `BatchState` type; `isTerminalTicket()` helper | Low — passthrough schema, all optional |
| `packages/core/src/frontmatter.ts` | `KEY_ORDER` entries after `lease_reclaimed_from` | Low |
| `packages/core/src/store.ts` | `assertWorkspaceFree` same-frozen-batch exception + batch workspace mismatch; batch declaration/freeze in `takeTicket` (inside the lease lock); `releaseTicket` `BATCH_ACTIVE` refusal and batch-field clearing; `batchState(id)` read; `clearLeaseFields` covers batch fields on the last release only | High — the contract; keep every existing error prefix and the take/release activity op sequence |
| `packages/core/src/index.ts` | export new types/helpers | Low |
| `packages/core/src/claims.test.ts` | `batch workspaces (CORE-124)` suite: AC4 three-ticket fixture (one workspace, three attestations on one head, three proofs, release order), AC5 unrelated ticket refused from a frozen batch and from its workspace, mismatch refusal, release waits for all terminal, byte-identical files on refusal, v0.3.12-shaped ticket unaffected | Medium |
| `packages/mcp-server/src/errors.ts` | `BATCH_FROZEN:`, `BATCH_ACTIVE:`, `BATCH_WORKSPACE_MISMATCH:`, `BATCH_INVALID:` → `LEASE_CONFLICT` | Low |
| `packages/mcp-server/src/index.ts` | `take_ticket` `batch`, `batch_members` params + description (also fixes F-016 wording); no new tool | Medium — keep 39 |
| `packages/mcp-server/src/execution-packet.ts` | `claim.batch` block; same-batch sibling worktree exception in the physical occupancy refusal | Medium — do not weaken the foreign/board/alias refusals |
| `packages/mcp-server/src/smoke.mjs` | batch checks: declare+freeze via take, member joins same workspace, unrelated ticket refused (both ways), packet `claim.batch`, release refused while a member is non-terminal | Medium |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `take_ticket` row + field list | Low |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md`, `kanmer-closeout/SKILL.md`, `kanmer-auto/SKILL.md` | one batch-lane paragraph/sentence each, additive | Low — `verify:skills` pins existing sentences |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | rebuilt bundle (`plugin:build`, `plugin:check`) | Medium |
| `AGENTS.md` | §4 field example, §8 gotcha 18 (batch) | Low |
| `docs/manual/glossary.md` + `apps/gui/src/renderer/src/manual/chapters.generated.ts` | "Batch workspace" entry and its generated mirror (`build:manual`) | Low — generated file only, no GUI code |

## Ripple effects

- `store.test.ts:685` pins the take/release activity op sequence — batch stamping of sibling files must not append activity for the taker beyond the existing ops (use `scratch/execution.md`-free, activity-free stamps; siblings get no extra ops either or a separate documented op is avoided).
- `releaseTicket` is the GUI release path (`apps/gui/src/main/index.ts`): a GUI release of a batch member with non-terminal siblings now refuses `BATCH_ACTIVE`; the error string is surfaced as-is. No `apps/gui` change (another lane owns it).
- `execution-packet.ts` physical worktree refusal: exception only for tickets sharing the caller's `lease_batch`.
- `plugin:check` compares bundle bytes: rebuild after core/mcp changes.
- `verify:docs` requires the regenerated manual after a glossary edit.

## Out of scope (deliberately)

- Lock coverage of `updateItem`/`moveItem` (CORE-125); this ticket adds no unlocked writer.
- Skill-side heartbeat during review/verify/closeout (SKILL-036 / F-013).
- GUI batch badge (after GUI-144).
- Changing `force` semantics (F-008), release lease-token fencing (F-010), physical alias detection in core (F-006/F-012).
- Batch declaration through `update_item` or a dedicated tool; `.kanmer/batches/` folder.

## Context files (read before implementing)

| File | What it tells you |
| --- | --- |
| `docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md` | Batch paragraph, AC4/AC5 |
| `packages/core/src/store.ts:1082-1266` | Lease lock, `assertWorkspaceFree`, `takeTicket`, `releaseTicket` — the code to extend; existing error prefixes to keep |
| `packages/core/src/types.ts:440-475, 605-700` | Lease fields and input types |
| `packages/core/src/claims.test.ts:335-560` | Lease suite conventions, `stripLease`, byte-identical assertions |
| `packages/mcp-server/src/errors.ts` | Prefix → code classification |
| `packages/mcp-server/src/execution-packet.ts:254-362, 505-535` | Physical occupancy refusals and the claim block |
| `packages/mcp-server/src/smoke.mjs:2180-2260` | Lease fixture to extend |
| `scripts/verify-skill-prose.mjs:455-510` | Pinned closeout/execute sentences |
| CORE-115 `scratch/review.md` | F-004..F-016 accepted-risk list — do not regress |
| CORE-125 body | The unlocked-writer window — do not widen |
| AGENTS.md §8 gotcha 8 / §10 | Build the plugin bundle correctly; verification checklist |
