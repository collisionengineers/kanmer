# Files — CORE-051

| Area | Files | Change |
|---|---|---|
| Source policy | `packages/mcp-server/src/sources.ts`, `packages/mcp-server/src/sources.test.mjs` | Narrow IPv4 special-use subranges and correct `3fff::/20`, retaining public exceptions and existing mapped tests. |
| Lock errors | `packages/core/src/io.ts`, `packages/core/src/io.test.ts` | Preserve the actionable post-recovery claim error and add deterministic regression. |
| Artifact/traceability | `plugins/kanmer/mcp/kanmer-mcp.cjs`; CORE-045 report/item and PR #166 threads | Regenerate parity artifact and record cumulative evidence. |

Out of scope: new source kinds, transport/provider changes, or live external claims.
