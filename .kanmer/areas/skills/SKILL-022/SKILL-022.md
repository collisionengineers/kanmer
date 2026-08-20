---
id: SKILL-022
type: ticket
title: >-
  Templates: approval contract, execution brief with stop condition, group
  context
status: done
area: skills
order: 180
assignee: codex-mcp-client
profile: chore
stageEntered:
  preparing: '2026-08-20T12:49:11.464Z'
  review: '2026-08-20T22:55:04.804Z'
  verifying: '2026-08-20T22:56:03.612Z'
  done: '2026-08-20T23:00:39.470Z'
labels: []
groups:
  - EPIC-009
  - HZN-004
links: []
commits:
  - d7633b0dbb93845bc09f784b88f36595e2d9fe96
  - 97a9935405c6778970e0e61943e0bf6328aea1c7
prs:
  - '86'
archived: false
created: '2026-08-20T10:14:57.026Z'
updated: '2026-08-20T23:01:49.168Z'
---

## What
`kanmer-plan/assets/approval-contract.md` (Outcome / Why / User or operational effect / In scope / Out of scope / Key decisions / Main risks / Breakdown / Evidence / Approval boundary — 300–600 words as guidance, never a gate); update `plan-template.md` to the brief shape (Objective / Starting state / Required changes / Expected files / Do not modify / Constraints / Ordered steps / Acceptance checks / Commands / Failure and deviation rules / **Stop condition**) plus an advisory warning when Required changes contains *investigate/decide/choose/determine*; `kanmer-tickets/assets/group-context.md` (Feature outcome / Users affected / Acceptance criteria / Non-goals / Shared decisions / Constraints / Risks / Dependency map / Rollout & rollback / Breakdown / Definition of done). Brief acceptance-check boilerplate includes the canon's prove-rules: *name the production caller; runtime deps ship in the artifact; schema change + grants ride this diff (when applicable)*.

## Verification
- [x] templates render
- [x] kanmer-plan references them
- [x] `[pre-review]`/`[post-merge]` tags documented as labels the gates ignore.

## Outcome

Shipped in [PR #86](https://github.com/collisionengineers/kanmer/pull/86) (merged 2026-08-20): approval-contract, bounded execution-brief/checklist, and group-context templates plus deterministic advisory-contract verification. No follow-up ticket is required.
