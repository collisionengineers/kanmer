# Files — CORE-049

| Area | Files | Change |
|---|---|---|
| Core IO | `packages/core/src/io.ts`, `packages/core/src/io.test.ts` | Use the existing bounded retry path for stale quarantine renames and add EPERM/EBUSY/EACCES regression coverage. |
| Artifact | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerate if the source bundle changes. |
| Traceability | CORE-046 post-implementation report and item metadata via MCP | Record cumulative child merge head and distinguish inherited/pre-child rails. |
| Review | PR #167 thread disposition | Resolve the code-fixed thread only after evidence is posted. |

Out of scope: new transport behavior, source policy changes, live Windows crash proof, or `.kanmer` filesystem edits.
