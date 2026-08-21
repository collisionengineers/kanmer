# Post-implementation report — GUI-105

## Summary

Implemented the GUI ticket-document path selector in apps/gui/src/renderer/src/components/Editor.tsx with focused tests in Editor.test.tsx and selector styling in styles.css. The selector consumes core's existing TicketDocsInfo.documentPaths inventory, groups only configured pipeline document types, displays accessible nested relative paths, prefers the conventional type index when present, and falls back to the first existing path or the conventional empty index. Scratch, reference, and assets remain outside the pipeline selector.

Exact selected paths flow through DocEditor load, save, preview, checklist checkbox, and conflict retry behavior. Switching paths while dirty uses the existing discard confirmation with the exact path. Selection reconciliation retains a valid path across live inventory refreshes and refreshes inventory after saves. Existing scratch behavior and .md labels remain intact.

## Verification

- git diff --check — PASS (exit 0).
- npm run test -w @kanmer/gui -- src/renderer/src/components/Editor.test.tsx — PASS (15 tests).
- npm run test -w @kanmer/gui — PASS (37 test files, 348 tests).
- npm run typecheck — PASS (core, mcp-server, ui, and gui workspace typechecks; exit 0).
- npm run build — PASS (core and mcp-server ESM/standalone builds; exit 0).
- npm run build -w @kanmer/gui — PASS (electron-vite main, preload, and renderer builds; exit 0). The existing gray-matter eval security warning was emitted by the build and did not affect the successful exit.

## Tests added

- Named-only research document opens by exact path.
- Nested duplicate basenames are independently selectable and conventional index wins.
- Exact named-path save uses the selected path and dirty switching confirms before discard.
- Empty document types expose the conventional index for creation.
- Live inventory refresh adds paths without changing the selected valid path.

## Scope and limitations

No new IPC, core, MCP, filesystem scan, arbitrary path creation/rename/deletion, binary asset handling, or document vocabulary was added. Manual visual verification of GUI-102's portable-connect research file is unavailable in this headless execution; the checklist leaves that item explicitly open for independent review/manual validation. No PR has been opened yet; the author stops at Review and will not self-review or merge.

## Traceability

- Branch/worktree: gui-105-document-path-inventory / .worktrees/gui-105
- Commit: d64000dd1d84138a54ff952ed1c80f18d23c8055
- Ticket: GUI-105
