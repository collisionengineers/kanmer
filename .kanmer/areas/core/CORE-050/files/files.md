# Files — CORE-050

| Area | Files | Change |
|---|---|---|
| Core IO | `packages/core/src/io.ts`, `packages/core/src/io.test.ts` | Revalidate ownership on every retry, validate persisted tokens, retain active replacements, and surface cleanup failures. |
| Artifact | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerate and parity-check after source changes. |
| Review traceability | PR #167 threads and CORE-046/049 report through MCP/GitHub | Record evidence and resolve fixed findings. |

Out of scope: transport/source-fetch behavior, unrelated GUI/provider work, or live Windows crash claims.
