# Checklist — CORE-055

- [x] Read the CORE-054 packet, governing docs, and current mismatch/rename flow.
- [x] Add the mismatch-aware ordinary-rename predicate and wire it into `applyGitPreferences`.
- [x] Add the stale-cached-branch real-Git regression with refs/worktree assertions.
- [x] Run focused GUI Git tests and proportionate manual/docs/scripts/diff rails.
- [x] Preserve unrelated typecheck/build baseline failures with exact exits.
- [x] Write the post-implementation report and traceability.
- [x] Push the branch and open stacked PR #177 targeting `core-054-no-rename-mismatch` at `3964c2ca370c82491474a38f813f30df7fdc9aea`.
- [x] Move Implementing → Review after fresh gates; stop for independent review.

---

## Closeout — CORE-055

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (merged-main reachability, evidence, PR URL and merge date recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; exact recorded worktree removal completed
- [x] exact recorded branch deletion completed locally and remotely
- [x] git fetch --prune + git worktree prune completed
- [x] take_ticket action: "release" completed
