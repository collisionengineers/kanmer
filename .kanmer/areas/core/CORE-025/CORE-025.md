---
id: CORE-025
type: ticket
title: Investigate what else CI should check about a Kanmer ticket
status: backlog
area: core
assignee: ''
profile: spike
labels: []
links: []
docs_todo: true
archived: false
created: '2026-08-16T18:26:15.191Z'
updated: '2026-08-16T18:26:15.191Z'
---

## What

With [[CORE-024]] establishing the mechanism, survey what **else** a CI check
could usefully assert about the ticket behind a PR.

## Why

The open-questions check is one instance of a general shape: *facts the board
knows that the merge decision currently cannot see*. Gates guard stage moves;
CI guards merges; nothing has ever connected them. Worth asking once what the
full set is, rather than adding checks one at a time as each gap bites.

Candidates, none yet reasoned through:

- **The PR names a real ticket** — a missing or unknown `Kanmer:` footer is
  untraceable work, and this is the cheapest possible check.
- **The ticket is at a stage consistent with having an open PR** — a PR for a
  ticket still in Backlog means the pipeline was skipped.
- **The ticket is not `blocked`** by an unmerged `blocks` edge.
- **The governing-doc ref resolves** — `refs` can point at a path that has since
  moved or been deleted.
- **The checklist is complete**, or its unticked boxes are surfaced. [[GUI-064]]
  reached Done at 21/23 and nobody noticed.
- **The post-implementation report exists and mentions every changed file** —
  much weaker, and possibly the wrong kind of check.

## Approach

- Judge each against a single test: does it catch a failure that has **actually
  happened** on a real board, or is it a rule invented for symmetry? Several
  above have real precedents on this board; some do not.
- Prefer few, loud, unambiguous checks. A wall of advisory warnings trains people
  to ignore CI, which costs more than the checks buy.
- Say explicitly which are advisory and which could ever be required.
- Depends on [[CORE-024]] settling ticket resolution and board access from CI —
  every check here inherits both.

## Verification

- [ ] Each candidate is kept or rejected with a stated reason, and each keeper
      cites a failure that really occurred.
- [ ] A recommended minimal set, ordered by value.
- [ ] Anything worth building becomes its own ticket.

## Outcome
