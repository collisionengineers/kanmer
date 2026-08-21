# Post-implementation report — MCP-023

## Summary

Implemented the read-only `get_execution_packet` entry point and the shared recursive ticket-document inventory it consumes. The packet returns a bounded feature/chore execution brief or a normal deterministic `ready: false` refusal with `code: GATE_BLOCKED`.

## Implementation

- Added `KanmerStore.listTicketDocsWithVersions`, reusing the existing `docpaths` inventory and `getDocsWithVersions` batch API. Paths are sorted POSIX Markdown paths with exact content-version hashes; legacy layouts return `null`, and no writes occur.
- Added `packages/mcp-server/src/execution-packet.ts` with explicit ready/refusal types, profile-resolved gate handling, refusal precedence, occupancy rules, ordered group contexts, fixed index documents, extra path/version listings, ATX section parsing, and exact fallbacks.
- Registered `get_execution_packet` as a read-only MCP tool using the existing actor and project-identity helpers. It does not call the write wrapper, take a ticket, move a stage, initialize a board, create a worktree, or append activity.
- Added smoke coverage for ready feature, plan-only chore, missing ticket, spike dominance, missing-doc-before-question ordering, unresolved questions, occupancy, versions/extras, group context, parser output, and byte-for-byte read-only behavior.
- Updated the canonical tool reference, explicit tool counts, generated manual, and generated plugin bundle.

## Verification

All commands were run from `.worktrees/mcp-023` on branch `mcp-023-execution-packet`.

| Command | Result |
|---|---|
| `npm test --workspace @kanmer/core -- --run` (focused inventory retry) | PASS — focused inventory test |
| `npm test --workspace @kanmer/core -- --run` (full) | PASS on rerun — 259/259 |
| `npm run typecheck` | PASS — core, mcp-server, ui, gui |
| `npm run build` | PASS — core, server ESM and standalone bundles |
| `node packages/mcp-server/src/smoke.mjs` | PASS — 214/214 |
| `npm run smoke:protocol` | PASS — 42/42 |
| `npm run smoke:discovery` | PASS — 13/13 |
| `npm run plugin:build` | PASS — copied generated `kanmer-mcp.cjs` |
| `npm run plugin:check` | PASS — 31 tools, bundle bytes, manifests, handshake |
| `npm run check:manual` | PASS — 22 chapters current |
| `git diff --check` | PASS |
| `npm test` | PASS — core 259, GUI 351, HTTP/remote 61, scripts 79 |

The first full-core attempt recorded an incomplete fixture setup (the test's temporary `reference/` directory was not created) and a transient existing order-test timeout; the fixture was corrected and the full rerun passed 259/259. No failure was deleted or hidden.

## Traceability and scope

The production caller is `packages/mcp-server/src/index.ts` → `getExecutionPacket` → the shared core document APIs. No MCP-020/021/025 work, provider/HTTP work, external-host proof, or unrelated feature was added. `docs_todo` remains governed by the existing ticket refs; the PR is ready for independent review and merge.

The implementation is committed as `2cdd0c68` and published in PR #135 (`Kanmer: MCP-023`, `mcp-023-execution-packet`). The PR-opening checklist item is now satisfied; the checklist is 44/44. The ticket remains in Review for independent review and merge; this author lane did not merge or clean up the branch/worktree.
