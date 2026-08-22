# Plan — MCP-042: Refresh committed plugin artifact after latest MCP server changes

## Objective

Restore the repository invariant enforced by mcpb:check: the committed plugins/kanmer/mcp/kanmer-mcp.cjs must match the canonical standalone MCP build after the recent merged MCP changes. This is a release-artifact remediation only; it does not change GUI-075/GUI-110 behavior or MCP source behavior.

## Approach

1. Work in the dedicated MCP-042 worktree/branch recorded by Kanmer.
2. Run the documented canonical build/copy path (npm run plugin:build) from a clean checkout.
3. Confirm the only source diff is the committed plugin artifact and inspect git diff --check.
4. Run npm run mcpb:check, npm run plugin:check, the MCP smoke/protocol checks, and relevant typecheck/build commands. Preserve any environment-only failure with an explicit disposition.
5. Commit, push, open a PR, and stop at Review for independent review; do not merge.

## Governing docs

- ADR-0016 — compiled workflow and committed artifact parity.
- FRD-022 — MCP server surface and shipped bundle expectations.

## Acceptance

- Fresh canonical build and committed plugin bundle have identical SHA-256 bytes.
- npm run mcpb:check and npm run plugin:check pass.
- No GUI/source behavior changes are included.
- Hosted verify can pass the artifact leg for the stacked GUI PR.

## Stop condition

Stop when the narrow artifact diff is committed, independently reviewable, and all deterministic checks have exit code 0; do not merge or clean up the worktree.
