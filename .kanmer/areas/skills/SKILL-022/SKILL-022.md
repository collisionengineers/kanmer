---
id: SKILL-022
type: ticket
title: >-
  Templates: approval contract, execution brief with stop condition, group
  context
status: implementing
area: skills
order: 180
assignee: codex-mcp-client
profile: chore
stageEntered:
  preparing: '2026-08-20T12:49:11.464Z'
taken_at: '2026-08-20T22:50:37.086Z'
branch: skill-022-template-contracts
worktree: .worktrees/skill-022
labels: []
groups:
  - EPIC-009
  - HZN-004
links: []
archived: false
created: '2026-08-20T10:14:57.026Z'
updated: '2026-08-20T22:50:37.086Z'
---

## What
`kanmer-plan/assets/approval-contract.md` (Outcome / Why / User or operational effect / In scope / Out of scope / Key decisions / Main risks / Breakdown / Evidence / Approval boundary — 300–600 words as guidance, never a gate); update `plan-template.md` to the brief shape (Objective / Starting state / Required changes / Expected files / Do not modify / Constraints / Ordered steps / Acceptance checks / Commands / Failure and deviation rules / **Stop condition**) plus an advisory warning when Required changes contains *investigate/decide/choose/determine*; `kanmer-tickets/assets/group-context.md` (Feature outcome / Users affected / Acceptance criteria / Non-goals / Shared decisions / Constraints / Risks / Dependency map / Rollout & rollback / Breakdown / Definition of done). Brief acceptance-check boilerplate includes the canon's prove-rules: *name the production caller; runtime deps ship in the artifact; schema change + grants ride this diff (when applicable)*.

## Verification
- [ ] templates render
- [ ] kanmer-plan references them
- [ ] `[pre-review]`/`[post-merge]` tags documented as labels the gates ignore.

## Outcome
