---
id: CORE-024
type: ticket
title: Investigate a CI check that blocks merge on unresolved open questions
status: backlog
area: core
assignee: ''
profile: spike
labels: []
links: []
blocks:
  - CORE-025
refs:
  - docs/functional/frd/FRD-009-interrogative-workflow.md
  - docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md
archived: false
created: '2026-08-16T18:26:15.167Z'
updated: '2026-08-16T18:26:19.956Z'
---

## What

Investigate a CI check that fails a PR while its ticket has unresolved open
questions, telling the author to take them back to the operator — installed
automatically when Kanmer is set up in a repo.

## Why

[[SKILL-012]] closed the Done gate: no ticket reaches Done with an open
question, on any profile. It could not close the **merge**, and the reason is
structural rather than an oversight.

Gates constrain `move_item` and nothing else. `kanmer-review` merges *then*
moves — *"merge the PR (`gh pr merge`), and `move_item <id> verifying`"* — and
`gh pr merge` is a GitHub operation the engine never sees. So a ticket sitting in
Implementing with an open question has a mergeable PR on **every** profile,
`feature` included; its gate only refuses the bookkeeping move afterwards, once
the code has landed. No gate can fix this, because the gate engine does not
govern git.

CI is the first mechanism that could — it runs where the merge decision is made.

## Approach

This is a spike: the deliverable is a reasoned recommendation, not an
implementation.

- Establish how a check maps a PR to its ticket. The `Kanmer: <ID>` footer in the
  PR body is the existing convention, and the branch is `<id>-<slug>` — decide
  which is load-bearing and what happens when neither is present.
- Decide where the board lives from CI's point of view. It is a **separate
  orphan branch** (`kanmer-board`), not the PR's tree, so the check must fetch it
  — that is the interesting constraint and probably the hardest part.
- Reuse core's own answer rather than re-implementing the parse: the same
  `countCheckboxes` / `questions-resolved` logic, exposed as a CLI, so CI and the
  board can never disagree.
- Weigh **required check vs advisory**. A required check needs branch protection,
  which Kanmer cannot set on a user's repo; an advisory one is ignorable. Say
  which, and why.
- Weigh auto-installation honestly: writing a workflow file into someone's repo
  is intrusive, and a check that fails confusingly is worse than none. Propose
  the opt-in shape.

## Verification

- [ ] A written recommendation covering: ticket resolution, board access from CI,
      required vs advisory, and the install story.
- [ ] The failure message is drafted — it must name the questions and say to take
      them to the operator, not just fail.
- [ ] Cases where the check must **not** fire are enumerated (no ticket, board
      unreachable, questions parked).

## Outcome
