---
id: CORE-079
type: ticket
title: 'CORE-026 review: normalize Windows board-root path assertions'
status: implementing
area: core
assignee: codex-core079-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T17:01:59.110Z'
  implementing: '2026-08-22T17:04:15.511Z'
taken_at: '2026-08-22T17:04:16.661Z'
branch: core-079-windows-path-identity
worktree: .worktrees/core-079
labels:
  - pr-review
  - core-026
  - hosted-gate
  - automated-review
links:
  - CORE-026
blocks:
  - CORE-026
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - fdecc533
prs:
  - '200'
archived: false
created: '2026-08-22T17:01:33.221Z'
updated: '2026-08-22T17:16:07.884Z'
---

Hosted verify run 32585991850/job 97062323619 failed three apps/gui kanmerGit tests at cumulative CORE-026 head e794cbf7. The implementation returns canonical long temp paths while expectations use Windows 8.3 RUNNER~1 spelling. Normalize board-root assertions through the existing pathIdentity helper and rerun the authoritative verify rail.
