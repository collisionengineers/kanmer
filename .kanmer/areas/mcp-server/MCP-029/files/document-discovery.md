# Files — MCP-029

## Expected source changes

| Path | Change / risk |
|---|---|
| `packages/core/src/docpaths.ts` | Expose a safe, deterministic recursive document-path listing. Preserve path validation and exclude non-Markdown files from typed document inventory. |
| `packages/core/src/store.ts` | Return the listing alongside existing counts from one ticket-folder resolution; do not alter explicit read/version behavior. |
| `packages/core/src/types.ts` | Extend the ticket-document info type if path inventory belongs in the existing response. |
| `packages/mcp-server/src/index.ts` | Surface discoverable relative paths through the selected read response without changing existing scalar read semantics. |
| `packages/core/src/docs.test.ts` | Cover nested paths, stable ordering, empty folders, and non-Markdown/exempt-file behavior. |
| `packages/mcp-server/src/smoke.mjs` / protocol coverage | Reproduce GUI-102’s named-only research case and assert a caller can discover then read it. |
| Canonical tool reference and plugin bundle | Update MCP contract prose and generated shipped bundle if the response surface changes. |
| `docs/functional/frd/FRD-003-ticket-documents.md` | Amend only if implementation reveals the current “index or listing” wording needs a precise wire contract. |

## Context files

| Path | Why it matters |
|---|---|
| `packages/core/src/docpaths.ts` | Defines format-3 containment and safe paths. |
| `packages/core/src/store.ts` | Owns ticket directory resolution and document metadata. |
| `packages/mcp-server/src/index.ts` | Owns public MCP schemas and result shape. |
| `packages/mcp-server/src/smoke.mjs` | End-to-end protocol regression harness. |
| `docs/functional/frd/FRD-003-ticket-documents.md` | Governing behavior for folder documents. |
| `MCP-019` plan/research | Prevent overlapping batch-read design. |

## Out of scope

- Changing which documents satisfy gates.
- Filesystem access outside the ticket folder.
- Returning all document content or attachments in an inventory response.
- Replacing MCP-019’s batch-read contract.
