# CORE-039 plan

## Governing docs

docs_todo is true. This is a bounded test-rail repair governed by AGENTS.md's requirement that tests prove claims in clean environments; no new product or architecture document is needed.

## Approach

1. Reproduce the clean-checkout failure in the ticket worktree and inspect release-notes.mjs fixture assumptions.
2. Make the release-notes test create or point at a disposable board fixture using only existing Node APIs, or add an explicit test input seam if that is the smallest compatible change.
3. Preserve the shorthand PR-link assertion and ensure the test remains dependency-free and deterministic.
4. Run npm run test:scripts (80/80), focused release-notes test, build/typecheck, and shared verify; preserve unrelated failures.
5. Write the post-implementation report, commit, open PR or stack only after independent review, and stop at Review.

## Risks

- A fixture must not read or mutate the developer's real .kanmer state.
- Do not make release-notes silently pass when board discovery fails in production paths.
