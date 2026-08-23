---
id: CORE-086
type: ticket
title: Refresh committed MCP plugin artifact for source-cache remediation
status: done
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T18:46:38.921Z'
  review: '2026-08-22T19:01:20.463Z'
  verifying: '2026-08-22T19:04:43.022Z'
  done: '2026-08-23T00:42:48.362Z'
labels:
  - remediation
  - release-artifact
  - plugin-sync
  - sources
groups:
  - HZN-006
  - HZN-007
links:
  - CORE-081
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 4f96ce20c24f63d92268e4a61899a4e6c67b2459
  - a1a4fe629d71d149b64fd3e57979a196176b875a
prs:
  - '205'
archived: false
created: '2026-08-22T18:42:59.739Z'
updated: '2026-08-23T00:42:48.541Z'
---

Blocking remediation discovered during the fresh cumulative CORE-081 review at exact target head fcd998550714811edac99032ea7118f9b2084d38 (CORE-081 13b6ce22 plus CORE-085 b2c51779 merged as fcd99855). Hosted PR #163 verify run 32591279782 fails mcpb:check because the built MCPB server differs from the committed plugins/kanmer/mcp/kanmer-mcp.cjs artifact after the source transport/cache changes. Regenerate the committed plugin artifact from this exact cumulative tree, preserve the 26/26 source and 303/303 core evidence, and rerun plugin/mcpb/authoritative rails. Local mcpb CLI is unavailable and remains INCONCLUSIVE; do not weaken parity assertions. This ticket is linked to and blocks [[CORE-081]].
