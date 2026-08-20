# Files — MCP-022

## Add

| Path | Required change |
|---|---|
| `packages/mcp-server/src/project-identity.ts` | Canonicalize roots, build the exact `{boardRoot, format, repoRoot}` JSON payload, SHA-256 it, prefix `kanmer-proj-v1:`, and return the status project block. Pure except for crypto/path built-ins. |
| `packages/mcp-server/src/errors.ts` | Define `KanmerError`, exact three-code union, existing-error classifier, and `failCoded`/error-result construction while preserving text wording. |

## Modify

| Path | Required change |
|---|---|
| `packages/mcp-server/src/index.ts` | Import helpers; replace `fail`/error handling with the single coded builder where applicable; add `withProject()`; declare `expected_project` on all 18 write schemas; special-case `create_items` at call level; strip token before handlers/store; compare before `ensureInit()`; add `get_status.project` and `compat.expectedProject: "optional"`; update tool descriptions. |
| `packages/mcp-server/src/smoke.mjs` | Assert deterministic project token/status fields; old-client writes; correct-token writes; wrong-token zero-byte/no-init refusal; call-level `create_items`; `migrate_board`; and `structuredContent.error.code` for wrong project, stale revision, and gate refusal while text remains compatible. |
| `packages/mcp-server/src/smoke-protocol.mjs` | Inspect raw tool result shape if the SDK helper does not expose `structuredContent` reliably; assert coded error survives JSON-RPC serialization. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated bundled server from the normal main checkout. |
| `plugins/kanmer/tool-reference.md` | Update existing write-tool field semantics and `get_status` response/compatibility documentation; no tool row/count change. Place field semantics in the existing section, not duplicated per row. |

## Inspect / consider

| Path | Reason |
|---|---|
| `packages/core/src/frontmatter.ts` | Unknown item keys are preserved; demonstrates why transport metadata must be stripped. Do not change this intentional behaviour. |
| `packages/core/src/store.ts` | Conflict and gate message wording is load-bearing. Do not rewrite core errors merely to add codes. |
| `packages/core/src/paths.ts` | Root resolution semantics; use already-resolved `projectRoot`/`repoRoot`. |
| `packages/mcp-server/src/root.ts` | Board/repo root inputs and sources. Do not hash `rootSource` or `repoRootSource`. |
| `packages/mcp-server/src/identity.ts` | Existing SHA-256 coding style and non-throwing identity precedent. |
| `packages/mcp-server/src/bundled.ts` | Build context only; no project token belongs here. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | Governing delta will be written by DOC-011; keep `docs_todo` until linked. |
| `MASTERPLAN.md` S-05 / Appendix A | Exact payload/key order, compatibility and plumbing constraints. |

## Write-tool inventory to cover

`create_group`, `update_group`, `set_group_doc`, `create_item`, `create_items`, `update_item`, `move_item`, `take_ticket`, `set_ticket_doc`, `append_scratch`, `link_doc`, `link_items`, `add_column`, `update_column`, `remove_column`, `reorder_columns`, `migrate_board`, `delete_item`.

## Ripple effects

- MCP-023 consumes the status project block and structured `GATE_BLOCKED` shape.
- Updated skills must sniff `compat.expectedProject`; old clients continue omitting the field.
- Any missed schema silently strips the token; any missed destructure may persist it. Tests must inventory every write registration.
- Tool surface metadata and bundled bytes change even though tool count does not.

## Do not modify

- Core frontmatter preservation, gate semantics, or conflict text.
- Make `expected_project` mandatory.
- Put the token inside `create_items.items[]` or `createFields`.
- Hash board source, server identity, actor, branch, or current cwd.
- Add error codes beyond the exact three.
- Add new tools, dependencies, project UUID files, or portable repository IDs.
