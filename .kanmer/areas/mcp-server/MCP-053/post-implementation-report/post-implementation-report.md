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
- Second attempt: GitHub Actions Node 20 `npm run verify` — FAIL in the same smoke assertion. Git emitted a forward-slash Windows path that Node 20 did not canonicalize through `path.resolve`; the resumed worktree itself and branch were correct. Commit `77def3c4` now compares explicit `path.win32.normalize()` values (including drive-letter case).
- Final local `npm run build:server && node packages/mcp-server/src/smoke.mjs` — PASS, 227/227 checks, including actual Git worktree reuse validation and the explicit Node-20 path-form comparison.
- `node scripts/verify-agents-block.mjs` — PASS, 31/31 checks.
- `node scripts/verify-skill-prose.mjs` and `node --test scripts/verify-skill-prose.test.mjs` — PASS, including the new resumed-flow regression case.
- `npm test` — PASS: core 310, GUI 483, MCP HTTP 107, scripts 117 tests.
- `npm run typecheck` — PASS across core, mcp-server, ui, and gui.
- `npm run plugin:build && npm run plugin:check` — PASS: 37 tools, matching bundle, 12 skill frontmatters, isolated handshake.

## Traceability and hand-off

Implementation commits: `257bb47a6fc9a895a23a5f1b89a723ed6632d71f`, `7bc0168e62ebff55c86102103c996be01b71faf4`, and `77def3c4c618026346c366b9c20e6027eb4cc5cc`. PR #282 requires a fresh independent review against the new head. After merge, verify at the exact merge SHA before release or Done.

## Risk

The exact pair remains a workflow confirmation, not client authentication: local MCP client names and readable ticket locations are not credentials. The resumed path is deliberately narrow and still refuses missing, partial, or non-exact pairs.

## CI path-format correction

GitHub Actions Node 20 rejected commit `77def3c4`'s raw displayed-path comparison even though the same Node 20 smoke passed locally. Commit `44da9143b660434ad4e813bfd93215c01aed5729` removes that environment-format assumption: the smoke now proves that `git -C <recorded-worktree> rev-parse --show-toplevel` succeeds with a non-empty root, `--show-prefix` is empty (the recorded path is that worktree's root), and `branch --show-current` exactly matches the recorded branch. Local Node 20 smoke passed 227/227; `npm run plugin:build && npm run plugin:check` passed. A full local suite was intentionally stopped after accidental overlapping GUI test runs at the operator's direction; it is not recorded as a PASS. Fresh GitHub Actions verification is required.

## Review remediation: F-005 to F-008

Commit `3be62a2e6479c0f6c6a659c5f059d72ab18a232c` closes the second independent-review pass without widening the protocol beyond safe local resumption.

- F-005: the public MCP take-ticket prompt and the dispatch `execute` prompt now start with `get_status` and `get_execution_packet`, retry only the literal occupied-ticket resume pair, and select fresh versus resumed execution from `ticket.taken`.
- F-006: the packet rejects a taken record that names another active ticket's worktree, the board worktree, a missing/non-Git checkout, or a checkout whose Git common directory differs from the source repository. The skill and managed instructions specify the same checks before editing.
- F-007: pausing is now a retained-taken handoff. A paused ticket must not be released while its branch/worktree is a resume target; a later worker resumes it through the exact packet pair.
- F-008: a taken ticket without both branch and worktree now returns a structured refusal before an agent can receive an unusable `ready:true` packet.

## Remediation validation

- Node 20: `npm run build && npx --yes --package=node@20.20.2 node packages/mcp-server/src/smoke.mjs` — PASS, 231/231, including duplicate-worktree, foreign-repository, board-worktree, and incomplete-metadata refusals.
- `npm run test -w @kanmer/core` — PASS, 311 tests.
- `node scripts/verify-agents-block.mjs` — PASS, 31/31.
- `node scripts/verify-skill-prose.mjs` and `node --test scripts/verify-skill-prose.test.mjs` — PASS, including rejection of a skill with missing repository or pause-handoff checks.
- `npm run typecheck`, `node scripts/build-manual.mjs --check`, and `npm run plugin:build && npm run plugin:check` — PASS.
- `npm test` — PASS (exit 0): core 311, GUI 483, MCP HTTP rail, and script tests 118.

A fresh GitHub Actions run and a new independent review are required at this commit; the prior review attestation correctly remains needs-changes until then.


## CI remediation: physical Windows worktree identity

GitHub Actions run 32976181265 found a real Windows-only safety/compatibility defect in commit `3be62a2e`: the runner's source root used an 8.3 path alias (\`RUNNER~1\`) while Git described the same common directory with the long username form. Lexical path comparison treated that one repository as foreign, so three otherwise-correct occupied/resume checks failed.

Commit `ae12aba14cdf2a1c1d08232f27b1f18828efc93c` resolves existing candidate, board, and active-ticket worktree paths through the filesystem before every resume-safety comparison. It continues to fail closed if a path cannot be resolved; there is no lexical fallback. Git common directories use the same physical identity, so normal resume accepts only a verified worktree from the source repository.

The smoke now creates directory aliases, proving both that an aliased active-ticket worktree is rejected and that an aliased board worktree cannot become a resumable execution location.

## Latest validation

- Full `npm run verify` at the preceding focused CI-path correction commit `4a213ac4c` — PASS: core 311, GUI 483, MCP smoke 231/231, protocol, MCPB, docs, skills, AGENTS, and plugin synchronization.
- Final commit `ae12aba14cdf2a1c1d08232f27b1f18828efc93c`: `npm run build && npx --yes --package=node@20.20.2 node packages/mcp-server/src/smoke.mjs` — PASS, 232/232, including the new aliased worktree and aliased board refusals.
- Final commit: `npm run typecheck -w @kanmer/mcp-server` and `npm run plugin:build && npm run plugin:check` — PASS.

Fresh GitHub Actions verification and independent review are required for `ae12aba14cdf2a1c1d08232f27b1f18828efc93c`; the previous review record remains correctly superseded.


## Review remediation: F-009 to F-012

Commit `c27c56751f646819ec5bc3a0c554e8eba1009e02` closes the final four independent-review findings without broadening the local-resume protocol.

- F-009: a resumed ticket is now refused when its recorded worktree physically resolves to the shared source checkout, including a dedicated board worktree whose `worktree: "."` otherwise names that checkout.
- F-010: the closeout instructions no longer release a paused ticket; release would clear the branch/worktree metadata required by the resumed packet.
- F-011: approved FRD-016 now names packet-first execution and explicitly distinguishes fresh creation/take from exact resumed reuse.
- F-012: every `ready:false` packet refusal is an external read-only hand-off; it no longer directs the agent to write scratch.

The generated managed instructions and the shipped plugin mirror the same source-checkout restriction. Prose validation has negative regression cases for read-only refusal hand-off and retained pause metadata. The MCP smoke launches a dedicated board worktree and proves that `worktree: "."` cannot resume into its shared source repository.

## Final validation at this commit

- `npm run verify` — PASS (exit 0): core 311, GUI 483, MCP smoke 233/233, protocol/script rails, typechecks, documentation verification, managed-instruction verification, and plugin synchronization.
- `git diff --check` — PASS.

Fresh GitHub Actions and a new independent review are required for `c27c56751f646819ec5bc3a0c554e8eba1009e02`; the prior SHA-bound needs-changes review remains preserved as historical evidence until replaced.


## Review remediation: F-013 to F-017

Commit `0dd92f1c326098a7fd420e96f9c6fba2d8c2e8a5` resolves the final independent-review findings on the execution-packet resume path.

- F-013: the server resolves the actual Git worktree root and refuses a detached checkout or one whose checked-out branch differs from the recorded branch.
- F-014: an unrelated active ticket with a missing/non-Git worktree is reported as a packet warning rather than blocking an otherwise isolated resume; an actual physical-root collision still refuses.
- F-015: a taken ticket receives a resumed execution packet only in `implementing`; Review and Verifying records remain taken for traceability but cannot reopen implementation.
- F-016: public take-ticket and headless execute prompts again require discovery and reading of all `reference/` inputs after packet readiness, explicitly including non-Markdown files absent from `extraDocs`.
- F-017: the recorded value must resolve to the Git worktree root. A child of the board, shared source checkout, or another ticket worktree is refused before the packet can be ready.

The server and the execute/setup/managed instructions now agree on this root-only, implementation-only contract. Runtime smoke coverage includes detached/different branch, Review/Verifying, stale-peer warning, board/source/peer child paths, aliases, and a dedicated board worktree.

## Final validation at this commit

- `npm run verify` — PASS (exit 0): core 311, GUI 483, MCP HTTP 107, scripts 120, MCP packet smoke 241/241, protocol 46/46, headless discovery, docs, typechecks, MCPB, managed instructions, and plugin synchronization.
- `git diff --check` — PASS.

Fresh GitHub Actions and an independent review are required at `0dd92f1c326098a7fd420e96f9c6fba2d8c2e8a5`. The SHA-bound review attestation `400dfd05fe99188a` remains preserved as historical needs-changes evidence until replaced.
