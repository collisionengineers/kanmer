# Files — CORE-084

## Modify

| Path | Responsibility |
|---|---|
| `apps/gui/src/main/index.ts` or its focused test seam | Exercise the real `syncProject` Retry caller without duplicating production logic. |
| `apps/gui/src/main/kanmerGit.test.ts` | Add the mismatch/no-`syncBoard`/no-ref-mutation regression through the production caller. |

## Verify / reuse

- Existing CORE-080 `preflightBoardSync`, `syncProject`, and real-Git fixture helpers.
- CORE-043/CORE-080 scratch and post-implementation evidence for retained-ref and protected-default behavior.

## Do not modify

MCP source transport, GitHub protection or Actions variables, unrelated GUI behavior, board files, or other ticket documents outside Kanmer MCP.
