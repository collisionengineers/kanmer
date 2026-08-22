# Files — CORE-055

| Area | Files | Change |
|---|---|---|
| GUI preference flow | `apps/gui/src/main/index.ts` | Skip ordinary rename processing whenever any refreshed context has `branchMismatch`. |
| Existing Git state helper | `apps/gui/src/main/kanmerGit.ts` | Add the small ordinary-rename eligibility predicate beside the protected predicate. |
| Regression | `apps/gui/src/main/kanmerGit.test.ts` | Prove a mismatch with cached branch different from the saved preference cannot enter either rename path and leaves refs/worktree state unchanged. |
| Traceability | CORE-054 report/item and PR metadata | Record CORE-055 implementation and review evidence after the child PR is ready. |

Out of scope: GitHub API/protection mutation, unrelated dispatch/typecheck baseline failures, providers, docs/manual changes, and source-repository features.
