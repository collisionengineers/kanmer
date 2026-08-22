---
id: CORE-085
type: ticket
title: 'CORE-081 review: scope redirect validators and preserve forced refresh'
status: preparing
area: core
assignee: ''
profile: fix
stageEntered:
  preparing: '2026-08-22T18:24:05.499Z'
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
blocks:
  - CORE-081
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-22T18:23:49.464Z'
updated: '2026-08-22T18:24:05.499Z'
---

Blocking remediation from automated review of CORE-081 PR #202 at head 13b6ce22a8363c0f467e96c775eb9a09891b7bb2. Resolve #3836700730: scope cached validators to the final same-origin redirect target so intermediate redirects cannot return a misleading 304; and #3836700726: preserve force semantics when joining an active refresh so a concurrent forced fetch cannot silently return an ordinary fresh-cache result. Add deterministic regressions, preserve the seven CORE-081 findings and exact failed/INCONCLUSIVE evidence, and update the cumulative CORE-026 packet. This ticket is linked to and blocks [[CORE-081]].
