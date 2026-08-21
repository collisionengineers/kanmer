# Proof — GUI-017

Verified on merged `main` at `d473b6fa542d28439e69e9939d7721467cddd800`.

## Traceability

The implementation is historical PR [#25](https://github.com/collisionengineers/kanmer/pull/25), implementation `6e21ac2ba1ec52292af47d99f2c9020ed7712817`, merged as `39080d7f2d4deed02671f85674c4ae2c2179d4a0`. The merge commit is reachable from the verified main head. Later DOC-007 manual reconciliation is also present on main.

## Deterministic verification

- `npm run check:manual` — PASS: committed generated manual is current (22 chapters).
- `npm run test -w @kanmer/gui -- --run src/renderer/src/manual/manual.test.ts` — PASS: 11/11.
- `npm run typecheck` — PASS: core, mcp-server, ui and gui.
- `git diff --check` — PASS.
- The author's full GUI rail is recorded as PASS: 352/352 GUI tests, GUI build, `verify:docs`, and static no-network scan (zero runtime fetch/XHR/http(s) tokens in the manual component and generated artifact).
- The generated manual contains 22 bundled chapters and no runtime filesystem/network dependency. The shortcuts chapter is generated from `SHORTCUTS`; tests prove both directions of table↔chapter parity. View-switching uses `VIEW_IDS`, the same source as the rendered tabs.
- The initial full root `npm test` in the author worktree failed because `packages/core/dist/index.js` was absent; the repair build and targeted script tests passed. This failure remains part of the evidence and is not relabeled PASS.

## Boundaries

Interactive F1/search/theme rendering, screenshot evidence, and Electron boot could not be proven here: Electron exited before launch with its exact install-environment error. These are **INCONCLUSIVE**, not PASS. The shortcut parity test does not prove that the imperative handler cannot drift from the table; that accepted risk is documented in `shortcuts.ts` and the review report.

The stale pre-reconciliation proof text (12 chapters, old `VIEW_LABELS` references, and boot exit 0) was replaced during this Verifying pass.

## Closeout traceability

PR [#25](https://github.com/collisionengineers/kanmer/pull/25) merged at 2026-08-16T06:50:52Z as `39080d7f2d4deed02671f85674c4ae2c2179d4a0`.
