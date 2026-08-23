---
id: CORE-087
type: ticket
title: Refresh committed MCP plugin artifact after CORE-082 merge
status: done
area: core
assignee: codex-core087
profile: fix
stageEntered:
  preparing: '2026-08-22T20:53:24.451Z'
  review: '2026-08-22T21:08:57.940Z'
  verifying: '2026-08-22T21:09:12.527Z'
  done: '2026-08-23T00:42:48.972Z'
labels:
  - remediation
  - release-artifact
  - plugin-sync
links: []
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 4fee55cd
  - 453a92091d7a422a237996f024ab6940ea6fccfb
prs:
  - '213'
archived: false
created: '2026-08-22T20:52:21.912Z'
updated: '2026-08-23T00:42:48.972Z'
---

The cumulative CORE-026 branch currently carries a committed plugins/kanmer/mcp/kanmer-mcp.cjs artifact generated from a linked worktree, so esbuild module comments use a different relative node_modules depth than a fresh checkout. Hosted npm run verify fails mcpb:check because the server differs from the distributed plugin copy. Refresh the committed artifact from a normal checkout or make the build deterministic, preserve parity checks, and link this remediation to CORE-026. Do not weaken byte-parity assertions.
