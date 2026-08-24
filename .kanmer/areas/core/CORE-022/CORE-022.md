---
id: CORE-022
type: ticket
title: Migration survives EPERM and resumes per ticket
status: done
area: core
order: 50
assignee: core022-take
profile: feature
stageEntered:
  preparing: '2026-08-16T13:17:30.131Z'
  review: '2026-08-16T13:27:55.328Z'
  verifying: '2026-08-16T13:29:09.769Z'
  done: '2026-08-16T13:29:35.016Z'
  implementing: '2026-08-21T08:55:07.519Z'
labels:
  - bug
  - migration
  - windows
groups:
  - HZN-007
links:
  - CORE-021
  - GUI-005
refs:
  - docs/functional/frd/FRD-007-fixed-six-stage-board.md
  - docs/functional/frd/FRD-015-ticket-and-board-core.md
commits:
  - d0f927a
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/28'
archived: false
created: '2026-08-16T13:17:25.100Z'
updated: '2026-08-24T16:24:55.197Z'
---

A user's format-2 → format-3 migration failed three times on Windows and left
the board half-migrated and read-only:

```
EPERM: operation not permitted, rename
'…/TICK-162/.TICK-162.md.tmp-18292-182' -> '…/TICK-162/TICK-162.md'
```

`writeFileAtomic` has no retry, leaks its temp on failure, and `migrateToV3`
has no per-ticket resume — so every retry rewrites all 242 tickets and re-rolls
the dice on each one. It got *worse* each attempt: died at write #182, then
#377, then #383.

The board's own review predicted this. `docs/plans/pr-2-review/pr-2-comments.md:2216`
warned that a single EPERM from antivirus leaves "a board that cannot be
migrated by any action available in the product". Fixed for v1→v2; never
carried into v2→v3.

**Where:** `packages/core/src/io.ts`, `packages/core/src/migrate.ts`,
`apps/gui/src/main/index.ts`, `apps/gui/src/main/kanmerGit.ts`, FRD-007 M4.

**Not in this ticket:** repairing the affected board, and releasing. Both are
separate calls.

Full diagnosis in the research document.

## Outcome

Verified Done on current merged main `ef67c04e0f3a20145dcb88497fdcb97a53038ab6`: a real 242-ticket migration fixture and genuine Windows destination-lock retry both passed, alongside the full clean verification rail. PR #28 merged to main at `dfc2b059aaab7f6dbaac5085c9a2b475c538cd09`; implementation `d0f927a3f9aab7fa6f4716410138126f3ff1fc35` is reachable. No ticket worktree or source branch remains; this ticket does not publish a release.
