# Checklist — CORE-124

- [x] Worktree `.worktrees/core-124` on branch `core-124-batch-workspaces` from origin/main; `npm ci`; ticket taken with branch + worktree.
- [x] `types.ts`: `lease_batch`, `lease_batch_frozen_at`; `TakeTicketInput.batch`/`batchMembers`; `BatchState`; `isTerminalTicket`. `frontmatter.ts` KEY_ORDER. `index.ts` exports.
- [x] `store.ts`: batch declaration + freeze at first take inside the lease lock (`BATCH_INVALID`, `BATCH_FROZEN`).
- [x] `store.ts`: `assertWorkspaceFree` same-frozen-batch exception; `BATCH_WORKSPACE_MISMATCH`; non-member `WORKSPACE_OCCUPIED` names the batch; force still refused.
- [x] `store.ts`: `releaseTicket` refuses `BATCH_ACTIVE` while another member is non-terminal; clears batch fields otherwise; `batchState(id)` read.
- [x] `claims.test.ts` AC4: three-ticket batch, one workspace, three attestations on one PR/head, three proofs, release waits then clears.
- [x] `claims.test.ts` AC5: unrelated ticket refused from the frozen batch (`BATCH_FROZEN`) and from its workspace (`WORKSPACE_OCCUPIED`, incl. force), byte-identical files.
- [x] `claims.test.ts`: mismatch, invalid membership cases, archived member terminal, key-order round trip; `npm test -w @kanmer/core` green, count strictly higher (claims.test.ts 39 → 45).
- [x] `errors.ts` prefixes; `index.ts` `take_ticket` `batch`/`batch_members` + description (F-016 wording); roster 39.
- [x] `execution-packet.ts`: `claim.batch`; same-batch sibling worktree exception only.
- [x] `smoke.mjs` batch checks pass (306/306); `smoke:protocol` and `reconciliation.test.mjs` — see progress notes.
- [ ] Docs: tool-reference row/fields, execute/closeout/auto batch sentences (additive), AGENTS §4/§8, glossary + `build:manual`; `verify:skills` and `verify:docs` exit 0.
- [ ] `plugin:build` + `plugin:check` (39 tools, bytes match).
- [ ] [pre-review] Full `npm run verify` run recorded with exit code; host quirks recorded verbatim.
- [ ] [pre-review] Commits pushed, PR opened with `Kanmer: CORE-124` footer, post-implementation report written, ticket moved to Review.
- [ ] [pre-review] Stop at the approved boundary; do not merge or start another ticket.

## Progress notes

- 2026-08-27 implementation in `.worktrees/core-124` (base 3dd48d37): `npm run typecheck` 0; `vitest run claims.test.ts` 45/45; `node packages/mcp-server/src/smoke.mjs` 306/306 (7 new batch checks). Live take was served by v0.3.12 (no lease minted on this ticket's own record — expected).
