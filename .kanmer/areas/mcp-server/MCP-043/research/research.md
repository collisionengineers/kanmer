# Research — MCP-043: refresh the committed plugin artifact after remote-access changes

## Question

What is the authoritative source for the shipped MCP plugin artifact after MCP-028, and what bounded change is needed for the repository's byte-parity rails to pass without changing MCP behavior?

## Findings

- The ticket links MCP-028 (remote-access integration) and MCP-042 (the preceding dispatch-stack artifact refresh); both establish that the committed plugin must be generated, never hand-edited.
- package.json defines plugin:build as npm run build followed by node scripts/build-plugin.mjs; scripts/build-plugin.mjs copies only packages/mcp-server/dist/standalone/kanmer-mcp.cjs to plugins/kanmer/mcp/kanmer-mcp.cjs.
- packages/mcp-server/tsup.standalone.config.ts is the canonical byte-producing configuration: it bundles the server/core dependencies into a standalone CJS file with no sourcemap, and documents that the output is hashed by plugin:check.
- scripts/check-plugin-sync.mjs compares the committed plugin bytes against the fresh standalone build and also verifies the tool/manifest/handshake contract. scripts/check-mcpb-sync.mjs compares the fresh MCPB server bytes against both the fresh standalone build and the committed plugin copy.
- Merged origin/main is b6c8eb02a82d8180b965094c4956109d4646e60b, which contains the MCP-028 remote-access changes. Its committed plugin copy hashes to da83351d64612d365ad3a9a48e2adb4bb43c54e1c0bc905ef75dfd2efcfe9fb1; a fresh hash will be established on the dedicated branch after the canonical build.
- The local checkout is dirty with unrelated parent-agent files and is behind origin/main; implementation must start from a clean dedicated worktree based on origin/main and must not absorb those changes.
- FRD-022 R5c/R6 and ADR-0016 require deterministic compiled artifacts, byte parity, and the existing plugin/MCPB checks. No source, GUI, board, provider, or remote behavior change is required.

## Implications

The implementation is a one-file generated-artifact refresh. The canonical build/copy command is the only write path; hand-editing bytes or changing checker/source behavior would violate the ticket. Verification must prove the diff is limited to plugins/kanmer/mcp/kanmer-mcp.cjs, fresh plugin/MCPB parity passes, and the MCP smoke/typecheck/script rails remain green.

## Open questions

None for this bounded remediation. The hosted rerun remains an independent CI/review concern and will be recorded without fabrication if unavailable.
