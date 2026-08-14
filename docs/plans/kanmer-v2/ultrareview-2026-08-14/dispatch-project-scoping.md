# Dispatch tracking is not projectId-scoped — cross-project ticket id collisions block real dispatches and cancel the wrong agent

- **Severity:** normal
- **PR:** #12 (Phase 5: GUI multi-project) — dispatch code lives in Phase 7 (#10), but the multi-project rewrite is what introduces the collision; fix belongs where the two meet
- **File:** `apps/gui/src/main/dispatch.ts:22-30`
- **Source bug ids:** bug_016

## Follow-up verdict — validated

The complete trace agrees with the finding. `active` is a module-global
`Map<string, Handle>` keyed by `ticketId`; duplicate detection, insertion,
close cleanup and cancellation use that key. `DispatchStatus` has no `projectId`.
Although `CH.dispatchAgent` receives the project id, `main/index.ts` discards it
after selecting the store. Cancel and list IPC take no project id, and the drawer
reveals against the active tab. Independent stores allocate identical ids by
design, so this is a normal multi-project collision, not a malformed-data edge.

## Summary

The dispatch tracking layer keys its in-flight `active` Map, its `cancelDispatch` lookup, and its `listDispatches` output on `ticketId` alone — but Phase 5 made the app multi-project, and `TICK-001` is the default first id in every project. With two projects open, dispatching project B's TICK-001 while A's TICK-001 is running is spuriously refused (`dispatch.ts:82`), and cancelling B's (non-existent) dispatch actually **tree-kills project A's real agent** (`dispatch.ts:166`, IPC at `main/index.ts:576`) — a real data-safety failure for a 30-min background worker. The Dispatches drawer also aggregates rows globally with no project attribution (`DispatchStatus` in `shared/ipc.ts:121` has no `projectId`), so clicking a foreign ticket id silently no-ops.

## Detail

Phase 5 rewrote the GUI to hold a `Map<projectId, ProjectContext>` in main and thread `projectId` through every IPC/CRUD path. The dispatch tracking layer (Phase 7, `apps/gui/src/main/dispatch.ts`) was never re-scoped — its module-global `active` Map at line 22 is `Map<string, Handle>` keyed by `ticketId` only, and every code path that consults it does so with a bare ticket id:

- `dispatch.ts:82` — `if (active.has(ticketId)) throw new Error(...'already has a dispatch in flight.')`
- `dispatch.ts:167` — `cancelDispatch`: `const h = active.get(ticketId)`
- `dispatch.ts:40-42` — `listDispatches`: returns every entry with no per-project attribution
- `shared/ipc.ts:121-129` — `DispatchStatus` has `dispatchId/ticketId/provider/state/startedAt/exitCode/tail` but **no `projectId`** field
- `main/index.ts:573` — `dispatchAgent` receives `p` (projectId) but only uses it via `requireStore(p)`; the projectId never reaches the tracking layer or the emitted status
- `main/index.ts:576` — `cancelDispatch` IPC handler is `(_e, ticketId: string) => cancelDispatch(ticketId)` — no projectId parameter

The app ships with `board.ts:defaultBoardConfig()` setting `idPrefixes.ticket = "TICK"`, and the counter starts at 1, so essentially every fresh project gets a `TICK-001` — colliding ticket ids across projects is not the exception, it is the default.

### Step-by-step proof (the wrong-cancel scenario)

1. User has projects `A` and `B` open — both contain `TICK-001` (independent tickets in independent codebases).
2. User dispatches A's TICK-001. `main/index.ts:573` routes to `dispatchTicket(requireStore("A"), "claude", "TICK-001")`. `dispatch.ts:119` does `active.set("TICK-001", handleA)`. Project A's agent starts a 30-min background worker.
3. User switches to project B's tab and right-clicks TICK-001 → *Dispatch to agent*.
4. `dispatch.ts:82` checks `active.has("TICK-001")` — **true** (it's A's handle) — and throws `TICK-001 already has a dispatch in flight`. B's legitimate dispatch is refused.
5. Confused, the user opens the Dispatches drawer. It shows a `TICK-001` row (`App.tsx:992-1000`) — but the drawer aggregates globally and can't say whose. Wanting to unstick B, the user clicks **Cancel**.
6. `App.tsx:1004` calls `window.kanmer.cancelDispatch("TICK-001")`. `dispatch.ts:167` does `active.get("TICK-001")` → **handleA**. `dispatch.ts:170` calls `treeKill(handleA.proc)`, SIGTERMing the process group of **project A's real, running agent** — an unrelated 30-min background worker gets killed mid-flight.

A milder companion failure: `App.tsx:995` renders a plain button `onClick={() => trySelect(d.ticketId)}`. Clicking a drawer row for a *foreign* project's ticket id calls `trySelect` against the currently-active tab's items, which silently no-ops when the id doesn't exist there.

### Why existing code doesn't prevent it

The rest of the multi-project rewrite is careful: every board/item CRUD IPC takes a leading `projectId`, the watcher payloads carry `projectId`, `ownWrites` is per-context, `onReveal` focuses the payload's tab, etc. Dispatch is the outlier — its IPC signatures (`cancelDispatch(ticketId)`, `listDispatches()`) predate the rewrite and were left alone, and `DispatchStatus` never gained a `projectId` field. The `dispatchAgent` handler *does* receive `p`, but drops it after `requireStore(p)`.

### Impact

- **Cancel kills the wrong agent** — losing a 30-min background worker's work to a cross-project mis-cancel is real data loss.
- **Legitimate dispatches refused** — B can't use TICK-001 while A is running one.
- **Silent drawer misattribution** — the drawer misleads users about which project a running agent belongs to, and its buttons act on the active tab.
- **Hit rate: nearly 100% of multi-project users** — TICK-001 is the default first id in every project.

## Fix

1. Add `projectId: string` to `DispatchStatus` in `shared/ipc.ts:121-129`.
2. Key `active` by `` `${projectId}:${ticketId}` `` (or by `dispatchId`, with a `(projectId, ticketId) → dispatchId` secondary index for the in-flight guard/cancel-by-ticket lookup).
3. Take `projectId` on `dispatchTicket(store, provider, projectId, ticketId, opts)` and stamp it on the emitted `DispatchStatus`.
4. `cancelDispatch(projectId, ticketId)` (or `cancelDispatch(dispatchId)`) — update the IPC handler at `main/index.ts:576` and the preload wrapper.
5. `listDispatches(projectId?)` — scope by projectId at the IPC layer so each tab's drawer sees only its own project's rows.
6. Renderer: drawer clicks route through `openProject(status.projectId).then(() => trySelect(status.ticketId))` so foreign-project reveals no longer silently miss.

Incidental note: `dispatchId` at `dispatch.ts:94` uses a monotonic `++counter`, so log filenames won't actually collide across projects — a footnote that doesn't change the core defect.

## Resolution plan

1. Add `projectId: string` to `DispatchStatus` in `shared/ipc.ts` and carry it on
   every emitted snapshot. Prefer `dispatchId` as the cancellation identity; use
   a structured nested map (`Map<projectId, Map<ticketId, Handle>>`) for the
   one-in-flight-per-project-ticket guard rather than delimiter concatenation.
2. Change `dispatchTicket` to receive `projectId`, and update insertion, close
   cleanup and lookup paths together. The `KanmerStore` remains the data access
   dependency; `projectId` is dispatch identity and UI routing metadata.
3. Change the shared API, main IPC, preload and renderer client to
   `cancelDispatch(dispatchId)` and `listDispatches(projectId?)`. Reject an unknown
   dispatch id without falling back to a ticket-id lookup.
4. Scope the active tab's drawer to its project. For any intentionally global
   view, render the project name and switch/open that project before selecting its
   ticket.
5. Update spinner state to a project-scoped identity so a foreign `TICK-001`
   status event cannot mark the current card as running.
6. Add a lifecycle test with two stores/projects, both containing `TICK-001`:
   both start, have distinct rows, cancelling B kills only B, and each close
   removes only its own handle. Add IPC/preload type assertions for the new shape.

Core interface diff:

```diff
 interface DispatchStatus {
   dispatchId: string;
+  projectId: string;
   ticketId: string;
 }
-cancelDispatch(ticketId: string): Promise<boolean>;
+cancelDispatch(dispatchId: string): Promise<boolean>;
```

Acceptance is two simultaneous same-id dispatches with correct status, reveal,
cancel, timeout and scratch attribution in both projects.

## Remediation evidence

Remediated on PR #12 (`7160dd3`): dispatches carry `projectId`, use a
project-ticket secondary lock, list by project, and cancel by dispatch id. Focused tests passed.
