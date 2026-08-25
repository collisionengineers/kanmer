# Post-implementation report — GUI-136

## Result

The remote host now returns the existing HTTPS public endpoint plus the actual authenticated loopback endpoint. The packaged child ready protocol sends that loopback value in the GUI-consumed `endpoint` field and names the public value separately, so the GUI retains its fail-closed canonical-loopback check while doctor receives a usable local origin.

## Files changed

- `packages/mcp-server/src/remote-host.ts` — additive `localEndpoint` result.
- `packages/mcp-server/src/remote-cli.ts` — corrected ready-event endpoint semantics.
- `packages/mcp-server/src/remote-host.test.mjs` — asserts both endpoint identities and tunnel target equality.
- `packages/mcp-server/src/smoke-remote.mjs` — checks the additive contract.
- `apps/gui/src/main/remoteAccess/manager.test.ts` — exercises the packaged child event parser and proves the canonical loopback endpoint is retained.

## Governing docs

FRD-025's loopback-only authenticated origin and truthful doctor requirements are restored without changing Cloudflare resources, bearer storage, or the public endpoint contract.

## Verification performed

- Initial `npm run build`: failed because the fresh linked worktree reused root-checkout workspace links and resolved stale `@kanmer/core` build exports.
- `npm ci`: PASS; created the worktree-local dependency graph.
- `npm run build`: PASS.
- `node --test packages/mcp-server/src/remote-host.test.mjs`: PASS, 8/8.
- `npm exec vitest run -- src/main/remoteAccess/manager.test.ts`: PASS, 10/10.
- First `npm run typecheck`: failed on a readonly ChildProcess test property.
- After correcting the fake child with `Object.defineProperty`, focused manager tests PASS 10/10 and full `npm run typecheck` PASS across all workspaces.
- `git diff --check`: PASS.

## Commit

`21e7828e`

## Risks and follow-ups

Exact-merge packaged verification must still install the merged build and prove Start, public-mode doctor, missing/wrong bearer rejection, valid MCP initialize, expected project identity/tool policy, session close, and restart/autostart behavior.

## Verification handoff

Use the exact GitHub merge SHA in a detached worktree, run the commands above plus `npm run dist`, install that artifact, then exercise the configured Kanmer remote through the production renderer/preload/main path.
