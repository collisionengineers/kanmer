# CORE-082 research

## Scope and lineage

CORE-082 is the blocking remediation for the CORE-026 review findings #3836536186, #3836612412, and #3836612414. The implementation must be based on the current cumulative CORE-026 feature branch, not bare main: `origin/core-026-project-declared-sources` at `a1a4fe629d71d149b64fd3e57979a196176b875a` (CORE-081 cumulative head `fcd99855` plus CORE-086 artifact refresh `4f96ce20`). The child PR will target that feature branch and must not merge CORE-026 or main.

## Findings and current contracts

- The shared exclusive file lock in `packages/core/src/io.ts` records a PID/token and already has atomic stale quarantine, owner markers, revalidation, replacement-race handling, retries, and fail-closed behavior for active or uncertain locks. The remaining risk is PID reuse: a live PID alone does not prove that it is the original lock owner.
- Malformed stale lock records currently fail closed along with malformed/fresh/active/uncertain records. CORE-082 must add a deterministic, identity-safe recovery path for a stale malformed record without weakening active-owner protection or swallowing cleanup errors.
- Board synchronization in `apps/gui/src/main/kanmerGit.ts` stages the board's `.kanmer` data. Lock, owner-marker, and stale/quarantine files are operational artifacts and must not be included in Git synchronization. Existing source-cache ignore behavior and tracked-board semantics must remain unchanged.

## Planned evidence and seams

Use deterministic injected process-identity/time and filesystem seams where needed so tests do not claim live Windows PID-reuse proof. The production path must fail closed when owner identity cannot be established, and stale reclamation must atomically quarantine the exact inspected inode before a new claimant proceeds. Tests must retain every inherited IO assertion, add PID-reuse and malformed-stale cases, and exercise Git ignore behavior through the real board sync helper/check-ignore path.

## Files and boundaries

Likely source/test files are `packages/core/src/io.ts`, `packages/core/src/io.test.ts`, `apps/gui/src/main/kanmerGit.ts`, and `apps/gui/src/main/kanmerGit.test.ts`, plus the committed plugin artifact if the core change changes the standalone bundle. Out of scope are source-fetch behavior, MCP-026 resolver changes, provider/tunnel work, unrelated GUI sync changes, and any live Windows multi-process claim beyond deterministic local evidence.

## Governing documents

FRD-027 and ADR-0020 remain the governing sources for project-declared sources and bounded filesystem/network safety. This remediation updates implementation evidence only; it does not change those product or architecture decisions.
