---
id: SKILL-012
type: ticket
title: >-
  Raise open questions to the operator before execution, review fixes, and
  closeout
status: preparing
area: skills
assignee: ''
profile: feature
stageEntered:
  preparing: '2026-08-16T16:18:17.167Z'
labels: []
groups:
  - HZN-003
links:
  - SKILL-011
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-009-interrogative-workflow.md
archived: false
created: '2026-08-16T16:11:20.804Z'
updated: '2026-08-16T16:18:17.167Z'
---

## What

Make unresolved open questions a **hard stop** at three points: before a ticket
enters execution, before review fixes are applied, and before a ticket is
closed. No ticket reaches Done with an open question still open.

## Why

Today the rule is soft and stated in only one place. `kanmer-research` says
questions "only the user can answer go to the user **now**", and
`kanmer-plan` says to show the plan if it's contested — but nothing enforces
either. `kanmer-execute`, `kanmer-review` and `kanmer-closeout` never read
`open-questions.md` at all, so a question raised in Preparing can sit
unanswered while code is written on top of a guess, and the ticket can close
with the guess baked in and nobody ever told.

That has already happened on this board: GUI-070's "lose bulk triage, or
rebuild multi-select first?" was raised, surfaced once, and left unanswered
with the ticket still sitting ready to work.

The gap is worse in `kanmer-auto`, which runs unattended by design — §2 parks
tickets whose research surfaces user-only questions, but nothing stops a
question raised *later* (during execute or review) from being answered by the
agent on the operator's behalf.

## Approach

- Add the escalation rule to `kanmer-execute` (before taking the ticket),
  `kanmer-review` (before applying fixes or filing dispositions), and
  `kanmer-closeout` / `kanmer-verify` (before Done). Each reads
  `open-questions.md` and refuses to proceed while anything is unresolved.
- Define what "resolved" means on paper — the answer recorded in the doc with
  who gave it — so the check is mechanical rather than a judgement call.
- Reconcile with FRD-009 R3, the headless rule: with genuinely no operator
  available, dispatch may take the recommended answer, record question +
  assumption, and **stop at the deliverable**. This ticket must not make R3
  unreachable; it makes the interactive path stop instead of guessing, and
  keeps the headless path's "never guess forward across a decision boundary"
  intact.
- Consider whether this should be a gate (`enter-done` requiring
  open-questions resolved) rather than skill prose — prose is advisory and
  this keeps being ignored. Research decides; a gate is a core change and
  costs more than a doc edit.

## Verification

- [ ] A ticket with an unresolved open question cannot be started by
      `kanmer-execute` without the operator answering first.
- [ ] `kanmer-review` refuses to apply fixes while questions are open.
- [ ] Closeout refuses while questions are open, and says which.
- [ ] `kanmer-auto` surfaces mid-run questions to the operator and parks the
      lane rather than answering them itself.
- [ ] The headless path (FRD-009 R3) still works as specified.
- [ ] If implemented as a gate: covered by core tests and reflected in the
      board's boundaries.

## Outcome
