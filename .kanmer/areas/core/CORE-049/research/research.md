# Research — CORE-049

## Finding

Independent cumulative review of CORE-046 / PR #167 at `0f7ccc4e…` confirms CORE-047 closed the ownership race and inherited source/DNS requirements. One blocker remains: stale-lock quarantine calls the rename seam directly and bypasses the existing bounded retry for Windows EPERM/EBUSY/EACCES. The parent report and board commit list also need cumulative post-child traceability.

## Reuse and scope

Extend the existing `renameWithRetry`/injected rename seam in `packages/core/src/io.ts`; do not create another retry helper. Preserve token markers, double-sweep release, third-claimant protection, inherited source tests and plugin artifact. Update only the CORE-046 report/traceability through MCP and resolve the fixed GitHub thread after evidence.

## Evidence

The review recorded IO18/18, focused core109/109, source14/14, HTTP82/82 and plugin parity PASS. Live Windows crash/PID-reuse/process-termination proof remains INCONCLUSIVE and must stay explicit.

## Questions

No unresolved implementation question; retry bounds and transient error set come from the existing IO helper and governing ADR/FRD contract.
