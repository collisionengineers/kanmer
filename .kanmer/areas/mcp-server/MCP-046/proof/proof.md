---
kind: proof
ticket: MCP-046
result: PASS
merge_commit: 8554c733aac5817e99909622e062d022d6c12be3
pr: "231"
verified_at: 2026-08-23T14:42:00Z
---

## Merged-main verification

Verified in detached worktree `.worktrees/verify-mcp-046` at exact merge commit `8554c733aac5817e99909622e062d022d6c12be3`. The worktree was prepared with `npm ci` and `npm run build` (core and MCP server) before running checks; no tracked files were changed.

| Check | Result |
|---|---|
| `node --test scripts/antigravity-plugin-config.test.mjs scripts/kanmer-mcp-launcher.test.mjs` | PASS — 8/8 |
| `npm test -w @kanmer/gui -- --run src/main/connect.test.ts` | PASS — 35/35 |
| `npm run plugin:check` | PASS — 37 tools, bundle bytes and manifests match |
| `npm run typecheck -w @kanmer/gui` | PASS |
| `npm run test:scripts` | PASS — 98/98 |
| `git diff --check` | PASS |
| PR hosted `kanmer-gate` + `verify` | PASS — run 32642585777 |

The Windows regression reaches a spaced LOCALAPPDATA shim and verifies the provider workspace marker. A second regression executes the shipped installer shim logic with a disposable resolver/child and verifies the final CWD is the provider workspace after the temporary pushd. The real installed Antigravity bound proof returned `KANMER_AGY_FINAL_PUSHDCALL_OK` before merge. Codex remains on its separate quoted launcher contract.

## Explicit residual evidence

The full GUI Vitest rail was attempted earlier and failed with unrelated Windows EPERM cleanup/timeouts in `src/main/index.sync.test.ts` and `src/main/kanmerGit.test.ts`; it is retained as a failed non-authoritative rail. The merged-main focused and script rails above are the checks for this launcher change and all pass.

## Closeout traceability

PR: https://github.com/collisionengineers/kanmer/pull/231
Merged: 2026-08-23T13:36:33Z
Merge commit: `8554c733aac5817e99909622e062d022d6c12be3`
Deployment: n/a (documentation/configuration and launcher contract; no release deployment)
