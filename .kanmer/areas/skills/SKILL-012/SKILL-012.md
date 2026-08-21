---
id: SKILL-012
type: ticket
title: >-
  Raise open questions to the operator before execution, review fixes, and
  closeout
status: done
area: skills
order: 1120
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-16T16:18:17.167Z'
  review: '2026-08-16T17:31:22.394Z'
  verifying: '2026-08-16T17:37:27.627Z'
  done: '2026-08-16T17:37:31.717Z'
labels: []
groups:
  - HZN-003
links:
  - SKILL-011
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-009-interrogative-workflow.md
  - docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md
commits:
  - e002498
  - 74a7240
  - 6eadb04
  - c7ba074
prs:
  - '#33'
  - '#30'
archived: false
created: '2026-08-16T16:11:20.804Z'
updated: '2026-08-21T13:02:17.296Z'
---

## What

Make unresolved open questions a **hard stop**: a ticket cannot leave Preparing,
enter Review, or reach Done while `open-questions/` holds an unticked `- [ ]`
above the `## Parked (explicitly deferred)` heading.

## Why

The rule was soft and stated in one place. The open-questions template says
questions "**block** the plan"; nothing enforced it. A sweep of all 118 tickets
found three open-questions documents, and **across every ticket that ever raised
a question the recorded resolution rate was zero** — [[GUI-064]] shipped in
v0.3.2 with four unticked boxes, [[GUI-004]] closed on a question that had
resolved itself in practice, [[CORE-011]]'s three were answered inside its own
other documents, and [[CORE-021]] was archived with four decisions unmade. All
twelve were closed by hand on 2026-08-16, and every one proved either already
decided or trivially decidable. That is a rule with no enforcement point, not
careless agents.

## Approach

- A **`questions-resolved` pseudo-requirement** beside `governing-doc` — *not*
  the `open-questions` doc type. Requirements are satisfied by a document
  existing, so requiring the document would be satisfied by a file of unanswered
  questions: the paperwork, not the rule.
- Satisfied by zero unticked boxes above the parked heading; an absent document
  satisfies it. The parser is the checkbox loop that already counted checklist
  progress, extracted so both callers share one regex.
- Boundaries `leave-preparing`, `enter-review`, `enter-done`, on every profile.
  The "before review fixes" stop **cannot** be a gate and is prose in
  `kanmer-review`, labelled as a convention.
- A ticked box is the whole mechanism; nothing records who answered.
- Governed by a new ADR, since this is the first gate to read inside a document.

## Verification

- [x] A ticket with an unresolved open question cannot leave Preparing.
- [x] Moving a question under `## Parked` with a reason clears the gate; ticking
      it clears the gate; an absent document never blocks.
- [x] The same requirement blocks `enter-review` and `enter-done`.
- [x] `kanmer-review` refuses to apply fixes while questions are open (prose).
- [x] `kanmer-auto` reports a lane that stopped on a question **as such**, not
      as a generic failure.
- [x] Existing boards inherit the requirement on upgrade, and the release notes
      say so and name the escape.
- [x] Covered by core tests and reflected in the board's boundaries; the ADR is
      written and linked before the plan cites it.

## Outcome

PR [#33](https://github.com/collisionengineers/kanmer/pull/33) (`e002498`),
merged 2026-08-16, preceded by **ADR-0011** in PR
[#30](https://github.com/collisionengineers/kanmer/pull/30) (`c7ba074`). core
tests 159 → 182, GUI 201 → 202.

**Two defects were found by the demonstration, both with a fully green suite** —
which is the case for demonstrating against real data rather than fixtures:

1. **"Existing boards inherit" was false as first built.** `resolveProfiles` is
   `board.profiles ?? DEFAULT_PROFILES`, and every board written by setup or
   migration carries its own `profiles:` block, so editing the shipped defaults
   reached new boards only — while ADR-0011 and the release note both claimed
   otherwise. Escalated rather than guessed, since the three candidate fixes led
   to materially different products; the operator chose resolve-time injection
   (`6eadb04`).
2. **The first injection gated `leave-backlog`**, which is backwards: questions
   are raised during research, so it trapped tickets outside the stage where
   they get worked. It also had to be stopped from adding boundaries a profile
   never declared, or `spike`'s Backlog → Done jump would have gone from one
   gated boundary to three and been refused.

## What is actually guaranteed — corrected twice, by the operator

The first draft of this section called the work "narrower than the title
suggests" because `fix` and `chore` declare no `enter-review` boundary. Both
framings that followed were wrong in the same direction, so here is the measured
position.

Across all four profiles, with an unticked question and every other document
present:

```
fix      implementing -> review   ALLOWED
chore    implementing -> review   ALLOWED
spike    implementing -> review   ALLOWED
feature  implementing -> review   REFUSED: entering Review requires questions-resolved

fix      review -> done           REFUSED: entering Done requires questions-resolved
chore    review -> done           REFUSED: entering Done requires questions-resolved
spike    review -> done           REFUSED: entering Done requires questions-resolved
```

**The guarantee, and it holds without exception: no ticket reaches Done with an
unresolved question, on any profile.** That is what this ticket promised, and it
is delivered.

**The merge is protected on no profile, `feature` included.** `kanmer-review`
merges *then* moves — *"merge the PR (`gh pr merge`), and `move_item <id>
verifying`"* — and `gh pr merge` is a GitHub operation the gate engine never
sees. Gates constrain `move_item` and nothing else. A `feature` ticket sitting in
`implementing` with an open question therefore has a PR exactly as mergeable as a
`fix` one; its `enter-review` gate only refuses the bookkeeping move *afterwards*,
once the code has landed.

So the `enter-review` difference between profiles buys nothing at the merge
point, and giving `fix`/`chore` that boundary — which an earlier note suggested
as a follow-up — would improve bookkeeping only. Merge-time protection is the
`kanmer-review` prose convention alone: unenforceable by construction, and not
improvable by any gate, because the gate engine does not govern git.

**Follow-up not filed as a ticket:** ADR-0011 should gain the two limits above.
The merged ADR was left stable rather than amended mid-flight; it is a
one-paragraph change.

Not deployed — shipped to `main`, awaiting the 0.3.3 release, whose notes are
already written.
