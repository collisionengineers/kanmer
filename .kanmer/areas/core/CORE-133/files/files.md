# Files — CORE-133

Revalidate this surface against the exact CORE-127 merge before implementation. A path outside the list requires a versioned files/plan correction.

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/reconciliation.ts` | Exact recoverable workspace/identity predicate and one PASS/FAIL merge-SHA guard |
| Modify | `packages/core/src/reconciliation.test.ts` | Pure recovery/refusal matrix and stale/current FAIL routes |
| Modify | `packages/mcp-server/src/reconciliation.test.mjs` | Collector/apply end-to-end missing/unrecorded recovery and stale-FAIL byte preservation |
| Modify | `packages/mcp-server/src/smoke.mjs` | Pin the already-correct reconcile/apply tool-description relationship |
| Regenerate | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Shipped standalone bundle after core/server rebuild |

## Conditional after CORE-127 rebase

Only if the exact CORE-127 merge changes the relevant wiring or regresses the already-fixed text:

- `packages/mcp-server/src/reconciliation.ts` — adapt existing collection/result composition without duplicating CORE-127 logic.
- `packages/mcp-server/src/index.ts` — restore the already-correct description; do not rewrite it otherwise.

## Explicitly outside this ticket

- `packages/core/src/store.ts`, claim/lease mutation semantics and workspace deletion.
- CORE-127 step packets, CORE-129 proof schema, F-016 check-order behavior.
- AGENTS/skills/manual conventions, workflow stages, GUI, release state or dependencies.
