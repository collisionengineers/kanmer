---
id: SKILL-033
type: ticket
title: Clarify independent review when agents share a GitHub account
status: review
area: skills
order: 10
assignee: codex-skill-033
profile: chore
stageEntered:
  preparing: '2026-08-24T18:01:44.084Z'
  review: '2026-08-24T18:10:23.085Z'
taken_at: '2026-08-24T18:02:17.256Z'
branch: SKILL-033-review-agent-credentials
worktree: .worktrees/skill-033
labels:
  - workflow
  - review
  - governance
groups:
  - HZN-007
links: []
commits:
  - 6c4432f
prs:
  - '243'
archived: false
created: '2026-08-24T18:01:37.214Z'
updated: '2026-08-24T18:10:23.085Z'
---

## What
Make the Kanmer review workflow explicit that independent-review separation is between agent roles, not GitHub credentials: a distinct reviewing agent may review and merge after a pass even when all agents use the same repository account.

## Why
The existing rule correctly prohibits author self-review and self-merge, but its lack of an explicit shared-credential statement led to an unsupported different-account interpretation during DOC-021 release work.

## Verification
- the review skill and repository contributor guidance consistently state the agent-role boundary;
- no text claims a separate GitHub identity is required unless GitHub itself enforces one;
- relevant prose checks and the full project verification rail pass;
- the change receives independent review and merges through the normal PR flow.

## Outcome
