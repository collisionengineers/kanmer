# Checklist — GUI-125

- [x] [pre-review] Inspect `FilterBar.tsx`, its callers, focused tests, and `defaultPriority` persistence for the dead priority filter state.
- [x] [pre-review] Remove only the dead priority filter state and focused-test residue; preserve `defaultPriority` persistence and add no replacement filter.
- [x] [pre-review] Run focused GUI tests plus relevant typecheck/build or record exact environment-sensitive limitations.
- [x] [pre-review] Verify with `rg` that no live `Filters.priority` or priority-filter selector path remains, and inspect the diff/report.
- [x] [pre-review] Stop at Review; do not merge or broaden the change.

## Progress notes

Execution packet omitted checklist/files documents; these documents mirror the approved plan scope and verification points.

Focused board/view tests passed 38/38. Full GUI/typecheck/build limitations are recorded in scratch. `rg` returned exit 1 with no `Filters.priority`/`priority?:` matches in renderer source; `defaultPriority` remains in settings IPC/main/App paths. Diff is two deletions in `FilterBar.tsx` only.

---

## Closeout — GUI-125

- [x] PR merge verified (PR #228 MERGED as 6abe8abae7e5e533032a30cc2c175fb38ba7403c)
- [x] proof.md finalised (merged-main checks recorded)
- [x] Moved to final stage (Verifying → Done)
- [x] Outcome recorded in ticket body (PR link, no follow-ups)
- [ ] cd out of worktree; remove recorded GUI-125 worktree
- [ ] Delete merged GUI-125 branch
- [ ] Fetch/prune worktrees
- [ ] take_ticket action: release
