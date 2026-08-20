# Files — MCP-019

## Modify

| Path | Exact responsibility |
|---|---|
| `packages/mcp-server/src/index.ts` | Extend the existing `get_ticket_doc` schema with mutually exclusive `doc`/`docs`; preserve the single-call handler/result; validate/dedupe/bound batch input; call one shared multi-read helper; update description without adding a tool. |
| `packages/mcp-server/src/ticket-docs.ts` | Add or extend the shared read helper that resolves a ticket once, validates all document ids through existing store rules, reads requested documents, returns per-document existence/content/version in request order, and is consumable by MCP-023. If the canonical helper lives elsewhere, modify that file rather than duplicating it. |
| `packages/mcp-server/src/smoke.mjs` | Add legacy-single and batch cases, missing docs, ordering/deduplication, invalid combinations, unsafe ids, limit, nested research/scratch, and per-document versions. |
| `packages/mcp-server/src/smoke-protocol.mjs` | Assert raw schema/JSON-RPC compatibility and ordered multi-document result where the high-level client hides schema details. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Update the existing `get_ticket_doc` row/field semantics with the batch form, XOR rule, cap, response shape, non-atomic version semantics, and unchanged tool count. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerate through canonical `plugin:build` from the normal main checkout after source/schema changes. Never hand-edit. |

## Inspect / reuse

| Path | Reason |
|---|---|
| `packages/core/src/store.ts` | Canonical ticket/document read and version calculation. Reuse it; do not reimplement folder layout or hashes. |
| `packages/core/src/paths.ts` / document path helper | Canonical safe document-id-to-path resolution and traversal protection. |
| `packages/core/src/docs.ts` or equivalent | Configured pipeline/nested document identifiers and existence semantics. |
| `packages/core/src/types.ts` | Existing result/item/document types. Add no core type unless genuinely shared. |
| `packages/mcp-server/src/errors.ts` | Canonical coded/error result path after MCP-022; do not invent batch-specific error formatting. |
| `packages/mcp-server/src/root.ts` | Store/root initialization; read-only batch must not add writes. |
| `packages/mcp-server/package.json` | No new dependency should be required. |
| `packages/mcp-server/src/smoke-discovery.mjs` | Confirm tool count remains unchanged and schema discovery includes batch fields. |
| `scripts/verify.mjs` | Ensure standard smokes and plugin check reach the change once. |
| `MCP-023` plan/files | Shared-helper integration requirement; whichever ticket lands second adapts to the existing helper. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | Governing MCP surface; add the batch contract if not already covered by DOC-011. |

## Add only when absent

| Path | Purpose |
|---|---|
| `packages/mcp-server/src/ticket-docs.ts` | Shared pure/read-only helper, only if no canonical document helper exists. |
| `packages/mcp-server/src/ticket-docs.test.ts` | Unit tests with a fake store/resolution counter, only if smoke tests cannot directly prove one ticket resolution and validation ordering. Use the repo's existing test convention. |

## Exact batch contract

- `id`: required ticket id.
- exactly one of `doc` or `docs`.
- `docs`: 1–25 entries.
- trim/reject empty ids; preserve case semantics used by existing ids.
- de-duplicate after validation, preserving first occurrence order.
- validate every id before reading any file.
- single form: exact existing response.
- batch form: `{id, documents:[{doc, exists, content, version}, ...]}` in normalized order.
- known absent doc: normal entry with null content/version according to existing API.
- invalid/unsafe id or I/O failure: canonical whole-call error.
- versions apply to returned bytes; batch is not an atomic snapshot.

## Do not modify

- Add a second `get_ticket_docs` tool.
- Single-call response fields or semantics.
- Core storage layout/version algorithm/path-safety rules.
- Tool count.
- Write APIs or optimistic concurrency semantics.
- Read attachments/folders recursively.
- Introduce locks/transactions.
- Hand-edit bundled plugin bytes.
