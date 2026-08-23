---
id: CORE-028
type: ticket
title: 'Two ADR-0013s on main, and nothing checks for duplicate ADR numbers'
status: backlog
area: core
assignee: ''
profile: chore
labels:
  - docs
  - shipped-ownerless
links:
  - SKILL-013
docs_todo: true
archived: true
created: '2026-08-17T00:09:22.013Z'
updated: '2026-08-23T01:02:20.049Z'
---

## What

`docs/architecture/adr/` currently contains **two** ADR-0013s:

- `ADR-0013-hosts-own-their-registration-file.md`
- `ADR-0013-staleness-by-content-not-version.md`

Renumber one, and add a rail check so it cannot happen again.

## Why

The first came from `26c8960`, a commit whose entire purpose was *"renumber the
duplicate ADR-0012 to ADR-0013"*. The second came from [[CORE-023]] (`3e9ee2c`,
#54), which was in flight at the same time and independently picked the same
next-free number.

So the duplicate-ADR-number defect was fixed and recreated inside the same
window, by two tickets that could not see each other's choice. That is not
carelessness — it is the predictable result of "take the next free number" when
several tickets are open at once, which on this board is the normal state. It
has now happened **twice** (ADR-0012, then ADR-0013).

[[SKILL-013]] hit it while choosing a number, took **ADR-0014** rather than
adding a third 0013, and filed this instead of renumbering someone else's
just-merged ADR — `refs` on closed tickets point at those paths.

## Approach

- **Renumber one of the two.** Whichever is chosen, update every reference:
  `refs` on any ticket, cross-references in other ADRs/FRDs, and code comments
  (`providers.ts`, `providers.test.ts`, `FRD-012`, `AGENTS.md` all cite
  ADR-0013 today, and they mean different documents).
- **Add the check.** Roughly three lines: read `docs/architecture/adr/`, extract
  the `ADR-NNNN` prefix, fail on any repeat. Natural home is
  `scripts/verify-skill-prose.mjs` (already on the rail) or its own script.

  [[SKILL-013]] deliberately did **not** add this check despite touching that
  file, because it would have been **red on arrival** — the duplicate exists on
  main. Renumber first, then add the check in the same PR so the rail goes green
  with it.

## Verification

- [ ] No two files under `docs/architecture/adr/` share a number.
- [ ] Every reference to the renumbered ADR updated — including `refs` on closed
      tickets and the `AGENTS.md` §5 citation.
- [ ] The rail check fails on a deliberately duplicated file and passes after.

## Outcome
Shipped ownerless via PRs #57/#59 while this ticket sat in backlog — the rail is scripts/check-doc-numbering.mjs, on main with tests. Archived 2026-08-20 as a board-vs-reality correction; the groom sweep that should have caught this is [[SKILL-027]].


## 2026-08-23 archived audit

Disposition: resolved and still green. `scripts/check-doc-numbering.mjs` is present and the current `npm run test:scripts` rail passes 89/89, including duplicate ADR fixture coverage. No unique unresolved defect remains.
