# CORE-043 implementation notes

## Decision implemented

- Added `PROTECTED_BOARD_BRANCH = "kanmer-board"` in `apps/gui/src/main/kanmerGit.ts`.
- `renameBoardBranch` now refuses a requested change away from that branch before `check-ref-format`, `git branch -m`, push, or remote deletion, with the full operator retarget/local-worktree handoff in the error.
- `applyGitPreferences` detects open protected-default boards before any migration, leaves the persisted branch preference at the old value, applies the requested sync interval, and surfaces the refusal on each affected status. Non-protected branches retain the existing push-before-delete path.
- Settings, FRD-020, board-sync manual, settings manual, and generated manual were updated to state the retarget-first boundary.

## Rails

- PASS — `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts`: 14/14 tests, exit 0. This includes unchanged local HEAD/ref/remote/worktree assertions for protected-default refusal and custom-branch history/remote migration.
- PASS — `npm run check:manual`: generated manual up to date, exit 0.
- PASS — `npm run verify:docs`: links/fences/remote chapters/generated manual current, exit 0.
- PASS — `git diff --check`: exit 0.
- FAIL (pre-existing base/out-of-scope) — `npm run test -w @kanmer/gui`: 41 files passed, 4 suites failed to load/1 test failed; exact failures are missing shared dispatch provider `antigravity` in connect/providers/skillsVersion and dispatch.test expecting named-task validation but receiving `"antigravity" doesn't support background dispatch.` The CORE-043 focused file passed.
- FAIL (pre-existing base/out-of-scope) — `npm run typecheck`: @kanmer/mcp-server and @kanmer/gui report missing `dispatchDeliverableProven` export, unknown `verifyDeliverable` option/implicit-any status, and GUI provider type rejecting `"antigravity"`; exit 1.
- FAIL (pre-existing base/out-of-scope) — `npm run build -w @kanmer/gui`: electron-vite cannot resolve `dispatchDeliverableProven` from `packages/core/dist/index.js`; exit 1.

## External boundary

No GitHub credentials/API/App or live branch-protection mutation was available or attempted. Live protection-retarget proof is INCONCLUSIVE by design; no hosted claim is made.

- FAIL (pre-existing base/out-of-scope) — `npm run test:scripts`: 86/88 script tests pass; `auto-run-state.test.mjs` and `release-notes.test.mjs` fail because this clean `origin/main` worktree has no `packages/core/dist/index.js` artifact. No script files changed.

- PASS after the prerequisite build — `npm run build:core` exit 0, then `npm run test:scripts` 88/88 tests, exit 0. The earlier missing-dist failure remains recorded above as a typed attempt; the later pass does not erase it.

## PR handoff

- Pushed `core-043-protection-retarget` at `1a06ead17cca8f7a6c715db3a6f6fed6b3de5da6`.
- Opened PR #168: https://github.com/collisionengineers/kanmer/pull/168, base `main`.
- MCP item traceability records the full commit SHA and PR `168`.
- No merge, review, worktree cleanup, or CORE-046 change performed.

2026-08-22 — CORE-084 is the linked remediation for CORE-080 review finding F-001. It is based on CORE-080 head `0e1be5f32efad1da57ee27bd2a2fe80033976bd1` and adds only the missing production `syncProject` manual-Retry regression; it must be independently reviewed/merged into this cumulative branch before CORE-043 proceeds.

2026-08-22 — CORE-084 remediation PR #203 is open against this cumulative branch at exact head `7cca4bf9e799aa161b6e5da879e6ad942b13154c`, based on CORE-080 head `0e1be5f32efad1da57ee27bd2a2fe80033976bd1`; it is the bounded production-caller test remediation and awaits independent review/merge.
