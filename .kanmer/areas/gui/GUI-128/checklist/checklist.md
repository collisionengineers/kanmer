# Checklist — GUI-128

## Investigation

- [x] Identify the static Notification API and incomplete test mock.
- [x] Confirm all sync assertions pass before the unhandled-error exit.
- [x] Confirm the settings atomic-write failure is separate.

## Implementation

- [x] Add only the static unavailable-notification mock member.
- [x] Preserve production and test behavior outside the mock.

## Verification

- [x] Focused sync suite exits 0 with no unhandled errors: 11/11 PASS.
- [x] Run typecheck: PASS across all workspaces.
- [x] Run `git diff --check`: PASS.
- [x] Run canonical merged-main GUI/root verification and record independent outcomes: build, core 310/310, and GUI 462/462 PASS with no Notification error; root exits 1 later on separately filed [[MCP-048]] readiness timing evidence.
- [x] Write post-implementation report, open PR #237, review, merge, and record merged-main proof.

---

## Closeout — GUI-128

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/gui-128`
- [ ] `git branch -d gui-128-notification-mock` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
