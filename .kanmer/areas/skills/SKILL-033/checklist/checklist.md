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

- [x] Obtain an independent exact-head review and resolve every finding.
- [x] Merge via normal protected-main flow.
- [x] Verify on merged main, write proof, close out, and release the ticket.

---

## Closeout — SKILL-033

- [x] PR merge verified (`gh pr view --json state,mergedAt`).
- [x] proof.md finalised (PR URL and merge identity already present).
- [x] Moved to final stage.
- [x] Outcome recorded in ticket body (PR link, merge SHA, and follow-up disposition).
- [x] Removed the unregistered, clean `.worktrees/skill-033` leftover via a path-scoped Git cleanup after a dry run identified only that directory.
- [x] The branch existed only inside the unregistered checkout and vanished with it; deleted the matching merged remote branch.
- [x] Ran `git fetch --prune origin` and `git worktree prune`.
- [x] `take_ticket action: "release"`
