# Plan — CORE-124: Add deliberate batch workspaces on top of renewable leases

## Objective

Land FRD-030 batch mode as one PR on the CORE-115 lease contract: a frozen batch record on members, `take_ticket` admitting the same workspace only for members of the same frozen batch, per-member review/proof with a shared PR/head, and cleanup that waits for every member to be terminal — additive to the v0.3.12-served board, 39 tools, no regression of CORE-115's accepted risks, no new unlocked writer.

## Starting state

origin/main 3dd48d37. `packages/core/src/store.ts:1082-1266`: `withLeaseLock` (`.kanmer/leases.lock`), `workspaceKey`, `assertWorkspaceFree` (refuses `WORKSPACE_OCCUPIED` for any other taken non-archived ticket on the same normalised worktree or exact branch; force-proof; doc comment names CORE-124 as the only planned exception), `takeTicket` (LEASE_LIVE, occupancy, lease minting), `releaseTicket` (clears claim + lease fields). Frontmatter is passthrough; `KEY_ORDER` ends the lease block at `lease_reclaimed_from`. `UpdateItemPatch`/`update_item` expose no lease fields. `errors.ts:8` maps stable prefixes to `LEASE_CONFLICT`. `execution-packet.ts` builds a `claim` block (`:515-530`) and refuses another active ticket's worktree physically (`:254-362`). Skills: execute (fresh-take at `:184-201`), closeout (§2 git half, §3 release), auto (`:95` one worktree per lane). `verify-skill-prose.mjs` pins sentences in closeout/execute/auto. Tests: `claims.test.ts` lease suite; `smoke.mjs:2180-2260` lease fixture; `store.test.ts:685` pins take/release activity ops.

## Governing docs

- **FRD-030** — **Meets**: "Batch mode is deliberate: one controller owns one workspace and branch for two or more small related tickets; membership freezes when implementation starts" → declaration + freeze at the first member take, ≥ 2 members, one recorded workspace per batch. "Every member retains its own outcome, acceptance, review mapping and proof" → documents stay per ticket; test proves three attestations naming one PR/head plus three proofs. "Cleanup waits for all members to become terminal" → `BATCH_ACTIVE` on release + closeout sentence. "A ticket cannot occupy two active workspaces" → a member may only take the batch workspace (`BATCH_WORKSPACE_MISMATCH`). AC4 and AC5 are the two core tests and the smoke checks. Unchanged FRD (stays draft, owner document).
- **HZN-008 context** — Meets: additive optional fields only, v0.3.12 stays live, no mandatory batch mode (isolated remains default), no silent deletion, writes under the lease CAS/lock.
- **FRD-016 / CORE-115 accepted risks** — Meets: `force` semantics unchanged; `WORKSPACE_OCCUPIED` remains force-proof; release fencing (F-010), alias detection (F-006/F-012) untouched. F-016 wording fixed in the same description edit.
- **CORE-125 boundary** — batch fields are written only inside `withLeaseLock` by lease verbs; no generic writer gains a lease field.

## Required changes

1. **Types** (`types.ts`): `lease_batch: z.string().min(1).optional()`, `lease_batch_frozen_at: TimestampSchema.optional()` in `ItemFrontmatterSchema`; `TakeTicketInput.batch?: string`, `batchMembers?: string[]`; `export function isTerminalTicket(item: Pick<Item,"status"|"archived">): boolean` (`status === "done" || archived === true`); `export interface BatchState { id: string; frozenAt: string | null; workspace: string | null; members: { id: string; status: string; archived: boolean; terminal: boolean; taken: boolean }[]; allTerminal: boolean }`.
2. **Key order** (`frontmatter.ts`): `lease_batch`, `lease_batch_frozen_at` after `lease_reclaimed_from`.
3. **Store** (`store.ts`), all inside the existing lease lock:
   - `private async batchMembers(batchId)` → non-archived-or-archived tickets with `lease_batch === batchId` (include archived: they count as terminal); `async batchState(id): Promise<BatchState | null>` public read (null when the ticket has no `lease_batch`), workspace = first taken member's `lease_workspace`.
   - `takeTicket`: after LEASE_LIVE check. If `input.batchMembers` given: require `input.batch`; `BATCH_INVALID:` when fewer than 2 distinct ids, the taker is not listed, an id is unknown/not a ticket/archived/terminal/taken, or already carries a different `lease_batch`; `BATCH_FROZEN:` when the batch id already has a frozen member (membership cannot change after the first take). Otherwise stamp `lease_batch` + `lease_batch_frozen_at = now` on every listed sibling file (`writeFileAtomic`, `updated` bumped, no activity ops) and on `next`. If `input.batch` is given without members, it must equal the ticket's existing `lease_batch` else `BATCH_INVALID:`; if the ticket already carries `lease_batch`, that is the batch. `assertWorkspaceFree(id, worktree, branch, batchId)`: an occupying sibling with the same `lease_batch` is allowed; a member whose batch already has a recorded workspace (any taken sibling with `lease_workspace`/branch) must present the same worktree (normalised) and branch, else `BATCH_WORKSPACE_MISMATCH:`; non-member occupancy message names the batch ("… is batch <id>'s workspace; only its frozen members may take it").
   - `releaseTicket`: when `current.lease_batch` set and any other member is non-terminal → `BATCH_ACTIVE:` naming the pending ids, zero writes; otherwise clear everything including the two batch fields. Force-retake keeps `lease_batch` (membership survives lease mutations); `transferTicket`/`renewTicket` leave batch fields untouched (they spread `current`).
   - `clearLeaseFields` gains the two batch keys (release only).
4. **Core exports** (`index.ts`): `BatchState`, `isTerminalTicket`.
5. **MCP** (`errors.ts`): add `BATCH_FROZEN:`, `BATCH_ACTIVE:`, `BATCH_WORKSPACE_MISMATCH:`, `BATCH_INVALID:` to `LEASE_CONFLICT_PREFIXES`. (`index.ts`) `take_ticket` gets `batch?: string`, `batch_members?: string[]` (take only); description gains the batch contract and names branch-mismatch under RECOVERY_REFUSED (F-016). No new tool.
6. **Packet** (`execution-packet.ts`): `ExecutionPacketClaim.batch: { id, frozenAt, members: string[], pending: string[] } | null` from `store.batchState`; the "another active ticket's worktree" refusal (both fresh and resume lanes) skips tickets whose `lease_batch` equals the caller's. Board/foreign/alias/detached refusals unchanged.
7. **Tests**: `claims.test.ts` new suite `batch workspaces (CORE-124)`: (a) AC4 — three tickets declared+frozen by the first take on `.worktrees/batch-a`/`batch-a`, second and third members take the same worktree+branch, `batchState` lists three members; each writes `scratch/review` attestation with the same `pr`/`head_sha` and its own `proof`, moved to done (gates satisfied via profile chore/docs as in existing tests); release of the first member refuses `BATCH_ACTIVE` while a sibling is not done, all three release once terminal, files cleared. (b) AC5 — unrelated ticket: `batch_members` naming a frozen member → `BATCH_FROZEN`, take on the batch worktree → `WORKSPACE_OCCUPIED`, take on the batch branch with force → `WORKSPACE_OCCUPIED`; byte-identical files. (c) member on a different worktree → `BATCH_WORKSPACE_MISMATCH`. (d) `BATCH_INVALID` for a one-member list, a taken member, and a member already in another batch. (e) archived (retired) member counts as terminal. (f) key order round trip. `smoke.mjs`: declare+freeze via `take_ticket`, member joins, unrelated refused twice (`LEASE_CONFLICT`), packet `claim.batch`, release refused `BATCH_ACTIVE`; roster assertion stays 39.
8. **Docs/skills**: `tool-reference.md` `take_ticket` row + fields; `kanmer-execute` one paragraph after the fresh-take block (batch lane: first member takes with `batch`/`batch_members`, later members take the recorded batch worktree/branch with `batch`, one PR whose footer lists every member, one attestation head shared); `kanmer-closeout` sentence in §2/§3: refuse worktree removal and release while any batch member is non-terminal (`BATCH_ACTIVE`); `kanmer-auto` sentence at the lane rule: a deliberate batch lane is the only case where lanes share a worktree. AGENTS.md §4 example lines + §8 gotcha 18; `docs/manual/glossary.md` "Batch workspace"; `npm run build:manual`; `npm run plugin:build`.

## Expected files

| Action | Path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/types.ts` | fields, input, `BatchState`, `isTerminalTicket` |
| Modify | `packages/core/src/frontmatter.ts` | KEY_ORDER |
| Modify | `packages/core/src/store.ts` | batch declare/freeze, occupancy exception, release gate, `batchState` |
| Modify | `packages/core/src/index.ts` | exports |
| Modify | `packages/core/src/claims.test.ts` | AC4/AC5 suite |
| Modify | `packages/mcp-server/src/errors.ts` | prefixes |
| Modify | `packages/mcp-server/src/index.ts` | take_ticket params/description |
| Modify | `packages/mcp-server/src/execution-packet.ts` | claim.batch, sibling exception |
| Modify | `packages/mcp-server/src/smoke.mjs` | batch checks |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | contract |
| Modify | `plugins/kanmer/skills/kanmer-execute/SKILL.md`, `kanmer-closeout/SKILL.md`, `kanmer-auto/SKILL.md` | batch-lane prose (additive) |
| Modify (generated) | `plugins/kanmer/mcp/kanmer-mcp.cjs` | rebuilt bundle |
| Modify | `AGENTS.md`, `docs/manual/glossary.md` | field example, gotcha, glossary |
| Modify (generated) | `apps/gui/src/renderer/src/manual/chapters.generated.ts` | `build:manual` mirror only |

## Do not modify

`apps/gui/**` hand-written code (GUI-144 lane), `.worktrees/kanmer`, `packages/mcp-server/src/http*.ts`, registry (MCP-054), `force`/transfer/renew semantics, any existing test assertion, FRD-030 text, board format/version, `updateItem`/`moveItem` (CORE-125).

## Constraints

Additive optional frontmatter only; every batch write under `withLeaseLock`; error prefixes stable and classified; roster 39; `store.test.ts` activity op sequence for take/release unchanged; `verify:skills` pinned sentences untouched (add, never rewrite); bundle rebuilt from this worktree's build (`plugin:check` bytes match); Windows paths normalised via existing `normalizeWorktreePath`.

## Ordered steps

1. `git fetch origin`; `git worktree add .worktrees/core-124 -b core-124-batch-workspaces origin/main`; `npm ci` there; `take_ticket CORE-124 branch core-124-batch-workspaces worktree .worktrees/core-124`.
2. types.ts + frontmatter.ts + index.ts (change 1, 2, 4).
3. store.ts (change 3); `npm run typecheck`.
4. claims.test.ts suite (change 7a-f); `npm test -w @kanmer/core` green with strictly more tests.
5. errors.ts, index.ts take_ticket, execution-packet.ts (changes 5, 6); `npm run build`.
6. smoke.mjs checks; `node packages/mcp-server/src/smoke.mjs`; `npm run smoke:protocol`.
7. Docs and skills (change 8); `npm run verify:skills`; `npm run build:manual`; `npm run verify:docs`.
8. `npm run plugin:build && npm run plugin:check` (39 tools, bytes match).
9. Full rail `npm run verify` (record known host quirks verbatim, do not chase).
10. Commit(s) with `Kanmer: CORE-124` footer; push; `gh pr create` with footer; write post-implementation report; `move_item CORE-124 review`.

## Acceptance checks

- Production callers: `take_ticket` handler → `store.takeTicket` with `batch`/`batchMembers`; `releaseTicket` (MCP + GUI path) enforces `BATCH_ACTIVE`; packet `claim.batch` built from `store.batchState`.
- Bundle ships the change: `plugin:check` bytes match; isolated handshake lists 39 tools.
- No schema migration: fields optional; a v0.3.12-shaped ticket test still passes unchanged.
- Tests prove AC4 (three members, one workspace, one PR/head across three attestations, three proofs, release waits) and AC5 (unrelated ticket refused from the batch and from its workspace) with byte-identical files on refusal; no existing assertion weakened.

## Commands

cwd `.worktrees/core-124`: `npm ci`, `npm run typecheck`, `npm test -w @kanmer/core`, `npm run build`, `node packages/mcp-server/src/smoke.mjs`, `npm run smoke:protocol`, `node --test packages/mcp-server/src/reconciliation.test.mjs`, `npm run verify:skills`, `npm run build:manual`, `npm run verify:docs`, `npm run plugin:build`, `npm run plugin:check`, `npm run verify`. Hosted `verify` and `kanmer-gate` on the PR are authoritative.

## Failure and deviation rules

Stop and report: any existing test needing a weakened assertion, `plugin:check` byte mismatch that a rebuild does not fix, a pinned skill sentence broken by `verify:skills`, scope growth beyond the files above (split via kanmer-tickets), or a gate refusal. Known host quirks (antigravity EBUSY, kanmerGit orphan-cleanup, core 5 s timeouts, http spawn ETIMEDOUT) are recorded, not chased.

## Stop condition

PR open against `main` with a `Kanmer: CORE-124` footer, ticket in Review with the post-implementation report written. No review, merge, verify, closeout or release.
