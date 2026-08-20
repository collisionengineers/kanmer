# Files — CORE-029

| Path | Change |
|---|---|
| `AGENTS.md` | Correct the §4 workflow to six fixed stages and profile-resolved gates; preserve the managed block exactly. |
| `scripts/verify-skill-prose.mjs` | Include the repository AGENTS.md in the existing stage-name audit so this stale contract cannot recur. |
| `packages/core/src/stages.ts` | Read-only authority for the six fixed stage model. |
| `packages/core/src/store.ts` | Read-only authority that format 3 removed the v2 final-stage configurability guard. |
| `docs/architecture/adr/ADR-0002-fixed-six-stages.md` | Governing context; no update required. |

No board, MCP, GUI, or bundle behavior changes are in scope.
