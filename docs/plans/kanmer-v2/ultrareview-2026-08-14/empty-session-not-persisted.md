# Closing the last project tab does not clear openTabs — stale session revives on next boot

- **Severity:** nit
- **PR:** #12 (Phase 5: GUI multi-project)
- **File:** `apps/gui/src/renderer/src/App.tsx:258-266`
- **Source bug ids:** bug_019

## Follow-up verdict — validated

The state transition and persistence contract confirm the report. `closeTab`
sets `tabs=[]` and `root=null`; the persistence effect then refuses to call the
API because `tabs.length > 0` is false. `main/settings.ts::setOpenTabs` accepts
and persists an empty array, so the suppression is solely in the renderer. Boot
prefers the stale non-empty `openTabs`, making resurrection deterministic.

## Summary

Closing the last project tab leaves the just-closed project persisted in `settings.json` and it auto-reopens on next launch. The persist effect at App.tsx:258-266 guards `setOpenTabs` with `if (tabs.length > 0)`, so an empty tab list never writes the empty session; on boot the fallback to `currentProject()` only fires when the persisted `openTabs` is empty, so the stale entry wins.

## Detail

When a user closes the sole open project tab (× button or middle-click), `closeTab` (App.tsx:181-202) filters to `remaining = []` and calls `setTabs([])`, then nulls out root/board/items. The persistence effect fires with the new deps (`tabs=[]`, `root=null`), but its guard `if (tabs.length > 0)` skips the write — so `settings.json` retains the *previous* `openTabs` array (containing the project that was just closed).

On next launch the boot effect at App.tsx:228-256 reads `s.openTabs` at line 232. Because it's still populated with the stale entry, `toOpen.length !== 0`, so the `currentProject()` fallback at lines 233-236 is skipped. The loop at 242-254 opens the persisted (deliberately-closed) project as the active tab.

### Step-by-step proof

1. Launch Kanmer, pick project A. `openTabs=[A]`, `activeTab=A` written to settings.json.
2. Close A's tab. `closeTab` sets `tabs=[]`, then `setRoot(null)`.
3. Persist effect fires with `tabs=[]`. Guard is false → `setOpenTabs` is **never called**. settings.json still has `openTabs=[A]`.
4. Quit Kanmer.
5. Relaunch. Boot effect reads `s.openTabs = [A]`, skips the `currentProject()` fallback, opens A. Project A is auto-reopened despite being deliberately closed.

No other code path persists an empty `openTabs`. `closeTab` doesn't call `setOpenTabs` directly, and no other effect writes the session field. The `> 0` guard was presumably added to avoid clobbering settings before initial hydration, but empty-after-close is a legitimate state that must be persisted.

### Impact

Session-persistence UX regression: a user cannot cleanly end a session — every quit-after-closing-everything resurrects the last-closed project on next boot. No data loss, no crash; workaround (close the tab again) is trivial.

## Fix

Either remove the `> 0` guard so an empty session is written (simplest — take care not to reintroduce the pre-hydration clobber it was guarding against), or add an explicit `void window.kanmer.setOpenTabs([], "")` in `closeTab` when `remaining.length === 0` (targeted). An empty tab list *is* the session state, and settings.json should reflect it.

## Resolution plan

1. Add an explicit `sessionHydrated` ref/state. Set it only after the initial
   settings restore attempt finishes, including the zero-tab and failed-tab cases.
2. Change the persistence effect to return only while hydration is incomplete;
   afterwards always call `setOpenTabs`, including `([], "")`.
3. Ensure closing the last tab updates both `tabs` and `root`; the effect remains
   the single persistence owner rather than adding a competing direct write in
   `closeTab`.
4. Decide and test fallback semantics explicitly: an intentionally persisted
   empty `openTabs` must not be repopulated from `currentProject`. Use a settings
   migration marker or distinguish absent legacy session data from a present
   empty session so backward compatibility does not undo the fix.
5. Extract session restore/persist decisions into pure tests covering initial
   render, legacy settings, one/many tabs, final close, failed restored paths and
   restart after an intentional empty session.

```diff
-if (tabs.length > 0) {
+if (sessionHydrated) {
   void window.kanmer.setOpenTabs(tabs.map(...), root ?? "");
 }
```

Acceptance: after closing the last tab, settings readback is exactly
`openTabs: []`, `activeTab: ""`, and the next launch stays on Welcome.
