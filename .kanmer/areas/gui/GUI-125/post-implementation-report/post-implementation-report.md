# Post-implementation report — GUI-125

## Summary

Removed the two residual priority-filter references from the renderer's `Filters` type and active-filter calculation. No replacement filter was added, and the existing `defaultPriority` preference persistence remains unchanged in the shared IPC contract, main settings store, and App settings hand-off.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/renderer/src/components/FilterBar.tsx` | Removed `Filters.priority` and the corresponding `filters.priority` active-state check. | Eliminates dead priority-filter state without changing the remaining area/group/assignee/label/search filters or Clear behavior. |

## Governing docs

`docs/functional/frd/FRD-008-priority-removal.md` R1 requires the GUI to render no priority filter surface. The renderer now has no `priority?:` filter member or `Filters.priority` use. The ticket's explicit compatibility boundary was honored: `defaultPriority` remains source-backed in `shared/ipc.ts`, `main/settings.ts`, and the App-to-Settings preferences hand-off; it is used for new-ticket defaults, not filtering.

No governing document was modified, and no replacement priority filter was introduced.

## Risks / follow-ups

- This is intentionally limited to dead filter state. Item migration/UI compatibility references to historical `priority` values and the intentional `defaultPriority` preference remain outside scope.
- Focused tests pass. The full GUI test/typecheck/build rails remain INCONCLUSIVE because the current checkout resolves unrelated provider/core integration failures; exact failures are recorded in ticket scratch.

## Verification hand-off

On merged `main`, run:

```text
npx vitest run src/renderer/src/lib/views.test.ts src/renderer/src/lib/board.test.ts  # from apps/gui; expect 38/38
npm test -w @kanmer/gui
npm run typecheck -w @kanmer/gui
npm run build -w @kanmer/gui
rg -n "Filters\.priority|priority\?:" apps/gui/src/renderer/src  # expect no matches
rg -n "defaultPriority" apps/gui/src/shared/ipc.ts apps/gui/src/main/settings.ts apps/gui/src/renderer/src/App.tsx
```

The final `defaultPriority` command should continue to show the existing IPC type, settings default/load/patch paths, and App preferences hand-off.
