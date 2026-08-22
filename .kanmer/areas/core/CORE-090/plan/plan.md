# Plan

1. Start from the current CORE-026 cumulative head.
2. Run the repository's deterministic artifact build and copy the generated
   standalone MCP bundle into the committed plugin path.
3. Run `npm run mcpb:check`, inspect the exact diff, and commit only the
   generated artifact.
4. Independently review the exact commit, then merge it into CORE-026.

Rollback is the merge revert; no runtime data or schema changes are involved.
