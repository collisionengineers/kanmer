# Checklist — CORE-055

- [ ] Read the CORE-054 packet, governing docs, and current mismatch/rename flow.
- [ ] Add the mismatch-aware ordinary-rename predicate and wire it into `applyGitPreferences`.
- [ ] Add the stale-cached-branch real-Git regression with refs/worktree assertions.
- [ ] Run focused GUI Git tests and proportionate manual/docs/scripts/diff rails.
- [ ] Preserve unrelated typecheck/build baseline failures with exact exits.
- [ ] Write the post-implementation report and traceability.
- [ ] Push the branch and open a stacked PR targeting `core-054-no-rename-mismatch`.
- [ ] Move Implementing → Review after fresh gates; stop for independent review.
