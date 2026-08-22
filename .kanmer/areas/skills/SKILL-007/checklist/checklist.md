# Checklist

- [x] conversion procedure documented in kanmer-groom
- [x] procedure distinguishes grouping labels from property labels
- [x] preview-then-confirm, stated as mandatory
- [x] idempotency explained, not just asserted
- [x] 8 epic groups created, one per phase
- [x] each epic has a `context.md` naming its plan and FRDs
- [x] `groups` set on all 40 labelled tickets
- [x] no member list written anywhere
- [x] `bug` and `v3-blocker` untouched
- [x] NOW / NEXT horizons seeded from the roadmap's ordering
- [x] derived progress matches a direct label count, per group
- [x] second run changes nothing


- 2026-08-22 — Reconciliation audit: merged PR #20 (merge f7a0ca6, source 73e2e9c) is present on main and current kanmer-groom prose retains the six-step conversion procedure. Live MCP label/group checks matched all eight phase totals: 4/4, 3/3, 8/8, 3/3, 8/8, 4/5, 4/5, 3/4 (derived progress equals direct v3-phase-N label count). EPIC-001..008 contexts were read and name their roadmap plans and governing FRDs; membership remains ticket-derived. HZN-001 currently has historical GUI members that have since closed plus GUI-015 in review, and HZN-002 has DOC-005/SKILL-006 done plus SKILL-007 implementing; this is the documented intentional static-horizon drift, not a fabricated claim that the original NOW/NEXT membership is still open-only. Property labels bug/v3-blocker were not converted. Historical third-run idempotence proof remains the evidence for zero changes on rerun.

---

## Closeout — SKILL-007

- [ ] PR merge verified (`gh pr view 20 --json state,mergedAt`: MERGED, 2026-08-16T05:37:08Z)
- [ ] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/skill-007`
- [ ] `git branch -d skill-007-phase-groups`
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: \"release\"`
