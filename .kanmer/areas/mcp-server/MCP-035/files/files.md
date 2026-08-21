# Files — MCP-035

| Path | Change | Risk |
|---|---|---|
| packages/core/src/store.ts | Validate all getDocsWithVersions paths before the legacy early return; reuse computed v2 paths. | Narrow control-flow change; must preserve legacy missing records and v2 ordering/version semantics. |
| packages/core/src/store.test.ts | Extend the existing format-1 fixture with invalid-ID rejection and safe-missing assertions. | Regression fixture must prove no partial batch result and retain legacy compatibility. |

## Context files

| Path | Why read it |
|---|---|
| packages/core/src/docpaths.ts | Canonical document-path validation and bare-type mapping; do not duplicate its rules. |
| packages/core/src/docs.test.ts | Existing v3 batch ordering, version, missing-entry, and traversal expectations. |
| packages/mcp-server/src/ticket-docs.ts | Shared MCP single/batch delegation; confirms no MCP handler change is needed. |
| packages/mcp-server/src/index.ts | Public get_ticket_doc single/batch contract and XOR form validation. |
| packages/mcp-server/src/smoke.mjs | Full stdio behavior checks for single/batch and invalid requests. |
| packages/mcp-server/src/smoke-protocol.mjs | Raw protocol compatibility checks for the same public tool. |
| docs/functional/frd/FRD-022-mcp-server-surface.md | Governing MCP inventory, honest read semantics, and full-surface smoke acceptance. |
| MCP-019 scratch/independent-review | Independent P2 finding and exact legacy reproduction being remediated. |

## Out of scope

No new document API, no migration behavior changes, no changes to getDoc/writes, no MCP schema/handler changes, and no MCP-023/025/036/037 work.
