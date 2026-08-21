# Proof — MCP-008

## Merged-main deterministic verification

- PR #130 merged by squash at merge commit 52073fc6521ae25b07d8f4b2c54b6d563f62cc21; implementation commits 9d0c83645835da418ad9041cf8cda428db82d53b, 5b4a95448c2f0f3902d37a72c2727c5cff999de0, and ca104f4526a43f4bd40ce4b54a218b4472c493f2 are reachable from main.
- npm run mcpb:check on merged main — PASS: live 30-tool/2-prompt metadata, schema validation, exact three-file archive round-trip, server/icon/plugin byte checks.
- npm run smoke:headless on merged main — PASS (6/6): isolated standalone server with explicit board root, real create/read write, and no files outside the selected host/board fixture.
- npm run plugin:check — PASS; npm run typecheck — PASS; branch test:scripts — PASS (75/75); git diff --check — PASS.

## Scope and limitation

The MCPB is a Windows-only local stdio package that selects one directory directly containing .kanmer. It does not install skills, open HTTP, create worktrees, or sync Git.

Real Claude Desktop install/read/write/restart/uninstall evidence is INCONCLUSIVE and remains unchecked: no authorized Claude Desktop host is available in this environment. Deterministic MCPB/headless evidence is not presented as that manual proof. The ticket remains Verifying pending the named real-host acceptance.
