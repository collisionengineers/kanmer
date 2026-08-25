---
id: SKILL-035
type: ticket
title: Retire irrecoverable verification failures without clogging Verifying
status: backlog
area: skills
assignee: ''
profile: fix
labels:
  - workflow
  - verification
  - regression
links: []
refs:
  - docs/functional/frd/FRD-007-fixed-six-stage-board.md
  - docs/functional/frd/FRD-015-ticket-and-board-core.md
archived: false
created: '2026-08-25T11:57:55.187Z'
updated: '2026-08-25T11:57:55.187Z'
---

## Purpose

Kanmer currently instructs every failed or unavailable post-merge check to remain in Verifying forever. When an immutable release attempt fails and a successor ticket owns recovery, the failed ticket remains visually active beside its successor, creating a permanent verification clog and misleading operators about work still capable of reaching Done.

## Acceptance criteria

- The verification workflow distinguishes retryable/inconclusive work from an irrecoverable or superseded failed attempt.
- An irrecoverable failed ticket retains truthful FAIL proof and is retired through Kanmer's existing archive semantics rather than being falsely moved to Done.
- Retirement requires an explicit successor or operator disposition and records the reason durably.
- Auto/closeout guidance handles the terminal failure path without leaving the ticket taken or deleting evidence.
- Regression checks prevent skill guidance from again requiring permanent Verifying residency for superseded failures.
- CORE-103 is reconciled using the shipped path only after this fix is merged and verified.

Links [[CORE-103]] and [[CORE-107]].
