# Post-implementation report — CORE-124

Branch `core-124-batch-workspaces`, worktree `.worktrees/core-124`, based on origin/main 3dd48d37 (CORE-115). One commit **14cf7083**; PR #295 (https://github.com/collisionengineers/kanmer/pull/295).

## What changed and why

| File | Change |
| --- | --- |
| `packages/core/src/types.ts` | `lease_batch` / `lease_batch_frozen_at` optional passthrough fields; `TakeTicketInput.batch` / `batchMembers`; `isTerminalTicket()` (Done or archived — closeout's two terminal shapes); `BatchState` / `BatchMemberState`. |
| `packages/core/src/frontmatter.ts` | `KEY_ORDER` entries after `lease_reclaimed_from`. |
| `packages/core/src/store.ts` | `assertWorkspaceFree(id, worktree, branch, batchId, siblings)`: same-batch sibling may share the recorded worktree+branch, any other workspace for a member is `BATCH_WORKSPACE_MISMATCH`, a non-member is still `WORKSPACE_OCCUPIED` (message names the batch). `validateBatchDeclaration` (`BATCH_INVALID` / `BATCH_FROZEN`, before any write) and the sibling stamp in `takeTicket` inside the existing lease lock (no activity ops for siblings). `releaseTicket` refuses `BATCH_ACTIVE` while another member is non-terminal; `clearLeaseFields` drops the batch keys on the last release. `batchState(id)` public read. |
| `packages/core/src/claims.test.ts` | New suite `batch workspaces (CORE-124)`: AC4 three-ticket fixture (freeze, join, one PR/head across three attestations, three proofs, `BATCH_ACTIVE`, release order, record cleared), AC5 (`BATCH_FROZEN`, non-member `BATCH_INVALID`, `WORKSPACE_OCCUPIED` incl. force, byte-identical files), mismatch, invalid declarations, archived member terminal, key-order round trip + untouched v0.3.12-shaped ticket. 39 → 45 tests; nothing existing changed. |
| `packages/mcp-server/src/errors.ts` | `BATCH_INVALID:`, `BATCH_FROZEN:`, `BATCH_WORKSPACE_MISMATCH:`, `BATCH_ACTIVE:` → `LEASE_CONFLICT`. |
| `packages/mcp-server/src/index.ts` | `take_ticket` gains `batch?` and `batch_members?` (min 2); description carries the batch contract and names branch-mismatch under `RECOVERY_REFUSED` (CORE-115 F-016). No new tool — 39. |
| `packages/mcp-server/src/execution-packet.ts` | `claim.batch` (`id`, `frozenAt`, `workspace`, `members`, `pending`) from `store.batchState`; the "same worktree as active ticket" scan skips same-batch siblings only — board/source/foreign/alias/detached/branch refusals unchanged. |
| `packages/mcp-server/src/smoke.mjs` | Seven batch checks on a real sandbox worktree: declare+freeze, member joins with own lease, mismatch, AC5 both ways (`LEASE_CONFLICT` codes, zero writes), packet ready on the shared worktree with `claim.batch`, `BATCH_ACTIVE` on early release, isolated default. 299 → 306. |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | New "Batch lane (deliberate, FRD-030)" subsection after the fresh-take sequence (additive; pinned sentences untouched). |
| `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | §2 paragraph: refuse worktree removal/branch deletion while any batch member is non-terminal; §3 sentence on releasing members last. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Lane rule: the deliberate batch lane is the only case lanes share a worktree/branch/PR. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `take_ticket` row (batch contract, params) and the `lease_batch` field entry. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Rebuilt bundle (`plugin:check`: 39 tools match, bytes match). |
| `AGENTS.md` | §4 field example lines; §8 gotcha **18** (batch is the only exception, frozen by first take, no batch file/tool, release gate). |
| `docs/manual/glossary.md`, `apps/gui/src/renderer/src/manual/chapters.generated.ts` | "Batch workspace" entry and its regenerated mirror (`build:manual`); no hand-written GUI code touched. |

## Governing docs

- **FRD-030** — Meets: batch mode is deliberate (opt-in via `batch`/`batch_members`; isolated stays default); one controller/workspace/branch for two or more related tickets; membership freezes when implementation starts (first member take, `BATCH_FROZEN` afterwards); every member retains its own outcome, acceptance, review mapping and proof (documents unchanged, AC4 test); cleanup waits for all members terminal (`BATCH_ACTIVE`, closeout prose); a ticket cannot occupy two active workspaces (`BATCH_WORKSPACE_MISMATCH`). **AC4** and **AC5** are the core tests and smoke checks. FRD text unchanged (still draft, owner document).
- **HZN-008 context** — Meets: additive optional frontmatter only (live v0.3.12 board reads members unchanged); no mandatory batch mode; every batch write under the lease lock/CAS; no deletion.
- **FRD-016 / CORE-115 accepted risks (F-004..F-016)** — Not regressed: `force` semantics, renew compatibility lane, release fencing (F-010), lexical path comparison (F-006/F-012), `transfer` behaviour all untouched; F-016 wording fixed.
- **CORE-125 boundary** — No new unlocked writer: batch fields are written only by `takeTicket`/`releaseTicket` under `withLeaseLock`; `updateItem`/`moveItem` unchanged.

## Deviations from the plan

1. `assertWorkspaceFree` takes the sibling list as a parameter (one `listItems({ includeArchived: true })` per take, reused by the declaration validator) instead of scanning twice — same semantics, one read.
2. A member whose record already carries `lease_batch` may take the batch workspace **without** passing `batch` (it is inferred from the frozen record); passing a different id is `BATCH_INVALID`. The plan implied `batch` was always required on later takes; inference is strictly safer for installed skills.
3. Sibling stamps bump the sibling's `updated` (a frontmatter write must) but append no activity entries; the taker's op sequence is unchanged and `store.test.ts` is untouched.
4. `claim.batch` also carries `workspace` (the plan listed id/frozenAt/members/pending) so a resuming worker sees the shared workspace key without a second call.

## Commands and exit codes (cwd `.worktrees/core-124`, head 14cf7083)

| Command | Exit |
| --- | --- |
| `npm ci` | 0 |
| `npm run typecheck` | 0 |
| `npm test -w @kanmer/core` | 0 (19 files, 417 tests) |
| `npm run build` | 0 |
| `node packages/mcp-server/src/smoke.mjs` | 0 (306/306) |
| `npm run smoke:protocol` | 0 (50/50) |
| `node --test packages/mcp-server/src/reconciliation.test.mjs` | 0 |
| `npm run verify:skills` / `build:manual` / `verify:docs` | 0 / 0 / 0 |
| `npm run plugin:build` / `plugin:check` | 0 / 0 (39 tools match, bundle bytes match, isolated handshake 39) |
| `npm run verify` | 1 — `npm test` → `test:scripts`: the two known antigravity launcher `EBUSY` host-quirk failures ("quote-free launcher … LOCALAPPDATA contains spaces", "installer shim restores the provider cwd"); core 417/417 and GUI 493/493 passed in that run. Recorded, not chased; hosted `verify` is authoritative. |
| `npm run smoke:headless` / `mcpb:check` / `smoke:discovery` / `verify:agents-block` (run individually after the rail stopped) | 0 each |
| `git push -u origin core-124-batch-workspaces` | 0 |

## Risks and follow-ups

- `BATCH_ACTIVE` also gates the GUI's release button for a batch member; the GUI shows the raw error string (no `apps/gui` change here — GUI-144 lane owns that tree). A batch badge is parked after GUI-144.
- `transfer` of one member reclaims only that member's lease; whether a dead controller's whole batch should transfer at once is a parked question for SKILL-036.
- The live board's own take of this ticket was served by v0.3.12, so this ticket's record carries no lease/batch fields — expected passthrough behaviour.
- Same-batch exception in the packet's worktree scan is keyed on `lease_batch` equality only; the physical board/source/foreign/branch checks still run for the member's own worktree.

## For kanmer-verify (on the merged SHA)

- `npm test -w @kanmer/core` (suite `batch workspaces (CORE-124)` in `claims.test.ts`), `node packages/mcp-server/src/smoke.mjs` (306 incl. the batch block), `npm run plugin:check` from a normal checkout (39 tools), `npm run verify:skills`, `npm run verify:docs`.
- Confirm a v0.3.12 server still lists a ticket carrying `lease_batch` / `lease_batch_frozen_at` (passthrough) — e.g. `get_item` on a smoke-style fixture.
