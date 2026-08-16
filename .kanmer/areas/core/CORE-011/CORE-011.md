---
id: CORE-011
type: ticket
title: Gates cannot tell a document was written after the work
status: review
area: core
assignee: claude-code
profile: feature
taken_at: '2026-08-16T04:49:50.536Z'
branch: core-011-one-gate-per-move
worktree: .worktrees/core-011
labels:
  - bug
  - v3-phase-2
links: []
refs:
  - docs/functional/frd/FRD-002-requirement-profiles.md
  - docs/product/prd/PRD-001-kanmer-v3.md
archived: false
created: '2026-08-16T04:24:49.811Z'
updated: '2026-08-16T04:56:56.459Z'
---

Gates check that a document exists, never that it existed before the work it
gates. `move_item` also crosses every boundary in one call, so `backlog -> done`
is a single legal action. Together those let an agent write all six pipeline
documents after the fact, fire one move, and produce a ticket that looks fully
worked with no staging history and no thinking that preceded the code.

Observed on this board: 26 of the v3 roadmap tickets were closed exactly this
way. The documents are accurate about what was built; none of them guided it.
This is PRD-001 problem 1 ("agents write junk documents to satisfy gates")
surviving into v3, in a form the gate engine cannot see.

**Proposed R1 — `done` is entered only from `verifying`.** Terminal stages are
not jumpable into. Cheap, but insufficient alone: five sequential moves still
satisfy it.

**Proposed R2 — a gating document must predate the transition it gates.**
Compare the document's mtime against the item's stage-entry timestamp from the
activity log. A `plan` written after the ticket entered `implementing` fails
`leave-preparing` on the next boundary, because it demonstrably did not guide
the implementation. R2 is the one that catches the real case.

Open questions for the spec amendment, since FRD-002 G2 permits multi-stage
jumps deliberately:
- Does R1 break the `chore` one-jump-to-Implementing acceptance case? (No, but
  the interaction needs stating.)
- Is mtime trustworthy enough, or should stage-entry times come only from the
  activity log?
- Warning or block? Proof warnings are soft by design (FRD-006); this probably
  is not.

**Where:** `packages/core/src/gates.ts`, `store.ts` `moveItem`, and an amendment
to FRD-002.
**Governing docs:** FRD-002 G2, PRD-001 problem 1.
