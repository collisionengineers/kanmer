# Proof — MCP-019

## Verified merged state

- PR: https://github.com/collisionengineers/kanmer/pull/87
- GitHub state: `MERGED` at 2026-08-20T23:01:50Z
- Merge commit: `23c42e06be0c2998fbfa3c8aaa201a862f01db1b`
- Verification checkout: normal repository checkout on `main`, fast-forwarded to that merge commit.
- Deployment: not applicable; this is a local MCP/plugin source change and the board has no deployment tracking.

## Commands and results

| Command | Result |
|---|---|
| `npx vitest run src/docs.test.ts` from `packages/core` | PASS — 49/49 tests, including batch order/missing/version/path-validation coverage. |
| `npm run build` | PASS — core and MCP ESM/standalone builds completed. |
| `node packages/mcp-server/src/smoke.mjs` | PASS — 175/175 checks. |
| `npm run smoke:protocol` | PASS — 30/30 raw JSON-RPC checks across supported protocol versions. |
| `npm run smoke:discovery` | PASS — 13/13 discovery checks. |
| `npm run plugin:build` then `npm run plugin:check` | PASS — 30 tools, bundle bytes match the freshly built local artifact, skill frontmatters parse, and isolated handshake succeeds. |
| `git diff --check` after restoring the tracked merged artifact | PASS — clean normal checkout. |

## Scope and accurate deferrals

- [[MCP-023]] remains Preparing and has no implementation. MCP-019 provides `getDocsWithVersions` / `readTicketDocuments`; MCP-023 must consume them when it is implemented. This proof does **not** claim that integration has happened.
- The plan’s legacy-layout/non-ticket and injected-I/O fixture cases remain explicitly deferred in MCP-019’s checklist. They were not silently treated as passing tests.
- Rebuilding the plugin artifact in this pre-existing local npm layout changed only bundled dependency-path comments (nested versus hoisted `js-yaml` paths), leaving the committed CJS artifact dirty despite `plugin:check` passing. The committed merged artifact was restored before final cleanliness verification; this proof records the environment-sensitive build-byte observation rather than claiming a fresh local rebuild was Git-byte-identical.

## Result

Merged MCP-019 behavior is verified on `main`: legacy single reads remain compatible; bounded batch reads, ordering/deduplication, path validation, independent version records, protocol compatibility, discovery, and plugin surface checks all pass.
