# Files — CORE-125

Surveyed at base `9c9a6980` (origin/main). Surface area of "serialise non-lease
ticket writers against the lease lock", not the findings (those are in
`scratch/research.md`).

## Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/store.ts` | The whole change. `withLeaseLock` (:1097) gains a re-entrancy guard; `updateItem` (:771) moves its `locateItem` → read → `expectedUpdated`/`assertRevision` CAS → `backwardMoveEffects` → gate → write into that lock; `setDoc` (:1711) and `appendScratch` (:2174) do the same for the document/revision CAS. Risk: a nested acquire deadlocks (`updateItem` → `appendTransition` → `setDoc`, and `transferTicket`/`renewTicket` call `appendTransition` while already holding the lock), and a section that grows to include `computeOrder` would hold a board-wide lock across a whole-column materialisation. |
| `packages/core/src/claims.test.ts` | New failing-first test: a real `renewTicket` paused inside its critical section (barrier on the public `getBoard`, which renew calls at :1563 between its read and its write) while another `KanmerStore` runs `updateItem`; neither the lease record nor the concurrent field edit may be lost. Plus a re-entrancy regression test that a lease verb which writes a transition document still completes. |
| `AGENTS.md` | §8 gotcha list records the lease-lock contract (gotcha 17/18). It must say that every ticket-file mutation, not only the lease verbs, now runs under `.kanmer/leases.lock`, and that internal helpers must never acquire it twice. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/io.ts` | `withExclusiveFileLock` (:452) is a cross-process exclusive-create lock with **no re-entrancy**: a nested acquire from the same process gets `EEXIST`, is not recoverable as stale (its own pid is alive), retries `DEFAULT_LOCK_RETRY_MS` (:74, ~2.145 s total) and then throws. That retry budget is also the hard ceiling on how long a section may be held before contention becomes errors. `DEFAULT_LOCK_STALE_MS` (:73) is 30 s, so a crashed holder is reclaimed rather than wedging the board. |
| `packages/core/src/store.ts` :1045 `computeOrder` | Materialises `order` across the whole target column through nested `updateItem` calls. Keep it **outside** the critical section: locking it as one unit would hold a board-wide lock for hundreds of writes. Its per-sibling writes are still each serialised once `updateItem` locks. |
| `packages/core/src/store.ts` :998 `assertMoveAllowed` | The pre-check that must stay before `computeOrder` (a refused move must not have re-stamped a column). Locking must not reorder these three steps. |
| `packages/core/src/store.ts` :1262/:1356 `takeTicket` batch stamps | The CORE-124 first-member take writes `lease_batch` on siblings inside the lock; those siblings are exactly what an unlocked `updateItem` can clobber (CORE-124 review F-001). Explains why the lock must be board-wide rather than per ticket. |
| `packages/core/src/watch.ts` :23 | The watcher does not ignore `.lock`; `.kanmer/leases.lock` and its `leases.lock.owner-*` markers already fire add/unlink events today. `classifyKanmerPath` returns null for them and `apps/gui/src/renderer/src/App.tsx` `onDiskChange` (:495) takes the "nothing to re-render" branch, so more frequent locking is IPC noise, not a reload storm. |
| `apps/gui/src/main/index.ts` :1156/:1161/:1335 | The GUI reaches `updateItem`/`moveItem`/`setDoc` one call per IPC handler through the same `KanmerStore`, so lock duration is directly UI latency. Read-only for this ticket: another lane owns `apps/gui`. |
| `docs/functional/frd/FRD-030-...md` | Governing doc: "Lease acquisition and renewal are atomic and revision-safe" and AC2 "stale renewal returns `LEASE_EXPIRED` or `REVISION_CONFLICT` **without overwrite**" — which an unlocked writer can currently violate from outside the lease verbs. |
| `.kanmer` CORE-115 `scratch/review` F-001/F-004/F-008, CORE-124 `scratch/review` F-001 | F-001 (both tickets) is the defect being fixed. F-004 (renew compat lane owner check) and F-008 (`force` bypasses `LEASE_LIVE`) are accepted risk — do not regress or "fix" them here. |

## Ripple effects

- Every `KanmerStore` write path gains one lock cycle (2 exclusive creates + 2 removals). Expect a measurable but small increase in `npm test -w @kanmer/core` wall time; the 417 existing core tests must stay green and unchanged.
- `packages/mcp-server` (`update_item`, `move_item`, `set_ticket_doc`, `append_scratch`) and the GUI inherit the behaviour without code changes; `smoke.mjs` (306) and `smoke:protocol` (50) must stay green.
- `plugins/kanmer/mcp/kanmer-mcp.cjs` bundle is rebuilt only if `packages/mcp-server` changes; a core-only change still needs `npm run plugin:check` to confirm bytes/tool count.
- No board file format change, so the installed v0.3.12 server keeps reading the live board.

## Out of scope

- `deleteItem` (:1876): it removes a ticket with no CAS at all and then runs N link-cleanup `updateItem`s. Locking the whole verb would hold the board lock across that loop; its own `fs.rm` hazard is a separate defect, recorded for follow-up rather than fixed here.
- `createItem`: exclusive-create allocation, no read-modify-write of an existing ticket.
- `migrate.ts` `backfillStages`, `setBoard`/`updateBoard` (own `board.yml.lock`), group documents.
- The CORE-115 hardening candidates parked onto this ticket by its review — F-010 release lease fencing, F-012 repo-relative `lease_workspace`, F-014 detached-worktree refusal, F-015 heartbeat/expiry validation. They are behavioural lease changes, not serialisation, and each deserves its own review.
- `apps/gui` (another lane holds `.worktrees/gui-144`).
