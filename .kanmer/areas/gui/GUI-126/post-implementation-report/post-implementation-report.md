# Post-implementation report — GUI-126

## Summary

Context-menu submenus now handle `ArrowLeft` locally: the active submenu closes, focus returns to the parent menu item, and the root menu remains open. Root `Escape` and click-away dismissal remain whole-menu behaviors. Focused keyboard tests and the full renderer suite pass, and FRD-019 R6 now records the implemented behavior and test evidence.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/renderer/src/components/ContextMenu.tsx` | Store the parent submenu button while opening a child panel; pass a local back handler that closes the child and focuses that button; handle nested `ArrowLeft` without invoking root `onClose`. | Restores expected parent focus while preserving root dismissal and submenu placement/roles. |
| `apps/gui/src/renderer/src/components/ContextMenu.test.tsx` | Add keyboard assertions for submenu entry, `ArrowLeft` parent restoration, root `Escape`, and cleanup between portal renders. | Proves the defect fix and protects the existing whole-menu dismissal behavior. |
| `docs/functional/frd/FRD-019-gui-shell.md` | Replace the stale R6 “not built/native menu” evidence with current renderer wiring, behavior, and test references. | Keeps the governing evidence aligned with the shipped ContextMenu implementation, without broadening the FRD. |

## Governing docs

FRD-019 R6 requires renderer-drawn themed menus with keyboard navigation, submenu behavior, ARIA roles, placement, and dismissal. The implementation retains the existing portal, viewport placement, submenu flipping, roles, and root Escape/click-away behavior while adding the missing parent-focus transition. The R6 evidence now points to the current Board/App/ContextMenu wiring and `ContextMenu.test.tsx` assertions. No unrelated menu feature or governing document was changed.

## Risks / follow-ups

- The fix covers nested submenu keyboard back-navigation only; it does not change mouse hover, selection, or root dismissal semantics.
- Full GUI typecheck/build remain INCONCLUSIVE because the current workspace resolves unrelated core/provider integration failures. The renderer-only web typecheck passed, and exact failures are recorded in scratch.

## Verification hand-off

On merged `main`, run:

```text
npx vitest run src/renderer/src/components/ContextMenu.test.tsx  # from apps/gui; expect 3/3
npx vitest run src/renderer/src                                # expect 28 files / 207 tests or updated counts
npx tsc --noEmit -p tsconfig.web.json                          # renderer-only typecheck
npm run typecheck -w @kanmer/gui                              # record any unrelated node-project baseline failure
npm run build -w @kanmer/gui
```

Manual GUI evidence, if available: open a card submenu, press `ArrowLeft`, confirm only the submenu closes and the parent item retains focus, then confirm root `Escape` and click-away still close the entire menu.
