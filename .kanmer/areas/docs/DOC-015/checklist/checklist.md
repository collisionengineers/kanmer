# Checklist — DOC-015

- [x] Add `docs/manual/greenfield.md` with lean, standard, and high-assurance depth guidance.
- [x] Document the one-page brief/non-goals and walking-skeleton-first rules.
- [x] Document first-horizon-only planning, first-release learning, and evidence-based replanning.
- [x] State the explicit anti-sprawl prohibition on a lifetime backlog before the skeleton yields evidence.
- [x] Link the new page from the greenfield interview in `kanmer-setup` without changing its existing safety conditions.
- [x] Add focused static coverage for the page and setup reference.
- [x] Run the focused Node test and the skill-prose verifier.
- [x] Run `npm run verify:skills` and `git diff --check`.
- [x] Write the post-implementation report, record commit/PR traceability, and open the review PR.
- [x] On merged `main`, verify the documentation and checks; write proof.

## Progress notes

- 2026-08-21: Research and planning completed; no user-only question is open.
- 2026-08-21: Added the bounded greenfield manual page, setup reference, and focused static coverage; focused test and skill verifier pass.
- 2026-08-21: PR #95 merged at `302d577`; merged-main proof checks passed.

---

## Closeout — DOC-015

- [x] PR merge verified (`gh pr view --json state,mergedAt`): PR #95 merged 2026-08-21 at `302d5771229af7f861d6ebebd35c10f3941531ac`
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/doc-015`
- [x] `git branch -d doc-015-lean-greenfield-playbook` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
