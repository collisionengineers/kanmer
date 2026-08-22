# CORE-039 checklist

## Preparation

- [x] Reproduce the clean-checkout release-notes.test.mjs failure and capture exact output.
- [x] Choose a disposable, dependency-free fixture/seam that does not mutate a real board.

## Implementation

- [x] Implement the hermetic test repair without weakening the PR-link assertion.
- [x] Keep production board discovery behavior unchanged unless a narrowly scoped explicit input is required.
- [x] Preserve 80-test coverage and update only governing command comments if needed.

## Verification

- [x] Run focused release-notes test and npm run test:scripts (80/80).
- [x] Run build, typecheck, diff-check, and shared verify; record unrelated failures exactly.
- [x] Write the post-implementation report.
- [x] Record commit/PR traceability and stop at Review.

## Progress notes

- 2026-08-22: Hosted PR #145 run 32543323809 failed release-notes.test.mjs 79/80 because clean CI had no .worktrees/kanmer board.
- 2026-08-22: Disposable documented CORE-027/PR #96 fixture plus opt-in KANMER_BOARD_ROOT seam passes focused 1/1 and scripts 80/80; shared verify reaches and preserves unavailable mcpb CLI failure.
- 2026-08-22: Commit 79c85e07 and PR #147 opened; awaiting independent review and hosted checks before any stack/merge.

- [x] Verify merged main: the hermetic board fixture is present in PR #145 and the final Windows rail passed 80/80 scripts.
