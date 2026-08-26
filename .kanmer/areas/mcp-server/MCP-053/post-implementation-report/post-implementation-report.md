# Post-implementation report

## Outcome

MCP-053 restores safe execution-packet resumption after a ticket is revisited through a different MCP client name. A caller supplies the exact recorded branch/worktree as a deliberate confirmation; the server remains fail-closed for missing or mismatched values. The execution skill now follows that ready packet correctly: it validates and reuses the recorded worktree and branch, rather than attempting a second worktree creation or ticket take.

## Changes

- Added the bounded `get_execution_packet.resume` pair and exact-match occupancy guard.
- Kept ordinary competing occupancy and every partial/mismatched resume refused.
- Added a real Git-worktree stdio smoke: a fresh client resumes a ticket taken by another actor, and the returned recorded worktree passes the exact validation commands required by `kanmer-execute`.
- Split fresh and resumed execution instructions. A present `ticket.taken` validates/reuses the existing worktree and never calls `git worktree add` or `take_ticket`; only an absent value takes the fresh path.
- Added a regression validator/test for that execution contract.
- Updated the canonical managed AGENTS body, generated `AGENTS.md`, and the shipped `kanmer-setup` mirror.
- Regenerated the shipped setup runtime through `plugin:build`.

## Files

- `packages/mcp-server/src/execution-packet.ts` and `packages/mcp-server/src/index.ts` — bounded resume protocol.
- `packages/mcp-server/src/smoke.mjs` — exact, mismatched, and physically reusable worktree coverage.
- `plugins/kanmer/skills/kanmer-execute/SKILL.md` and `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` — executable caller guidance.
- `scripts/verify-skill-prose.mjs` and `scripts/verify-skill-prose.test.mjs` — resume-flow regression protection.
- `scripts/agents-block-body.mjs`, `AGENTS.md`, `plugins/kanmer/skills/kanmer-setup/SKILL.md`, and generated plugin setup runtime — contributor convention and distribution alignment.

## Validation

- First attempt: `npm run build:server && node packages/mcp-server/src/smoke.mjs` — FAIL, 226/227. The new assertion compared Git's forward-slash Windows path to Node's backslash form; the actual worktree and branch were correct. The assertion now normalizes both paths.
- Final `npm run build:server && node packages/mcp-server/src/smoke.mjs` — PASS, 227/227 checks, including actual Git worktree reuse validation.
- `node scripts/verify-agents-block.mjs` — PASS, 31/31 checks.
- `node scripts/verify-skill-prose.mjs` and `node --test scripts/verify-skill-prose.test.mjs` — PASS, including the new resumed-flow regression case.
- `npm test` — PASS: core 310, GUI 483, MCP HTTP 107, scripts 117 tests.
- `npm run typecheck` — PASS across core, mcp-server, ui, and gui.
- `npm run plugin:build && npm run plugin:check` — PASS: 37 tools, matching bundle, 12 skill frontmatters, isolated handshake.

## Traceability and hand-off

Implementation commits: `257bb47a6fc9a895a23a5f1b89a723ed6632d71f` and `7bc0168e62ebff55c86102103c996be01b71faf4`. PR #282 requires a fresh independent review against the new head. After merge, verify at the exact merge SHA before release or Done.

## Risk

The exact pair remains a workflow confirmation, not client authentication: local MCP client names and readable ticket locations are not credentials. The resumed path is deliberately narrow and still refuses missing, partial, or non-exact pairs.
