# CORE-039 checklist

## Preparation

- [ ] Reproduce the clean-checkout release-notes.test.mjs failure and capture exact output.
- [ ] Choose a disposable, dependency-free fixture/seam that does not mutate a real board.

## Implementation

- [ ] Implement the hermetic test repair without weakening the PR-link assertion.
- [ ] Keep production board discovery behavior unchanged unless a narrowly scoped explicit input is required.
- [ ] Preserve 80-test coverage and update only governing command comments if needed.

## Verification

- [ ] Run focused release-notes test and npm run test:scripts (80/80).
- [ ] Run build, typecheck, diff-check, and shared verify; record unrelated failures exactly.
- [ ] Write the post-implementation report.
- [ ] Record commit/PR traceability and stop at Review.
