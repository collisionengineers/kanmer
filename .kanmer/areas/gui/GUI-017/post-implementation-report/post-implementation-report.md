# Post-implementation report

## Audit result

GUI-017's implementation is already merged in PR [#25](https://github.com/collisionengineers/kanmer/pull/25), whose implementation commit is 6e21ac2ba1ec52292af47d99f2c9020ed7712817 and whose merge commit is 39080d7f2d4deed02671f85674c4ae2c2179d4a0. I took the live Implementing ticket without force in .worktrees/gui-017 on gui-017-in-app-manual, audited the merged implementation on current main, and made no source changes and no new PR.

The audited branch was fast-forwarded to current origin/main at d473b6fa542d28439e69e9939d7721467cddd800; its only intervening commit after the first audit was an unrelated docs template change. The manual implementation and its later DOC-007 reconciliation are unchanged.

## Reconciliation against FRD-024

PR #25 supplied the viewer, Help menu/F1 entry, bundled generated artifact, search, shortcuts table and tests. The later merged DOC-007 change (19244f62) reconciled the original FRD-derived/stub pipeline with the amended FRD-024: authored user chapters now live under docs/manual/, only shortcuts are generated, the artifact is committed, and the build rejects missing/stub/spec-shaped chapters. The current generated manual has 22 chapters because later merged remote-access chapters are also included; those pre-existing chapters were not changed in this GUI-017 audit.

The original checklist's Settings-tab ? item is not a defect: GUI-074/GUI-081 withdrew that contextual affordance, and current FRD-024 R4 records the withdrawal. F1 and Help remain the supported entry points. The shortcut handler derives view ids from VIEW_IDS in apps/gui/src/renderer/src/lib/views.ts; the old VIEW_LABELS/parallel-array wording is historical.

## Deterministic evidence

| Command | Exit | Result |
|---|---:|---|
| npm run check:manual | 0 | manual: up to date (22 chapters) |
| npm run test -w @kanmer/gui -- --run src/renderer/src/manual/manual.test.ts | 0 | 1 file, 11 tests passed |
| npm run test -w @kanmer/gui | 0 | 37 files, 352 tests passed |
| npm run typecheck | 0 | core, mcp-server, ui and gui typechecks passed |
| npm run build -w @kanmer/gui | 0 | electron-vite main, preload and renderer bundles built |
| npm run verify:docs | 0 | generated manual and documentation checks passed |
| npm run build:core | 0 | generated the missing core dist used by script tests |
| node --test scripts/auto-run-state.test.mjs scripts/release-notes.test.mjs | 0 | 2 targeted tests passed after the required core build |
| static token scan over Manual.tsx and chapters.generated.ts | 0 matches each | no runtime fetch/XHR/http(s) token |

The full root npm test was also run before the core build. Core, GUI and MCP HTTP rails passed, but the command exited 1 in scripts/auto-run-state.test.mjs and scripts/release-notes.test.mjs because packages/core/dist/index.js was absent in the fresh worktree. That exact failure is preserved; npm run build:core followed by both targeted tests exited 0. A later pass does not erase the earlier failed full-rail result.

## Manual/host evidence

The renderer component was not opened interactively. The requested boot smoke was attempted with KANMER_SMOKE=1 npx.cmd electron . --user-data-dir=.tmp-gui017-smoke after the GUI build, but exited 1 before launch with the exact environment error: Electron failed to install correctly, please delete node_modules/electron and try installing again. I did not delete or mutate the shared dependency tree. Therefore fresh-install F1/search/theme rendering and screenshot evidence are **INCONCLUSIVE**, not PASS. No provider or GUI-016 evidence is claimed.

## Scope and handoff

No source diff, commit, or new PR was needed because PR #25 is already merged and its later DOC-007 reconciliation is present on main. Checklist and this report are the only ticket-document updates. GUI-017 is ready for independent review at the Review boundary.
