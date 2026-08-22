---
id: CORE-081
type: ticket
title: 'CORE-026 review: harden remaining source transport and cache lifecycle'
status: review
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T18:05:02.712Z'
  review: '2026-08-22T18:16:48.945Z'
taken_at: '2026-08-22T18:06:10.537Z'
branch: core-081-source-transport-cache-lifecycle
worktree: .worktrees/core-081
labels:
  - remediation
  - review
  - sources
groups:
  - HZN-006
  - HZN-007
links:
  - CORE-026
blocks:
  - CORE-026
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 13b6ce22a8363c0f467e96c775eb9a09891b7bb2
prs:
  - '202'
archived: false
created: '2026-08-22T18:00:07.452Z'
updated: '2026-08-22T18:16:48.945Z'
---

Blocking remediation from the current-head audit of PR #163 (3a05ab7a21f55152a4f493169300ac9e622baab7). Resolve the newest valid inline findings #3836536172 (preserve validators across same-origin manifest redirects), #3836536170 (cancel response bodies on every early-abandon path), #3836536166 (wait/reuse an active refresh beyond the 2.1-second lock retry window), #3836536177 (request identity encoding or decode Content-Encoding), #3836612410 (charge partial body-read failures against the aggregate byte budget), #3836612417 (stop collecting Markdown links at the 32-page cap), and #3836612420 (surface uncached linked-page 304 instead of caching an empty document). Add deterministic regressions, preserve exact failed/INCONCLUSIVE evidence, and update the cumulative CORE-026 packet. This ticket is linked to and blocks [[CORE-026]].
