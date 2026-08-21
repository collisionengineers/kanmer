# Post-implementation report — GUI-010

*Author report before independent review/merge. Proof belongs to kanmer-verify on merged main.*

## Summary

The reference/attachment lifecycle is present and verified end to end: core copies files into the gate-exempt `reference/` folder with collision suffixing and exact filename containment; typed IPC and main handlers expose picker/open/remove; the Editor renders the list, drag/drop target, gate-exempt hint, and named confirmation; and the built MCP server enumerates the result. This lane audited the historical implementation on base and fixed two core safety gaps: nested removal names and concurrent same-name copy races.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/store.ts` | Centralized reference filename validation for add/remove; made copies exclusive with retrying `-2`, `-3`, … suffixes. | Removal must reject nested paths just like add, and concurrent callers must never overwrite a file selected by another caller. |
| `packages/core/src/store.test.ts` | Added concurrent same-name and nested-removal regressions. | Prove collision safety under contention and exact filename containment. |
| `apps/gui/src/renderer/src/components/Editor.test.tsx` | Added rendering/action coverage for attachment list, open, confirmed remove, picker, and add dispatch. | Keep the UI wiring exercised without pretending to prove native drag/drop. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Rebuilt from the changed core/server sources. | The committed MCP artifact must carry the core safety fix. |
| Existing base IPC/renderer lifecycle | Audited: typed picker/add/open/remove channels, main `shell.openPath`, drop zone, list, confirmation, and gate-exempt hint were already present. | Avoid duplicating the historical GUI-010 implementation or absorbing GUI-105 document-inventory work. |

## Governing docs

- `docs/functional/frd/FRD-004-reference-files.md` R2: users can add, list, open externally, and remove reference inputs; collisions do not silently overwrite and removal is confirmed in the UI.
- `docs/functional/frd/FRD-003-document-storage.md` T5: `reference/` remains gate-exempt; the core test and Editor hint preserve that contract.
- The approved plan keeps containment in core and native picker/open behavior in main. No GUI-105 exact document inventory changes were made.

## Risks / follow-ups

- The ticket wording says `get_item` should enumerate filenames, but the existing MCP response only reports `docs.reference`; `get_doc_gates` enumerates the actual names. I did not change that MCP surface inside GUI-010; it needs a separate MCP ticket/release rail if required.
- No real GUI session was available for native drag/drop or binary open/remove proof. The deterministic Editor picker/open/remove test and core→built-MCP probe pass; manual visual proof remains INCONCLUSIVE.
- The first boot-smoke attempt exited 1 because Electron's binary was absent after `npm install --ignore-scripts`; this failure is retained. After `npm rebuild electron`, the same smoke exited 0.
- GUI-105, GUI-015, GUI-016, GUI-017, provider registration, and unrelated provider work were not touched.

## Verification hand-off

On merged `main`, run:

- `npm test --workspace @kanmer/core` — expected PASS, 258 tests.
- `npm test --workspace @kanmer/gui` — expected PASS, 351 tests across 37 files.
- `npm run typecheck` — expected exit 0.
- `npm run build --workspace @kanmer/gui` — expected exit 0.
- `npm run plugin:build` then `npm run plugin:check` — expected exit 0 with bundle bytes matching.
- Run the temporary core→built-MCP enumeration probe against a disposable board — expected PASS.
- From `apps/gui`, run `KANMER_SMOKE=1 KANMER_OPEN=<fresh-project> npx electron . --user-data-dir=<fresh-user-data>` — expected exit 0.
- `git diff --check` — expected exit 0.
- If a disposable Windows GUI session is authorized, drag a real PNG, open it, confirm the filename, and remove it; record the result as PASS or INCONCLUSIVE.

Observed in this lane: focused core reference 6/6; focused Editor reference 1/1; core 258/258; GUI 351/351; typecheck/build/plugin rails/e2e/diff-check PASS; boot smoke retained first exit 1 setup failure and second exit 0 after Electron rebuild.

## Independent review follow-up

The review finding that `referencePath()` canonicalized before enforcing the plain-filename contract is fixed. It now rejects any candidate where `path.basename(candidate) !== candidate` before `path.resolve()`, so `foo/../mockup.png` cannot resolve inside `reference/` and bypass the safety rule. The add and remove regression coverage both assert rejection.

Review-fix commit: `60705980` (`fix(gui): reject normalized reference paths`), pushed to PR #133. Re-run evidence: focused core reference 6/6; focused Editor reference 1/1; full core 258/258; full GUI 351/351 across 37 files; all-workspace typecheck exit 0; GUI build exit 0; plugin:build and plugin:check exit 0; boot smoke exit 0 after the retained initial missing-Electron failure and `npm rebuild electron`; `git diff --check` exit 0. Manual visual drag/drop/open/remove proof remains INCONCLUSIVE. No GUI-105/015/016/017, provider, or unrelated scope was added.
