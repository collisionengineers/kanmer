# Post-implementation report — MCP-050

## Result

MCP verification no longer depends on discovery of this developer checkout's board. Each affected test provisions its own disposable root containing a minimal `.kanmer` directory, passes that root explicitly where a child process is involved, and removes it after the test. Production code and behavioral assertions are unchanged.

## Files changed

- `packages/mcp-server/src/remote-host.test.mjs`: create one suite-scoped disposable board root, bind it through `KANMER_ROOT` before importing/using the production host, restore the prior environment value, and remove the fixture after the suite.
- `packages/mcp-server/src/doctor.test.mjs`: create a test-scoped disposable board root, pass it to the packaged CLI child, and register deterministic cleanup.

## Plan and governance mapping

The implementation follows the ticket plan and files boundary exactly: it reproduces the clean-clone cause, supplies explicit disposable roots, preserves assertions, and changes no release or production behavior. It supports CORE-103 by making the release verification gate hermetic.

## Verification attempts

1. `npm run build:server` before building core — FAIL: unresolved `@kanmer/core`; this was an invalid monorepo build order and is retained as an execution failure.
2. Focused test command from the repository root — FAIL: the doctor fixture spawned `dist/doctor-cli.js` relative to the wrong working directory; retained as an invocation failure.
3. Build core, build server, then run the focused tests from `packages/mcp-server` — PASS, 17/17.
4. Full MCP HTTP test rail — PASS, 102/102.
5. `npm run verify` from the ticket worktree — PASS, exit 0. This included core 310/310, GUI 477/477, MCP verification, documentation checks, smoke tests, protocol checks, skills checks, AGENTS block checks, MCPB packaging checks, and plugin synchronization.

## Risks and follow-ups

The fixtures intentionally create only the minimum board marker needed for root resolution. Exact merged-main and clean-clone release dry-run verification remain required after merge; those belong to verification and CORE-103 respectively.

## Merged-result checks

- Run the focused doctor and remote-host tests from the MCP workspace.
- Run `npm run verify`.
- In a genuine clean clone of merged `main`, run `npm run release -- 0.3.8 --ticket CORE-103 --dry-run` and require exit 0.
