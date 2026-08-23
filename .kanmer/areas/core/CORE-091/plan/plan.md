# CORE-091 plan

## Governing documents

- `docs/functional/frd/FRD-027-project-declared-sources.md`
- `docs/architecture/adr/ADR-0020-project-declared-source-trust.md`

## Implementation

1. Create the ticket worktree from `origin/main` in a normal checkout and verify the checkout owns its workspace dependencies.
2. Run `npm run plugin:build`; inspect the diff and confirm the only tracked change is `plugins/kanmer/mcp/kanmer-mcp.cjs`.
3. Run `npm run plugin:check`, `npm run mcpb:check`, `npm run test:scripts`, and `git diff --check`. Preserve all existing assertions and record hashes and exit codes in the post-implementation report.
4. Commit the generated artifact, push a PR titled with `CORE-091`, and stop at Review for an independent reviewer.

## Review and verification

- Independent reviewer checks the whole ticket packet, exact PR head, generated-only diff, and parity command outputs; any finding gets a written disposition.
- After merge, verify the exact merge SHA from detached `origin/main`; rerun plugin and MCPB parity checks, then write proof and release the ticket.
- Remove only the exact ticket worktree and branch after proof; do not alter the board worktree or unrelated user changes.

## Acceptance

The committed plugin bytes equal the fresh standalone bytes and the MCPB staging/unpacked server bytes; plugin/tool/skill/manifest checks pass; no source or assertion changes are present; traceability records the implementation and merge commits.
