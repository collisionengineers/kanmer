# Checklist — SKILL-033

## Preparation

- [x] Create a clean isolated checkout from current origin/main.
- [x] Add the precise shared-credential clarification to the review skill.
- [x] Add matching guidance outside AGENTS.md’s managed block.
- [x] Run git diff --check and confirm only the two planned documentation paths changed.
- [x] Run skill-prose validation and the relevant review-skill checks.
- [x] Run the complete required verification rail.
- [x] Commit, push, and open a normal PR with traceability.
- [x] Write the post-implementation report and move to Review.

## Review and merge

- [ ] Obtain an independent exact-head review and resolve every finding.
- [ ] Merge via normal protected-main flow.
- [ ] Verify on merged main, write proof, close out, and release the ticket.

---

## Closeout — SKILL-033

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/skill-033`
- [ ] `git branch -d SKILL-033-review-agent-credentials` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
