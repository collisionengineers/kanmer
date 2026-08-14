# closeTab silently discards unsaved editor edits (bypasses Phase 5 §5.3 dirty guard)

- **Severity:** normal
- **PR:** #12 (Phase 5: GUI multi-project)
- **File:** `apps/gui/src/renderer/src/App.tsx:180-202`
- **Source bug ids:** bug_006

## Follow-up verdict — validated

The active editor is the only mounted editor, and its dirty callback writes the
app-level ref. Closing that active tab executes `closeProject`, deletes saved UI
state, sets the dirty ref false and switches/unmounts. Neither `pendingNav` nor
`pendingProject` is populated, and `beforeunload` does not apply to a project tab.
The data-loss path is therefore direct and reachable through both close gestures.

## Summary

`closeTab` (App.tsx:180-202) silently discards unsaved editor edits: line 186 explicitly zeros `editorDirty` to preempt the guard, and line 191 calls `openProject` directly rather than routing through `requestOpen`, so a middle-click (TabStrip.tsx:46-51) or × click (TabStrip.tsx:58-67) on a tab with pending edits loses them with no confirmation. This is silent data loss on a routine interaction — exactly the class Phase 5 §5.3 says `closeTab` must close by routing through the same discard modal as `trySelect`.

## Detail

Line 186 does `if (projectId === rootRef.current) editorDirty.current = false` under the comment *"Editing is lost on close either way; report clean so no stale guard fires"* — a documented shortcut past the guard, not a justification. Then line 191 calls `openProject(next.projectId)` directly to switch to the surviving tab, rather than routing through `requestOpen({kind:'path',...})` which would fire `pendingProject` and the `ConfirmModal`. Both middle-click and the × button route through `onClose → closeTab`, so a single accidental input loses unsaved work.

**Why the existing code doesn't prevent it.** The `trySelect`/`pendingNav` guard at `App.tsx:205-213` only fires when `editorDirty.current` is true — but `closeTab` zeros the flag *before* the switch. `beforeunload` (`App.tsx:220-225`) only handles the actual window-close event; closing a project tab doesn't fire it. And the Phase 3 audit-A1 fix (`requestOpen` at `App.tsx:75-91`) only guards *user-initiated* project opens — the internal switch inside `closeTab` skips it entirely.

**What Phase 5 required.** The Phase 5 plan (`docs/plans/kanmer-v2/phase-5-gui-multi-project/plan.md` §5.3) states verbatim: *"The generalized `pendingNav` gains `kind: 'select'|'tab'|'close'`; `trySwitchTab`/`closeTab` route through the same discard modal as `trySelect`."* The Verification section repeats it: *"unsaved edit + switch/close → discard modal (dirty dot visible on the tab)."* This is the pledged behavior of the phase, directly mirroring audit A1 that Phase 3 fixed at the project-switch surface via `requestOpen`. The tab-close surface regresses to the same class of bug.

### Step-by-step proof

1. Open project A and project B (two tabs).
2. Focus project A's tab and open ticket `TICK-001` in the editor.
3. Type into the Body field — `editorDirty.current` flips to `true` (via the Editor's `onDirtyChange`, wired at `App.tsx:958-960`).
4. Middle-click project A's tab in the strip.
5. `TabStrip` `onAuxClick` (line 46-51) → `onClose(projectId)` → `closeTab('A')`.
6. Line 186 sets `editorDirty.current = false`. Line 191 calls `openProject('B')` directly.
7. `openProject` at `App.tsx:144-176` snapshots the outgoing tab's UI state and calls `setSelectedId(saved?.selectedId ?? null)` — the ticket is deselected, the Editor unmounts. No modal, no save, no toast. The edited text is gone.

For comparison, doing the same three steps then clicking a *different card* (the `trySelect` path) correctly opens `ConfirmModal` (`App.tsx:1086-1097`) and asks whether to discard.

### Impact

Silent data loss on an easy accidental input. Middle-click is the standard "close this tab" gesture on every browser and every native tabbed app; a user editing a ticket who reflexively middle-clicks the wrong tab (or clicks ×) loses every unsaved field with no prompt, no toast, and no undo. `TabStrip.tsx:22-24` even documents *switching* as dirty-guarded but says nothing about *close*, because close isn't guarded.

## Fix

Extend the existing `pendingNav` state with a `kind: 'close'` variant (or introduce a sibling `pendingClose`) and gate `closeTab` on `editorDirty.current` the same way `trySelect` does: if dirty, stash the target projectId and open `ConfirmModal`; on Discard, zero `editorDirty`, resolve the pending close, and perform the actual tab drop + switch. For the follow-up switch to the next remaining tab, call `requestOpen({kind:'path',path:next.projectId})` instead of `openProject` directly so that path also honors the guard (belt-and-braces once the pre-close discard is in place). This is the exact pattern `requestOpen` already uses for the project-switch surface, so it's a small, symmetric extension rather than new machinery.

## Resolution plan

1. Split `closeTab` into a guard and a side-effecting `performCloseTab`. The guard
   detects only the active dirty tab, records `{kind: "close", projectId}` in the
   generalized pending-navigation state, and returns without closing the main
   context or deleting saved state.
2. Extend the existing confirmation modal dispatcher for `select`, `project` and
   `close`. On confirm, clear the dirty ref once and call `performCloseTab`; on
   cancel, leave the tab, editor and text untouched.
3. In `performCloseTab`, calculate the survivor before closing, persist/remove the
   exact context, then activate the survivor through the already-guarded project
   open path. Closing an inactive tab remains immediate because it cannot own the
   mounted dirty editor.
4. Disable or coalesce repeated close gestures while a close decision is pending
   so `closeProject` cannot run twice.
5. Extract the close decision/state transition into a pure renderer helper and
   add tests for active-dirty cancel/confirm, active-clean, inactive, last-tab and
   repeated-close cases. Add a GUI interaction test if a DOM harness is adopted.

```diff
-if (projectId === rootRef.current) editorDirty.current = false;
+if (projectId === rootRef.current && editorDirty.current) {
+  setPendingNav({ kind: "close", projectId });
+  return;
+}
+performCloseTab(projectId);
```

Acceptance: body and document edits survive Cancel; Discard closes exactly once;
no clean-tab path gains an unnecessary prompt.
