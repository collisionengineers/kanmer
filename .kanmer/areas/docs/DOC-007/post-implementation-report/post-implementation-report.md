# Post-implementation report — DOC-007 reconciliation

This is a current-main reconciliation of the already-merged DOC-007 implementation. No new source change was required and no duplicate PR is opened.

## Traceability and scope

The implementation is merge commit `19244f62d05ddf64ff7aa52ea4cf34342798013f`, PR [#49](https://github.com/collisionengineers/kanmer/pull/49), reachable from current `origin/main` `af61144ce743f74b2aba92fb0778588b0b9bedd0` (ancestor exit 0). The fresh worktree `.worktrees/doc-007` is clean on `doc-007-manual-reconcile`. The historical implementation's scoped files are already in main; later main commits add remote-access chapters and factual manual updates, which were audited but not absorbed as new DOC-007 work.

## Current manual state

Current `build-manual.mjs` emits 22 chapters: 21 authored chapters plus generated `shortcuts`. The original 19-chapter DOC-007 result remains intact, including the intentional absence of a separate `backlog` chapter after GUI-070 withdrew that view; current main adds `remote-access`, `remote-access-troubleshooting`, and `cloudflared`. `greenfield.md` is a separate later setup playbook and is not registered as an in-app chapter; it is outside this ticket.

Current generated lengths: minimum authored body 2,462 characters; minimum overall body 574 (generated shortcuts). A scan found zero `FRD-`/`ADR-`/`PRD-` tokens, `docs/…` paths, requirement lines, or authored body-level H1s.

## Checks on current main

| Command/check | Result |
|---|---|
| focused `manual.test.ts` | **PASS**, exit 0; 11/11 |
| first aggregate `npm test` in fresh worktree | **FAIL**, exit 1 only at `test:scripts`: core 263/263, GUI 352/352, HTTP 61/61 passed; scripts 78/80 because `packages/core/dist/index.js` was absent for `auto-run-state.test.mjs` and `release-notes.mjs` |
| `npm run build:core` | **PASS**, exit 0 |
| `npm run test:scripts` after core build | **PASS**, exit 0; 80/80 |
| `npm run build:manual` | **PASS**, exit 0; wrote 22 chapters |
| generated artifact diff | **PASS**, exit 0; clean after regeneration |
| `npm run check:manual` | **PASS**, exit 0; up to date (22 chapters) |
| `npm run typecheck` | **PASS**, exit 0; core, mcp-server, ui, gui |
| second aggregate `npm test` after core build | **PASS**, exit 0; manual 22 chapters, core 263/263, GUI 352/352, HTTP 61/61, scripts 80/80 |
| `git diff --check` | **PASS**, exit 0 |
| implementation ancestor check | **PASS**, exit 0 |

The first missing-core-dist failure is retained; the later pass does not erase it. The aggregate GUI run took the known Windows Git-test path but completed 352/352; no separate visual Electron acceptance was claimed.

## Governing document

`docs/functional/frd/FRD-024-in-app-manual.md` remains the sole governing ref. Current main retains DOC-007's hand-written compiled pipeline, 22-chapter current list, guard rules, and `check:manual` wiring. R4's current contextual-help disposition remains owned by GUI-074/GUI-081; this lane did not alter it.

## Honest limits and follow-up

The historical proof records the six guard fixtures and a partially mechanized rendering review, but explicitly says its author was also the reviewer. This reconciliation did not claim independent in-app reading or rerun the destructive/temporary negative fixture; those remain for independent Review/Verify. The existing proof was not rewritten before review, consistent with proof being finalized on merged main after review. README drift, GUI-081/GUI-108 gate-help behavior, and any later remote-access content remain outside DOC-007 scope.

## What independent verification should confirm

1. Re-run the negative guard fixture with a temporary heading-only chapter and restore the tree cleanly.
2. Confirm the current generated artifact and chapter list on merged main.
3. Read the manual in the running app for user-facing correctness; record visual/live evidence or mark it INCONCLUSIVE.
