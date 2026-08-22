---
id: CORE-087
type: ticket
title: Refresh committed MCP plugin artifact after CORE-082 merge
status: implementing
area: core
assignee: codex-core087
profile: fix
stageEntered:
  preparing: '2026-08-22T20:53:24.451Z'
taken_at: '2026-08-22T20:53:36.487Z'
branch: core-087-plugin-artifact-refresh
worktree: .worktrees/core-087
labels:
  - remediation
  - release-artifact
  - plugin-sync
links: []
blocks:
  - CORE-026
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 4fee55cd
prs:
  - '213'
archived: false
created: '2026-08-22T20:52:21.912Z'
updated: '2026-08-22T20:59:47.204Z'
---

The cumulative CORE-026 branch currently carries a committed plugins/kanmer/mcp/kanmer-mcp.cjs artifact generated from a linked worktree, so esbuild module comments use a different relative node_modules depth than a fresh checkout. Hosted npm run verify fails mcpb:check because the server differs from the distributed plugin copy. Refresh the committed artifact from a normal checkout or make the build deterministic, preserve parity checks, and link this remediation to CORE-026. Do not weaken byte-parity assertions.
