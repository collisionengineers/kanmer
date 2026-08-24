# Checklist — DOC-021

## Preparation

- [x] Create a clean isolated checkout at current origin/main.
- [x] Apply the verified release-notes-only change.
- [x] Run the focused release-notes test.
- [x] Run git diff --check and confirm only the release-notes file changed.
- [x] Commit, push the DOC-021 branch, and open the normal PR.
- [x] Record PR number, head SHA, and command exits.
- [x] Write the post-implementation report and move to Review.

## Review and merge

- [ ] Obtain independent review of the exact head.
- [x] Resolve required GitHub checks; any reviewer finding remains to be dispositioned.
- [ ] Merge via normal protected-main flow; record merge SHA for CORE-096.
- [ ] Write merged-main proof and close out DOC-021.

---

## Closeout — DOC-021

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/doc-021`
- [ ] `git branch -d DOC-021-release-notes` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
