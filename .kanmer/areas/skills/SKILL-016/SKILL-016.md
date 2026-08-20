---
id: SKILL-016
type: ticket
title: Give a kanmer-auto run durable state on the board
status: backlog
area: skills
assignee: ''
profile: feature
labels:
  - auto
groups:
  - EPIC-009
  - HZN-004
links: []
blocks:
  - SKILL-017
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
archived: false
created: '2026-08-16T21:22:59.692Z'
updated: '2026-08-20T10:26:30.928Z'
---

## What

A `kanmer-auto` run writes its state to the board, so any agent on any host can
resume it exactly where it stopped.

## Why

A real run over [[HZN-003]] cleared 3 of 22 tickets and could not continue. The
run's state — roster, target point, lane partition, skip reasons, and four
operator answers collected mid-run — existed **only in one agent's context**.
A context boundary destroyed all of it, and nothing had been written between
tickets.

The board is the only medium every host shares. Anything held in a harness's
context is lost to the next invocation and invisible to a different agent
entirely — and Kanmer targets five providers, not one.

## What the board cannot already tell you

Stage, `taken` and the document set are recoverable from `list_items`. These are
not:

- the **roster** — what was scoped, and by what filter
- the **target point** — closeout, or "up to review"
- the **lane partition** — computed from the `files` documents, expensive to redo
- **skip reasons** — why a ticket was dropped, which is exactly what a silent
  drop looks like from the outside
- **operator answers already given** — the most expensive thing to lose, because
  re-asking makes the operator answer the same question twice

## Approach

`set_group_doc` already accepts a free-form relative path
(`packages/mcp-server/src/index.ts:474`), so **no new MCP surface is needed**:
`set_group_doc HZN-003 "run.md"`.

Shape, as approved by the operator:

```markdown
# Auto run — HZN-003
target: closeout   started: 2026-08-16

| ticket   | lane | state  | note                    |
|----------|------|--------|-------------------------|
| SKILL-014| A    | done   | PR #34                  |
| GUI-078  | A    | done   | PR #35                  |
| GUI-069  | B    | next   | decision on GUI-070     |
| GUI-068  | —    | parked | needs 0.3.3 cut + human |

## Awaiting operator
- GUI-066: blockmap backfill? (declined 08-16)
```

- Written at scope time, then **updated after every ticket transition**. That
  cadence is the whole point: it is what makes a mid-roster context boundary
  invisible rather than fatal.
- A **resume procedure at the top of the skill**: before scoping, read `run.md`;
  if it exists and is incomplete, adopt it rather than re-scoping. Re-deriving a
  roster from scratch is precisely how a resumed run loses the operator's
  decisions.
- Area-scoped and ad-hoc runs have no group to hang this on. State the fallback
  rather than leaving it undefined.

## Verification

- [ ] A run writes `run.md` at scope time and updates it after every transition.
- [ ] **The real test**: start a run on a multi-ticket roster, end the session
      mid-roster, re-invoke with the same request. It resumes with **no operator
      input** and does **not** re-do completed tickets.
- [ ] An operator answer recorded in one invocation is honoured in the next
      without being re-asked.
- [ ] The area-scoped fallback is exercised, not just described.

Testing the document instead of the behaviour is the failure mode here — the
prose was already plausible when the run stalled.

## Outcome
