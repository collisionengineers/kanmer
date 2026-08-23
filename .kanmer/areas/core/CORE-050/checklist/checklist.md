# Checklist — CORE-050

- [x] Read complete CORE-046/047/049 packets and identify reusable helpers.
- [x] Revalidate stale identity/owner markers on every transient retry.
- [x] Preserve active replacements against claimant overlap.
- [x] Validate persisted tokens before marker path construction.
- [x] Surface cleanup errors without dropping concurrency results.
- [x] Add adversarial regressions and retain inherited tests.
- [x] Regenerate plugin artifact and run parity/type/build rails.
- [x] Refresh reports and resolve related PR threads; request independent review.

## Evidence note

Focused IO/source/store: 22/22 IO, 6/6 core source, 85/85 store (113/113 combined). MCP source: 14/14. Core and all-workspace typecheck: exit 0. Core build, standalone plugin build, and plugin:check: exit 0 after the documented ignored worktree-local @kanmer/core junction. Broad HTTP/hosted evidence remains outside this bounded lane and is preserved as INCONCLUSIVE.

---

## Closeout — CORE-050

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (merged-main reachability, evidence, PR URL and merge date recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; exact recorded worktree removal pending
- [ ] exact recorded branch deletion pending
- [ ] git fetch --prune + git worktree prune pending
- [ ] take_ticket action: "release" pending
