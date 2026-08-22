# Plan

## Governing docs

- docs/functional/frd/FRD-027-project-declared-sources.md — source transport/cache behavior whose cumulative artifact must ship.
- docs/architecture/adr/ADR-0020-project-declared-source-trust.md — trust and parity constraints; this remediation does not alter them.

## Base and implementation

1. Create the recorded worktree `.worktrees/core-086` and branch `core-086-plugin-artifact-refresh` from exact cumulative CORE-081 head `fcd998550714811edac99032ea7118f9b2084d38`.
2. Take CORE-086 through MCP without force.
3. Run the repository's plugin build on that exact tree and inspect the diff. The only intended tracked change is `plugins/kanmer/mcp/kanmer-mcp.cjs`; do not hand-edit generated output or source behavior.
4. Run source/core preservation checks (26/26 and 303/303 where feasible), plugin parity, MCPB parity, build/typecheck, and diff checks. Preserve each first failure with its exit code; a missing local MCPB CLI is INCONCLUSIVE, not PASS.
5. Write the post-implementation report with exact SHA, generated artifact scope, every rail and limitation. Open a PR targeting `core-026-project-declared-sources` with standalone footer `Kanmer: CORE-086`.
6. Move Implementing→Review only after fresh gates and traceability readback. Independent review/merge and CORE-081 cumulative re-review happen afterward.

## Acceptance

The committed plugin artifact is regenerated from fcd99855, plugin/mcpb parity is demonstrated by authoritative hosted checks or explicitly retained INCONCLUSIVE evidence, no parity assertion is weakened, and the PR diff contains no unrelated source or board changes.
