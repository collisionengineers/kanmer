# CORE-052 post-implementation report

## Result

CORE-052 implements the four bounded remediation findings from the cumulative CORE-043 review. The open GUI now verifies a live board worktree against the requested destination before applying a branch preference, rejects stale or arbitrary branch observations without renaming, preserves paused/error state across a valid administrator handoff, and documents the protected-branch Actions-variable handoff consistently across the UI, workflow, and manual.

## Scope and files

- apps/gui/src/main/kanmerGit.ts: requested-destination refresh semantics and explicit mismatch state; valid branch observation updates the cached branch without clearing an existing sync error or pause.
- apps/gui/src/main/index.ts: passes the requested destination into refresh and retains the current preference and skips automatic renames when any open board reports a mismatch.
- apps/gui/src/main/kanmerGit.test.ts: real-Git coverage for arbitrary unexpected branches, a stale cached branch when the requested destination differs, and paused/error preservation.
- apps/gui/src/renderer/src/components/Settings.tsx: names KANMER_BOARD_BRANCH in the protected handoff warning.
- .github/workflows/pr.yml: clarifies that repository administrators must set KANMER_BOARD_BRANCH to the destination before retargeting protection.
- docs/manual/board-sync.md, docs/manual/settings.md, docs/manual/troubleshooting.md: aligned protected/non-protected rename instructions and the closed-project reconciliation boundary.
- apps/gui/src/renderer/src/manual/chapters.generated.ts: regenerated from the manual sources.

## Traceability

- Base cumulative CORE-043 head: 11930038542d402865bb26a23787d7d3cad3e2c5.
- CORE-052 branch: core-052-board-refresh-state.
- This child is intended to target the open CORE-043 branch core-043-protection-retarget; no merge is performed by the author.

## Checks

- npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts: exit 0, 19/19 PASS.
- npm run build:manual: exit 0, 22 chapters generated.
- npm run check:manual: exit 0, current.
- npm run verify:docs: exit 0.
- npm run build:core: exit 0.
- npm run test:scripts: first attempt exit 1 because the fresh worktree had no packages/core/dist/index.js; after the recorded core build, rerun exit 0, 89/89 PASS. The initial failure is preserved rather than erased.
- Full npm run test -w @kanmer/gui: exit 1, 299/300 tests passed. Four suites failed during collection because the current stacked base has the unrelated shared-dispatch antigravity / missing dispatchDeliverableProven baseline; the one dispatch expectation also reflects that baseline. No CORE-052 test failed.
- npm run typecheck: exit 1 on the same pre-existing dispatch export/options/provider baseline in MCP server and GUI; no CORE-052 diagnostic.
- npm run build -w @kanmer/gui: exit 1 because the current @kanmer/core build lacks the unrelated dispatchDeliverableProven export consumed by GUI dispatch.
- npm run plugin:check: exit 1/refused because the linked worktree resolves @kanmer/core to the main checkout rather than the ticket checkout; this is an environment/setup limitation, not a plugin-sync assertion.
- git diff --check: exit 0.
- No live GitHub protection retarget or packaged visual/manual interaction proof is claimed; those remain INCONCLUSIVE.

## Review handoff

The implementation is ready for independent review on the dedicated branch. The reviewer must assess the stacked child against CORE-043, then merge only through the independent review path.
