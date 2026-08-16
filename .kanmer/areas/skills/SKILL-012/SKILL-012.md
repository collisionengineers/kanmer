---
id: SKILL-012
type: ticket
title: >-
  Raise open questions to the operator before execution, review fixes, and
  closeout
status: review
area: skills
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-16T16:18:17.167Z'
  review: '2026-08-16T17:31:22.394Z'
taken_at: '2026-08-16T17:08:22.621Z'
branch: skill-012-questions-gate
worktree: .worktrees/skill-012
labels: []
groups:
  - HZN-003
links:
  - SKILL-011
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-009-interrogative-workflow.md
  - docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md
archived: false
created: '2026-08-16T16:11:20.804Z'
updated: '2026-08-16T17:31:22.394Z'
---

## What

Make unresolved open questions a **hard stop** at three points: before a ticket
enters execution, before review fixes are applied, and before a ticket is
closed. No ticket reaches Done with an open question still open.

## Why

Today the rule is soft and stated in only one place. `kanmer-research` says
questions "only the user can answer go to the user **now**", and the
open-questions template says outright that they "**block** the plan" — but
nothing enforces either. `kanmer-plan`, `kanmer-execute`, `kanmer-verify`,
`kanmer-closeout` and `kanmer-auto` never mention open questions at all, so a
question raised in Preparing can sit unanswered while code is written on top of
a guess, and the ticket can close with the guess baked in and nobody ever told.

A sweep of all 118 tickets found three open-questions documents. **Across every
ticket that ever raised a question, the recorded resolution rate was zero** —
[[GUI-064]] shipped in v0.3.2 with four unticked boxes, [[GUI-004]] closed with
a question that had resolved itself in practice, [[CORE-011]]'s three questions
were answered inside its own other documents, and [[CORE-021]] was archived with
four decisions simply unmade. All twelve were closed by hand on 2026-08-16, and
every one was either already decided or trivially decidable. That is the
signature of a rule with no enforcement point, not of careless agents.

## Approach

Research settled the mechanism; this is the shape it takes.

- A **`questions-resolved` pseudo-requirement**, alongside `governing-doc` —
  *not* a requirement that the `open-questions` document exist. Gates check
  existence, not content, so requiring the document would let a file of four
  unanswered questions satisfy the gate: it would enforce the paperwork and not
  the rule.
- **Satisfied by** zero unticked `- [ ]` above the `## Parked (explicitly
  deferred)` heading, across the files in `open-questions/`. An absent document
  is satisfied — raising no questions is not a failure state. The template
  already uses this convention and core already parses these exact checkboxes
  for checklist progress, so the parser is an existing loop pointed at a second
  folder.
- **Boundaries:** `leave-preparing`, `enter-review`, `enter-done`, on **every
  profile**. The "before review fixes" stop cannot be a gate — review fixes
  happen inside the review stage with no `move_item` — so that one is prose in
  `kanmer-review`, labelled honestly as a convention rather than enforcement.
- **A ticked box is the whole mechanism.** Nothing records who answered:
  Kanmer is a solo-developer tool, and on a team the commit that ticks the box
  already carries the author's name.
- **Not skill prose.** FRD-023 R1 is "derive, don't restate" — writing the rule
  into five skills would add five restatements of a gate rule, which is what R1
  exists to delete. Skills keep asking `get_doc_gates` and obeying it.
- **Needs an ADR.** This is the first gate that reads *inside* a document, and
  `gates.ts` is explicit that the anti-collapse rule was made structural
  precisely so it "has nothing to be wrong about".

## Verification

- [ ] A ticket with an unresolved open question cannot leave Preparing.
- [ ] Moving a question under `## Parked` with a reason clears the gate; ticking
      it clears the gate; an absent document never blocks.
- [ ] The same requirement blocks `enter-review` and `enter-done`.
- [ ] `kanmer-review` refuses to apply fixes while questions are open (prose).
- [ ] `kanmer-auto` reports a lane that stopped on a question **as such**, not
      as a generic failure.
- [ ] Existing boards inherit the requirement on upgrade, and the release notes
      say so and name the escape.
- [ ] Covered by core tests and reflected in the board's boundaries; the ADR is
      written and linked before the plan cites it.

## Outcome
