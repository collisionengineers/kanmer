---
id: SKILL-020
type: ticket
title: kanmer-plan and kanmer-auto become gates-first
status: implementing
area: skills
order: 160
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-20T12:39:41.253Z'
taken_at: '2026-08-20T23:10:13.846Z'
branch: skill-020-gates-first-routing
worktree: .worktrees/skill-020
labels: []
groups:
  - EPIC-009
  - HZN-004
links: []
archived: false
created: '2026-08-20T10:14:56.999Z'
updated: '2026-08-20T23:10:13.846Z'
---

## What
kanmer-plan: delete the unconditional "research and files must exist" demand (it contradicts the skill's own gates-first preamble); fetch them only when the resolved profile requires them or a material hole is obvious; the default human hand-off is an approval paragraph. kanmer-auto: delete Wave 0 "research everything in parallel"; Wave 0 becomes `get_doc_gates` per ticket, then only the next required phase for each.

## Why
both defects are verbatim on main and drive exactly the universal-pipeline behavior profiles exist to prevent.

## Approach
keep lane cap ~3, keep the board-worktree invariant. Add a `verify-skill-prose.mjs` rail asserting the deleted phrase does not return. Skill-only PR — no plugin bundle rebuild.

## Verification
- [ ] `npm run verify:skills` green including the new rail.

## Outcome
