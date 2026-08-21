# Checklist

- [x] `addReference` copies into `reference/`, containment validated in core
- [x] collision suffixing `-2`, `-3`
- [x] `removeReference` validates the name the same way
- [x] core tests: containment rejection, collision, removal
- [x] three IPC channels typed end to end
- [x] native multi-select picker
- [x] open via `shell.openPath`
- [x] remove confirms and names the file
- [x] drag-and-drop onto the editor
- [x] Attachments list renders from `docsInfo.references`
- [x] one line saying references never satisfy a gate
- [x] end-to-end: added through core, enumerated by the built MCP server
- [x] plugin rebuild (core changed)

Verification evidence: focused core reference suite 6/6; focused Editor reference test 1/1; full core Vitest 258/258; full GUI Vitest 351/351 across 37 files; root `npm run typecheck` exit 0; GUI build exit 0; plugin:build and plugin:check exit 0; core→built-MCP enumeration probe PASS; `git diff --check` exit 0. Boot smoke first exited 1 because Electron's binary was absent after the intentional `npm install --ignore-scripts` dependency setup; `npm rebuild electron` exited 0 and the rerun exited 0. Manual visual drag/drop/open/remove proof was not available and remains an explicit verification follow-up.
