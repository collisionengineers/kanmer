---
id: SKILL-020
type: ticket
title: kanmer-plan and kanmer-auto become gates-first
status: done
area: skills
order: 200
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-20T12:39:41.253Z'
  review: '2026-08-20T23:15:09.784Z'
  verifying: '2026-08-20T23:16:33.599Z'
  done: '2026-08-20T23:18:36.058Z'
labels: []
groups:
  - EPIC-009
  - HZN-004
links: []
commits:
  - 96067ad3636d1f181fa0897a36610e19499f4f86
  - 3503c07eedf6a08b7621fcc2ba44f617aa3bba2a
prs:
  - '89'
archived: false
created: '2026-08-20T10:14:56.999Z'
updated: '2026-08-21T13:02:16.815Z'
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

Shipped in [PR #89](https://github.com/collisionengineers/kanmer/pull/89), merged to `main` as `3503c07eedf6a08b7621fcc2ba44f617aa3bba2a` on 2026-08-20. No follow-up tickets or deployment are required; this is a skill/verifier-only change.
