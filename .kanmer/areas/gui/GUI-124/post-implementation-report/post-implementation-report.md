# Post-implementation report — GUI-124

## Summary

Background projects restored during GUI startup are now processed independently: a failed `openProject` call produces a safe, non-blocking toast while later saved tabs continue opening. The active project restore and session persistence flow remain unchanged, and the focused session helper test proves both the failure callback and the surviving tab.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/renderer/src/App.tsx` | Route background-tab restoration through `restoreBackgroundTabs`; show a 12-second toast naming only the saved project folder when a restore fails. | Makes the previously swallowed failure observable without turning startup into a blocking modal or exposing the full local path/error. |
| `apps/gui/src/renderer/src/lib/session.ts` | Add the generic async `restoreBackgroundTabs` helper that skips the active tab, reports each failure, and continues. | Keeps session orchestration testable and preserves independent restore semantics. |
| `apps/gui/src/renderer/src/lib/session.test.ts` | Add a regression test with one rejected background project and one successful project. | Proves the advisory callback is invoked, the failure is not swallowed, the later tab opens, and the active tab is not opened as a background tab. |

## Governing docs

`docs/functional/frd/FRD-019-gui-shell.md` R1 requires session restore and per-project tab contexts. The production caller remains the startup restore effect in `App.tsx`; the change only makes a failed background restore visible and leaves the active restore and tab persistence path intact. This also supports R2's no-silent-loss intent by reporting a project that could not be restored rather than dropping the failure silently. No governing document was modified.

## Risks / follow-ups

- A stale/unreadable saved project still cannot be opened automatically; the toast explains that it remains closed for this session. Reopening remains available through the normal project picker.
- The toast intentionally uses only the saved project's final folder name and a generic message; it does not display a full path or raw error.
- The focused test passes. The full GUI test rail, GUI typecheck, and GUI build remain INCONCLUSIVE because the `origin/main` baseline has unrelated provider/core integration failures (`dispatch.ts`, `providers.ts`, `kanmerGit.ts`) before this renderer code is checked.

## Verification hand-off

On merged `main`, run:

```text
npx vitest run src/renderer/src/lib/session.test.ts   # from apps/gui; expect 3/3
npm test -w @kanmer/gui                              # retain any pre-existing baseline failures separately
npm run typecheck -w @kanmer/gui
npm run build -w @kanmer/gui
```

If a manual GUI run is available, start with two saved project tabs, make one saved path unreadable, restart the app, and confirm the toast appears while another saved project opens and remains usable. Confirm the failed path is not shown in full and no modal blocks startup.
