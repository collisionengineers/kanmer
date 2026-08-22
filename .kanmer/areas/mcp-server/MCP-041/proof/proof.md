# Proof — MCP-041

## Merged result

Verified on merged main at 8a9eee57e1779f83f30504851e1bff0bf167247a (PR #145, merged 2026-08-22T01:59:36Z). The original MCP-041 implementation commit 99d3f259639a50d0319a136816cd088e3df2da2a is reachable from main (git merge-base --is-ancestor exit 0); the stacked commits aac1e252 and 72da8d076 are also reachable (exit 0). The shipped change remains limited to deterministic synchronization in packages/mcp-server/src/tunnels/supervisor.test.mjs; supervisor production retry/stop behavior is unchanged.

## Commands and results on merged main

- git rev-parse main: 8a9eee57e1779f83f30504851e1bff0bf167247a (exit 0).
- npm run build -w @kanmer/mcp-server: exit 0; ESM and standalone CJS builds completed.
- node --test packages/mcp-server/src/tunnels/supervisor.test.mjs: exit 0; 7 tests passed, 0 failed.
- npm run test:http -w @kanmer/mcp-server: exit 0; 61 tests passed, 0 failed, including the supervisor suite.
- npm run typecheck -w @kanmer/mcp-server: exit 0.
- git diff --check: exit 0.

## Hosted verification evidence

PR #145 is MERGED. The transient first attempt is preserved: run 32544808992 attempt 1, verify job 96961297681, failed during the npm ci phase with ECONNRESET/EPERM cleanup; no MCP-041 test result was inferred from that infrastructure failure. The rerun is the authoritative successful result: run 32544808992 attempt 2, verify job 96961421442, completed successfully in 2m17s; checkout, Node setup, and npm run verify all passed.

No MCPB packaging, provider authentication, tunnel-host, or remote-client acceptance claim is made by this proof; those are outside MCP-041. The earlier local/transient package and shared-verify failures remain preserved in the post-implementation report and checklist.

## Outcome

MCP-041's merged test-only retry synchronization is verified green on main and the required hosted rerun is green. No follow-up is required for this ticket; unrelated infrastructure evidence remains historical rather than absorbed into scope.
