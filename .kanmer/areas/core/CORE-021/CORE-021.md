---
id: CORE-021
type: ticket
title: Refuse leaving Preparing once the ticket's branch has commits
status: backlog
area: core
assignee: ''
profile: feature
labels:
  - gates
  - parked
links:
  - CORE-011
refs:
  - docs/functional/frd/FRD-002-requirement-profiles.md
  - docs/product/prd/PRD-001-kanmer-v3.md
archived: true
created: '2026-08-16T07:20:34.432Z'
updated: '2026-08-16T07:42:13.930Z'
stageEntered:
  preparing: '2026-08-16T07:30:47.409Z'
---

A ticket may not leave Preparing once its branch has commits. If there is no
code, the plan cannot have followed it.

## Why this rather than the rule already written down

FRD-002 G2a records the open design question as "compare a document's
first-write time against the first commit on the ticket's branch". **That does
not work**, and the reason should be recorded before anyone tries it:

- `setDoc` records no timestamp at all — its `version` is a content hash.
- `syncBoard` commits the whole board in one `git add -- .kanmer` per sync
  ([[GUI-001]] / `kanmerGit.ts:169`). Every document written between two syncs
  shares one commit time. With autosync off — the default until this board
  turned it on — a whole ticket's documents can carry a single stamp dated
  *after* the code was written.
- File mtimes do not survive a clone, so they are worse than nothing: on a
  fresh checkout every document looks written at checkout time.

So the timestamp comparison is either vacuous or falsely failing, depending on
sync timing. Amend G2a rather than leaving the wrong suggestion in the spec.

## The rule

`take_ticket` already records the branch. At `leave-preparing`:

    git rev-list --count <branch>  ===  0

No clocks, nothing to skew, nothing defeated by batching — the same structural
shape as [[CORE-011]], which is why CORE-011 holds and a timestamp rule would
not.

It also matches the workflow the skills already describe: `kanmer-execute`
creates the worktree and branch **at the start of Implementing**, so at
`leave-preparing` the branch legitimately should not exist yet.

## Edge cases that decide whether this is usable

- **No branch recorded** (ticket never taken) — no-op. Most tickets leave
  Preparing before anyone takes them.
- **Branch recorded but does not exist** (deleted at closeout, or a fresh
  clone) — no-op, not a failure. A closed-out ticket re-entering Preparing must
  not be blocked by a branch that is gone.
- **Ticket re-opened and moved back** — backwards moves cross nothing already,
  so only the forward move is checked; by then the branch usually has commits.
  **This is the case most likely to make the rule annoying**, and the one to
  settle before building: a ticket sent back from Review to Preparing for
  rework cannot then leave Preparing again. Options: exempt a ticket that has
  previously been past Preparing (`stageEntered.implementing` exists), or make
  it a warning on the second pass. Decide, do not discover.
- **Not a git repo** — no-op.

## Alternative, if ordering *within* the board also matters

Have `setDoc` record `firstWritten` per document type in the item's
frontmatter — committed data, survives cloning, needs no git read — and compare
it against `stageEntered`. Self-contained, and core shells out to git nowhere
today, so it avoids introducing that.

Weaker than the branch check on its own; complementary alongside it.

## The honest limit, which belongs in the amendment

All of these prove **sequence, not causation**. A plan written first and then
ignored passes every one of them. Nothing in a gate can detect that — review can,
or nothing can. The amendment should say so, because a gate that claims more
than it delivers is one people learn to route around.

Both rules are defeatable deliberately (write a stub plan early; commit nothing
until the plan exists). They are aimed at the **accidental** case — doing the
right things in the wrong order — which is what actually happened on this board.

## Where

`packages/core/src/store.ts` `assertDocGate`, and an amendment to FRD-002 G2a.
Core reads git nowhere today, so this introduces that dependency — worth stating
in the plan rather than slipping in.

**Verification:** a ticket with a committed branch is refused at
`leave-preparing`; the same ticket with an empty branch passes; no branch, a
missing branch and a non-git project are all no-ops; and the re-opened case
behaves however the plan decides, asserted either way.
