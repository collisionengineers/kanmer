---
id: CORE-047
type: ticket
title: 'CORE-046 review remediation: close replacement-lock quarantine race'
status: done
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T10:55:28.120Z'
  review: '2026-08-22T11:05:01.163Z'
  verifying: '2026-08-22T11:24:28.484Z'
  done: '2026-08-22T17:27:49.368Z'
labels:
  - pr-review
  - security
  - concurrency
groups:
  - HZN-007
links:
  - CORE-046
blocks:
  - CORE-046
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 47169144c0bd13bd205e42922c0282bfd56c466a
  - 67e2be792e8480d29df7ff13128fb8c7886056a9
prs:
  - '169'
archived: false
created: '2026-08-22T10:55:20.407Z'
updated: '2026-08-22T23:53:30.202Z'
---

Independent review of CORE-046 / PR #167 found one remaining blocker before CORE-046 can merge:\n\n- F-003: recoverStaleLock rechecks the stale inode and then calls fs.rename separately. In the reversed ordering, reclaimer B can quarantine/remove the stale inode, claim and recreate the original path, and reclaimer A can then rename B's fresh replacement into A's quarantine. Add an ownership-safe atomic quarantine protocol that cannot move a replacement lock after the inspected identity changes, plus a deterministic reversed-order concurrent regression. Preserve all inherited IO assertions and the existing forward-order race test.\n\nStack on CORE-046 head 54651a3c77b8ca8d02d9d309e36baf9b62ebca3c. CORE-046 and CORE-045 remain blocked until this ticket is independently reviewed and dispositioned. No unrelated source/editor/provider work.\n\n## Outcome\n\nPR #169 merged at `0f7ccc4efad0aeae2295f3ba08e0b6e886356679`. Verification on the exact cumulative CORE-044 branch passed IO 25/25, source 14/14, core typecheck/build, and diff-check. Hosted proof and genuine multi-process Windows crash/PID evidence remain INCONCLUSIVE.
