# Proof — MCP-018

## Merged target

- Verified on the normal source checkout at merged `main` commit `b210198f76421763b57fdf22b7c45e15739d662c`.
- PR [#83](https://github.com/collisionengineers/kanmer/pull/83) is `MERGED` (2026-08-20T22:41:12Z).

## Verification evidence

| Command | Result |
|---|---|
| `npm run build` | PASS — rebuilt core and MCP server, including standalone bundle. |
| `npm run plugin:check` | PASS — 30 tools, committed bundle bytes match a fresh build, 12 skill frontmatters parse, and the copied isolated payload completes an MCP handshake listing 30 tools. |
| `node --test scripts/plugin-isolation.test.mjs` | PASS — 4/4: real isolated payload at a path with spaces, external-only dependency refusal, missing manifest-selected entry failure, and timeout cleanup. |
| `npm run test:scripts` | PASS — 54/54, including all four isolation regressions and document-numbering/release-script suites. |
| `node packages/mcp-server/src/smoke.mjs` | PASS — 163/163. |
| `npm run smoke:protocol` | PASS — 26/26 across four protocol versions and per-request client identity. |
| `npm run verify:skills` | PASS — all skill-prose checks. |
| `git diff --check && git status --short` | PASS — no output. |

## Known repository condition

`npm run typecheck` still fails only in unchanged `packages/ui/src/demo.tsx`: its `getTicketDocsInfo` stub omits required `TicketDocsInfo.documentPaths`. Core, MCP server, and GUI typechecks complete. `npm run verify` is not present on the merged root package yet; [[CORE-031]] owns that shared rail.

The shipped check now proves resolution isolation rather than rejecting a worktree by pathname; no regression was observed on merged main.
