# Post-implementation report — CORE-125

Branch `core-125-serialise-ticket-writers`, worktree `.worktrees/core-125`,
head **437772d4**, PR **https://github.com/collisionengineers/kanmer/pull/296**,
based on `origin/main` **f3060b06** (not the plan's 9c9a6980 — GUI-144 #294
merged while this ticket was being planned; see Deviations).

## Summary

Every mutation of a ticket file now performs its locate, re-read, CAS and write
inside the same board-wide `.kanmer/leases.lock` critical section the lease
verbs already take, so an ordinary `update_item`/`move_item`/`set_ticket_doc`
can no longer rename over a lease write and silently revert the lease record,
the CORE-121 claim fields or a CORE-124 sibling `lease_batch` stamp. The lock
became re-entrant *within one async execution context* because several verbs
legitimately nest; `moveItem`'s column-wide `computeOrder` deliberately stays
outside the critical section so a board-wide lock is never held across it. Two
new tests park a real lease renewal and a real audited backward move inside
their critical sections and prove that neither write is lost; both fail against
the previous store code.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/store.ts` | modified | `withLeaseLock` is now the board **write** lock and re-entrant within one async context (module-level `AsyncLocalStorage<ReadonlySet<string>>` of held lock-file paths, keyed by path so two boards never alias). `updateItem` runs locate → read → `expectedUpdated`/`assertRevision` CAS → `backwardMoveEffects` → `assertDocGate` → area-folder rename → `writeFileAtomic` → activity/transition inside it; the board/area/profile/groups/refs argument validation stays outside because it touches no ticket file. `setDoc` and `appendScratch` run their revision/version CAS and write in the same section. `moveItem` keeps its three-step shape with a comment recording why the lock must not span `computeOrder`. Ignoring re-indentation the diff is +56/−1 (`git diff -w`); no ordering, error string or return value changed. |
| `packages/core/src/claims.test.ts` | modified | New `describe("non-lease writers share the lease lock (CORE-125)")` with three tests (see Verification hand-off). No existing assertion touched. |
| `AGENTS.md` | modified | §8 gotcha 17 retitled "every ticket write goes through one lock" and extended: what is inside the lock now, that the lock is re-entrant only within one async context and why, and that `computeOrder` is deliberately outside it. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | modified (generated) | Rebuilt with `npm run plugin:build`; the bundle inlines `@kanmer/core`, so a core-only change makes `plugin:check` fail until it is regenerated. 39 tools, bytes match. |

Production callers inherit the fix with no code change: the MCP server's
`update_item`, `move_item`, `set_ticket_doc`, `append_scratch` and the GUI IPC
handlers (`apps/gui/src/main/index.ts:1156/1161/1335`) all write through the
same `KanmerStore`.

## Governing docs

- **FRD-030 — meets.** "Lease acquisition and renewal are atomic and
  revision-safe" and AC2's "stale renewal returns `LEASE_EXPIRED` or
  `REVISION_CONFLICT` *without overwrite*" were only true against other lease
  verbs; the lease record was still reachable by any unlocked writer. Making
  every ticket writer share the lock is what makes the one-live-writer record
  durable, including the CORE-124 batch stamps that live on sibling tickets. No
  FRD text modified; no new ADR — this implements an already approved property
  rather than deciding a new one.

## Verification

Failing-first, run against the **unmodified** store with the new tests present
(`npx vitest run src/claims.test.ts -t "CORE-125" --root packages/core`, exit 1):

```
× loses neither the lease record nor a concurrent updateItem from another store
  → expected 'A' to be 'edited during the renewal'   (the lease write reverted the concurrent edit)
× keeps a lease renewal that lands mid-updateItem: the stale writer never reverts the lease record
  → expected 1 to be 2                               (the stale writer reverted lease_revision 2 → 1)
```

With the fix, in `.worktrees/core-125` at 437772d4:

| Command | Exit | Result |
|---|---|---|
| `npm test -w @kanmer/core` (baseline, before any edit) | 0 | 19 files, 417 tests, 69.97 s |
| `npm test -w @kanmer/core` | 0 | 19 files, 420 tests, 75.15 s (a second run of the same tree measured 93.40 s — host variance, see Risks) |
| `npm run build` | 0 | core + mcp-server, `check-browser` clean |
| `npm run typecheck` | 0 | all workspaces (requires `npm run build` first: mcp-server typechecks against core's `dist`) |
| `node packages/mcp-server/src/smoke.mjs` | 0 | 306/306 |
| `npm run smoke:protocol` | 0 | 50/50 |
| `npm run plugin:check` | 0 | 39 tools match, bundle bytes match, isolated handshake 39 |
| `npm run verify` | 1 | core 420/420, gui 53 files/520 tests, mcp http suite pass; the only failures are the two known-flaky `scripts/antigravity-plugin-config.test.mjs` cases (EBUSY on a temp `Kanmer\bin`), which fail identically on the unmodified main checkout — host quirk, not a regression. Hosted `verify` is authoritative. |

Lock-cost measurement (200 sequential `updateItem` calls, throwaway benchmark,
not committed): **6.08 ms/call before, 17.34 ms/call after** on this Windows
host — the cost of one exclusive-create lock cycle (owner marker + lock file +
two removals). The section itself contains only file-local reads, the CAS, the
gate evaluation and the write, far below `withExclusiveFileLock`'s ~2.145 s
competing-acquirer retry budget, and a crashed holder is still reclaimed after
the 30 s stale window, so a stale lock cannot wedge the GUI.

## Deviations

1. Base is `origin/main` f3060b06, not the plan's 9c9a6980: GUI-144 (#294)
   merged during planning. It touches no core file in this ticket's scope.
2. The plan's Expected-files table said the plugin bundle is rebuilt "only if
   `packages/mcp-server` changes". That is wrong — the bundle inlines
   `@kanmer/core`, so `plugin:check` failed until `npm run plugin:build` was
   run. The regenerated bundle is committed, matching the CORE-115/CORE-124
   precedent.
3. The plan named one failing-first test; three were written (the second proves
   the loss in the lease-record direction the ticket names, the third asserts
   the nested paths do not deadlock). No test was weakened or removed.

## Risks / follow-ups

- **Every board write now costs a lock cycle (~+11 ms/call on this host).** One
  IPC call per GUI action, so it is imperceptible interactively. The visible
  case is `computeOrder`'s first positional move in a large column, which
  materialises `order` on every sibling: on a 344-row column that is a few
  seconds of *interleaved* work (each write locks and releases separately), not
  a multi-second hold of the board lock. If this ever matters, the fix is a
  batched materialisation, not a longer hold.
- **Core suite wall time is noisy on this host** (75.15 s and 93.40 s for the
  same tree, 69.97 s at baseline). The per-file split shows `docs.test.ts` and
  `staleness.test.ts` getting *faster* in the slower run, so the spread is host
  load rather than lock cost; the micro-benchmark above is the honest number.
- **`deleteItem` is deliberately out of scope.** It removes a ticket folder with
  no CAS at all and then runs N link-cleanup `updateItem`s (each of which is now
  serialised). Locking the whole verb would hold the board lock across that
  loop. Its missing CAS is a separate defect and deserves its own ticket.
- **The re-entrancy guard is context-scoped, not instance-scoped.** Two
  independent operations in one process still exclude each other; only a nested
  acquire inside a section the *same* async context already owns is skipped. A
  future fire-and-forget write started inside a critical section and awaited
  outside it would inherit "held" and skip locking — no such call exists today,
  and the guard's doc comment says so.
- Untouched accepted risk from CORE-115: F-004 (renew compatibility lane owner
  check) and F-008 (`force` bypasses `LEASE_LIVE`). The hardening candidates
  that review parked onto this ticket — F-010 release lease fencing, F-012
  repo-relative `lease_workspace`, F-014 detached-worktree refusal, F-015
  heartbeat/expiry validation — are behavioural lease changes rather than
  serialisation and are still unowned; they belong on a follow-up ticket.

## Verification hand-off

On merged `main`, at the merge SHA:

1. `npm ci` (or reuse the worktree install), then `npm run build`.
2. `npm test -w @kanmer/core` — expect exit 0, 19 files, **420** tests, including
   the three CORE-125 cases:
   - *loses neither the lease record nor a concurrent updateItem from another store*
   - *keeps a lease renewal that lands mid-updateItem: the stale writer never reverts the lease record*
   - *re-enters the lock on nested writes instead of deadlocking, and leaves no lock behind*
3. `npm run typecheck` — exit 0 (build first).
4. `node packages/mcp-server/src/smoke.mjs` — 306/306.
5. `npm run smoke:protocol` — 50/50.
6. `npm run plugin:check` — 39 tools match, bundle bytes match.
7. `npm run verify` — expect the two `scripts/antigravity-plugin-config.test.mjs`
   EBUSY failures on this host only; treat the hosted `verify` check on the PR
   as authoritative.

No UI change, so no screenshots. Watch for a *hang* rather than a failure in any
suite: that would mean the re-entrancy guard let a nested acquire through.
