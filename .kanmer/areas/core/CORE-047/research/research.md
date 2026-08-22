# Research — CORE-047

## Scope

CORE-046’s independent review reproduced a reversed-order stale-lock reclaim race. The current implementation checks the stale inode and then renames the original path; another reclaimer can win that rename, claim the original path, and be displaced by the first reclaimer’s later rename. The fix must make ownership of the inspected inode explicit and must preserve existing lock semantics and tests.

## Evidence read

- CORE-046 packet, PR #167 head `54651a3c77b8ca8d02d9d309e36baf9b62ebca3c`.
- CORE-046 independent review `scratch/review` (gui099-executor, NEEDS-CHANGES F-003).
- HZN-007 `context.md` and current automation run.
- FRD-027 and ADR-0020 governing project-declared source trust and bounded concurrency/cache behavior.
- `packages/core/src/io.ts` and `io.test.ts`, including inherited atomic-write/rename assertions and the forward-order stale-lock race regression.

## Required outcome

Use an ownership-safe atomic quarantine protocol that cannot move a fresh replacement after the inspected identity changes. Add a deterministic reversed-order concurrent regression, rerun focused IO and workspace rails, and stop at Review for an independent attestation. No source/editor/provider work belongs in this ticket.

## Parked external limits

PID reuse, process termination between inspection and reclaim, crash timing, and genuine multi-process Windows stress remain external evidence boundaries; do not claim them from deterministic tests.
