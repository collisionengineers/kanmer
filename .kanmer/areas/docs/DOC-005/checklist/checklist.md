# Checklist — DOC-005

- [x] AGENTS.md states the rule, outside the managed block
- [x] verify:agents-block still passes
- [x] docs/README.md states the rule with reasoning
- [x] the history is described honestly, with dates
- [x] release-notes.mjs groups Done-since-tag tickets by area
- [x] it is read-only
- [x] it runs against this repo and produces real output
- [x] release:notes script added

## Progress notes — 2026-08-21 reconciliation and scoped fix

The historical implementation is present on merged main from PR #26 (source 1df633e7dd4b424ac0a7107ac08d2289c61260dd; merge 05a335dc0e9b4b75ef9904218c55ca643f9a519d). Fresh audit found one in-scope defect: numeric and #number PR refs were emitted as invalid relative Markdown links (for example [PR](96)). The scoped fix normalizes shorthand refs through the origin remote, preserving full URLs, and adds scripts/release-notes.test.mjs.

The fresh worktree first recorded release:notes exit 1 because packages/core/dist/index.js was not built; npm run build:core then exited 0. With the prerequisite built, release:notes exited 0 from the ticket worktree and normal main before the patch, and exits 0 on the patched worktree with shorthand links normalized to full /pull/<number> URLs. verify:agents-block exited 0 (31/31), npm run test:scripts exited 0 (80/80 including the regression), npm run typecheck exited 0, and git diff --check exited 0. The first missing-build failure is retained as execution evidence.

---

## Closeout — DOC-005

- [ ] PR merge verified (gh pr view --json state,mergedAt)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; git worktree remove .worktrees/doc-005
- [ ] git branch -d doc-005-operating-rule (-D if squash/rebase-merged)
- [ ] git fetch --prune + git worktree prune
- [ ] take_ticket action: release
