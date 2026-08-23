---
id: CORE-085
type: ticket
title: 'CORE-081 review: scope redirect validators and preserve forced refresh'
status: done
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T18:24:05.499Z'
  review: '2026-08-22T18:33:36.844Z'
  verifying: '2026-08-22T18:37:48.432Z'
  done: '2026-08-23T00:42:47.689Z'
labels:
  - remediation
  - review
  - sources
  - cache
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
  - b2c51779a4ee0a5d95c8b3bce51cd4408490dc68
  - fcd998550714811edac99032ea7118f9b2084d38
prs:
  - '204'
archived: false
created: '2026-08-22T18:23:49.464Z'
updated: '2026-08-23T00:42:47.884Z'
---

Blocking remediation from automated review of CORE-081 PR #202 at head 13b6ce22a8363c0f467e96c775eb9a09891b7bb2. Resolve #3836700730: scope cached validators to the final same-origin redirect target so intermediate redirects cannot return a misleading 304; and #3836700726: preserve force semantics when joining an active refresh so a concurrent forced fetch cannot silently return an ordinary fresh-cache result. Add deterministic regressions, preserve the seven CORE-081 findings and exact failed/INCONCLUSIVE evidence, and update the cumulative CORE-026 packet. This ticket is linked to and blocks [[CORE-081]].
