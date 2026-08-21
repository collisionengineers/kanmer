# Checklist — GUI-081

- [x] Amend FRD-024 R4 with the precise withdrawn-contextual-help record.
- [x] Preserve the distinction between GUI-074’s removed Settings affordance and GUI-081’s never-built gate-block affordance.
- [x] Remove AC3 and renumber the remaining acceptance criteria sequentially.
- [x] Confirm FRD-024 retains the actual F1 and Help → Kanmer Manual access path.
- [x] Inspect the gate-error code/tests and manual gates chapter against the amended claims.
- [x] Run `npm run check:manual` and the targeted gate-error test.
- [x] Run targeted stale-claim searches and `git diff --check`.
- [x] Write the implementation report, record traceability, and open the PR.
- [x] Verify the amendment on merged `main` and write proof.

## Progress notes

- 2026-08-21: Owner decision already selects withdrawal; no user-only question is open.
- 2026-08-21: Amended only FRD-024; manual check and targeted gate-error test pass, stale-requirement search is clear, and `git diff --check` is clean.
- 2026-08-21: PR #97 merged at `2ab18ca`; merged-main proof checks passed.

---

## Closeout — GUI-081

- [x] PR merge verified (`gh pr view --json state,mergedAt`): PR #97 merged 2026-08-21 at `2ab18caddef64a03d33270fc9b34ea42da387f88`
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/gui-081`
- [ ] `git branch -d gui-081-withdraw-gate-help` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
