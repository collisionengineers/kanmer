---
id: CORE-134
type: ticket
title: >-
  Cache the PowerShell process-identity probe so the first locked board write
  stops blocking the event loop
status: backlog
area: core
assignee: ''
profile: fix
labels: []
groups:
  - HZN-010
links: []
refs:
  - docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md
archived: false
created: '2026-08-28T07:23:14.070Z'
updated: '2026-09-05T02:15:12.879Z'
---

## What

The first locked board write in every MCP server process pays a synchronous PowerShell process-identity probe. It is never cached, so the cost recurs per process, and it blocks the event loop because it runs via `execFileSync`.

Measured during [[CORE-128]] (measurements in that ticket's `scratch/research.md`):

| case | cost |
|---|---|
| identity probe, self | ~776 ms |
| identity probe, foreign owner | ~1103 ms |
| first `updateItem` in a process | 998 ms |
| steady-state `updateItem` | 25.9 ms |

So roughly **a full second of every MCP session's first board write is this probe**, and about 63% of the old 5 s vitest budget was consumed before any assertion ran — which is part of why the Windows verification rail was so fragile.

## Why it is worth its own ticket

It is a **production** defect, not a test artefact: every real MCP session pays it, not just suites. [[CORE-128]] deliberately declined to fix it — correctly, since its lane was the verification rail and this is a lock-contract change needing its own plan — and the independent review of PR #300 recommended filing it, judging that it clears the bar on three grounds: it is measured rather than suspected, it is production-visible, and CORE-128's enlarged orphan-migration waiter (a 14-step ladder summing to ~32 s) now sits downstream of it.

## Not part of HZN-008

Deliberately filed **outside** the reliable-autonomy horizon. No FRD-028..035 acceptance criterion requires it and the group's Definition of done does not name it, so under HZN-008's Scope discipline rule it is ordinary backlog rather than a horizon member. It is real work and should not be lost; it simply must not gate the horizon's completion.

## Approach

- Cache the identity result per process. The probe answers a question that cannot change for the lifetime of the process asking it about itself; a foreign owner's identity can change, so scope the cache deliberately rather than blanket-memoising.
- Prefer an asynchronous probe over `execFileSync` so a slow identity lookup cannot block the event loop, or establish why the synchronous form is load-bearing for the lock contract and record that.
- Do not weaken stale-owner recovery: [[CORE-128]]'s review confirmed `recoverStaleLock` gates on age **and then** `processAlive` plus identity match, returning false while the owner lives and failing closed when identity is unavailable. That fail-closed property must survive.
- Re-measure after the change and record before/after numbers, since the original figures are the only reason this ticket exists.

## Verification

- [ ] The identity probe runs at most once per process for the self case, with before/after measurements recorded.
- [ ] The first locked board write no longer blocks the event loop for ~1 s.
- [ ] Stale-owner recovery still refuses to steal a live lock and still fails closed when identity is unavailable.
