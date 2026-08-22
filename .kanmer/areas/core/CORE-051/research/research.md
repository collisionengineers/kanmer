# Research — CORE-051

## Finding

Independent cumulative CORE-045 review confirms the child lock stack is sound but finds three inherited parent defects: `192.0.0/24`, `192.31.196/24`, and `192.52.193/24` predicates reject public exception addresses; `3fff` is matched as `/16` instead of `/20`; and stale-lock recovery can rethrow the original `EEXIST` after a later claim failure has a more actionable error.

## Reuse and scope

Adjust the existing dependency-free classifier predicates and the existing `withExclusiveFileLock` claim-error path in `packages/mcp-server/src/sources.ts` and `packages/core/src/io.ts`; add focused regressions in their existing test files. Preserve all child token/retry behavior, mapped-address handling, and plugin parity. Update CORE-045 report/item and PR-thread evidence through MCP/GitHub.

## Evidence and limits

Current cumulative child rails: IO22/22, combined core113/113, source14/14, typecheck/build/plugin parity PASS. Broad HTTP readiness remains 81/82 and live Windows/DNS evidence remains INCONCLUSIVE.

## Questions

No unresolved implementation question; exact subranges and error semantics are stated in the review finding and governing FRD/ADR.
