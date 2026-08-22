# CORE-039 files

## Scope

- scripts/release-notes.test.mjs and its hermetic fixture/command setup.
- scripts/release-notes.mjs only if a narrowly scoped test seam is required.
- No changes to production release publishing, board storage, or unrelated CI rails.

## Evidence

- PR #145 hosted verify run 32543323809, job 96957305137, reached scripts tests after core/GUI/MCP rails.
- Node 20 clean checkout failed release-notes.test.mjs: release-notes.mjs printed "No board at D:\a\kanmer\kanmer\.worktrees\kanmer — nothing to draft from.", 79 passed / 1 failed.
- The test currently assumes a local .worktrees/kanmer board that is not present in GitHub Actions.

## Out of scope

- CORE-038's Windows-safe test enumeration (already implemented separately).
- MCP-041 supervisor retry and CORE-037 path identity fixes.
- Adding dependencies or weakening the PR-link assertion.
