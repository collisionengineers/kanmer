---
kind: review-attestation
ticket: CORE-084
pr: "203"
head_sha: 7cca4bf9e799aa161b6e5da879e6ad942b13154c
base_branch: core-043-protection-retarget
base_sha: f63d953fc8467440988c887c62a34ade0c77c96c
plan_hash: 4f0c71845a8928f4
reviewer: codex-mcp-client
independent: true
verdict: PASS
---

# Independent review — CORE-084

## Scope and lineage

Reviewed PR #203 at exact head `7cca4bf9e799aa161b6e5da879e6ad942b13154c`, base `core-043-protection-retarget` at `f63d953fc8467440988c887c62a34ade0c77c96c`. The child commit parent is CORE-080 head `0e1be5f32efad1da57ee27bd2a2fe80033976bd1`. The child commit is limited to `apps/gui/src/main/index.sync.test.ts` (new regression) and the narrow `__kanmerTest` export in `apps/gui/src/main/index.ts`; no unrelated child files or dependencies are changed. The broader PR comparison includes the intentionally inherited CORE-080/CORE-043 stack.

## Finding disposition

- CORE-080 review F-001: **FIXED**. The new test invokes production `__kanmerTest.syncProject(repo)` in manual Retry mode, rather than calling `preflightBoardSync` directly.
- The regression initializes a real Git repository on `main`, configures the expected board branch as `kanmer-board`, and proves the result is `branchMismatch: true`, `paused: true`, with the live-branch error preserved.
- It proves `syncBoard` is not called and snapshots `git show-ref`, `git worktree list --porcelain`, and fixture content before/after; all remain unchanged. Existing exact-destination and genuine paused-error assertions remain in `kanmerGit.test.ts`.
- No new findings. Hosted protection/Actions-variable behavior is outside this deterministic child scope and remains explicitly INCONCLUSIVE; PR status has no configured checks on this stacked non-main target.

## Evidence

- Focused GUI rail from the exact worktree: `npm test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts src/main/index.sync.test.ts --reporter=dot` — exit 0, 2 files, 27/27 tests (including the production Retry regression).
- GUI typecheck: `npm run typecheck -w @kanmer/gui` — exit 0.
- `git diff --check 0e1be5f32efad1da57ee27bd2a2fe80033976bd1 7cca4bf9e799aa161b6e5da879e6ad942b13154c` — exit 0; worktree clean.
- Preserved packet evidence: first `npm run test:scripts` exit 1 in the fresh worktree because branch-local `packages/core/dist/index.js` was absent (87/89, exact failures auto-run-state and release-notes); `npm run build:core` exit 0, then `npm run test:scripts` exit 0 at 89/89.
- No hosted checks are configured for this stacked target; live protection/Actions-variable proof remains INCONCLUSIVE by the governing docs.

## Verdict

**PASS.** The production caller now has the required deterministic fail-closed regression: manual Retry pauses on a live branch mismatch before any `syncBoard` call or refs/worktree/content mutation, while inherited exact-destination and genuine-error behavior remains covered.
