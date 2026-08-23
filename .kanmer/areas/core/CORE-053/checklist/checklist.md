# Checklist — CORE-053

- [x] Reproduce the claimant-marker cleanup failure path from PR #173.
- [x] Surface or combine marker-removal errors without swallowing either failure.
- [x] Add deterministic regression coverage.
- [x] Regenerate the committed MCP artefact if source changes require it.
- [x] Run focused/full core tests, typecheck/build, and parity checks.
- [x] Refresh cumulative CORE-051 traceability and hand off for independent review.

---

## Closeout — CORE-053

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (merged-main reachability, evidence, PR URL and merge date recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; exact recorded worktree removal pending
- [ ] exact recorded branch deletion pending
- [ ] git fetch --prune + git worktree prune pending
- [ ] take_ticket action: "release" pending
