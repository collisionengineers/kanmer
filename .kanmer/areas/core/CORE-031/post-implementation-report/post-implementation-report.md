# Post-implementation report — CORE-031

## Scope delivered

- Added import-safe `scripts/verify.mjs` exporting the sole ordered `VERIFY_STEPS` array.
- Added the root `npm run verify` command.
- Updated `scripts/release.mjs` to consume the shared array and updated AGENTS.md's command contract.
- The rail builds clean-checkout package artifacts first, then runs tests/typecheck/smokes and plugin synchronization. HTTP tests receive only a disposable `KANMER_ROOT` fixture so standalone clones do not depend on a sibling board worktree; the fixture is removed in a `finally` block.

## Verification evidence

Clean standalone clone of branch `core-031-shared-verify-steps` after `npm ci`:

- `npm run verify`: PASS (exit 0).
- `npm test`: PASS — core 256 tests, GUI 318 tests, HTTP 61 tests, scripts 66 tests.
- `npm run typecheck`: PASS for core, mcp-server, ui, and gui.
- stdio smoke: PASS 184/184.
- protocol smoke: PASS 42/42.
- discovery smoke: PASS 13/13.
- skill verification: PASS; 12 skills and all contracts.
- managed AGENTS block verification: PASS 31/31.
- `npm run plugin:check`: PASS (30 tools, bundle bytes, 12 skill frontmatters, isolated handshake).
- `git status --porcelain` after the rail: clean; disposable board fixture removed.

Focused Windows Git integration after updating to current main: `src/main/kanmerGit.test.ts` PASS 12/12.

## Commits

- `2a0d489` — initial shared verification rail.
- `5e52d89` — current-main Git integration timeout rail.
- `87d83ba` — merge current main into the ticket branch.
- `c8c501b` — build-first clean-checkout ordering.
- `f1c4a68` — disposable board fixture for standalone HTTP tests.

## Notes

`plugin:check` is intentionally run only from the standalone clone; linked worktrees are refused by design. No release or merge was performed by the implementation agent.
