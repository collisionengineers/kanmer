---
kind: files
ticket: "GUI-126"
---

# Files — restore submenu parent focus

- `apps/gui/src/renderer/src/components/ContextMenu.tsx` — pass submenu parent metadata and handle ArrowLeft at the submenu boundary by returning focus to the parent item instead of invoking the root close handler.
- `apps/gui/src/renderer/src/components/ContextMenu.test.tsx` — add keyboard assertions for submenu entry, ArrowLeft parent restoration, and root Escape/click-away dismissal remaining unchanged.
- `docs/functional/frd/FRD-019-gui-shell.md` — update R6 evidence only after the implementation and tests prove parent-focus restoration.

No unrelated menu, renderer, or documentation changes are in scope.
