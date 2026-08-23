# Checklist — GUI-125

- [ ] [pre-review] Inspect `FilterBar.tsx`, its callers, focused tests, and `defaultPriority` persistence for the dead priority filter state.
- [ ] [pre-review] Remove only the dead priority filter state and focused-test residue; preserve `defaultPriority` persistence and add no replacement filter.
- [ ] [pre-review] Run focused GUI tests plus relevant typecheck/build or record exact environment-sensitive limitations.
- [ ] [pre-review] Verify with `rg` that no live `Filters.priority` or priority-filter selector path remains, and inspect the diff/report.
- [ ] [pre-review] Stop at Review; do not merge or broaden the change.

## Progress notes

Execution packet omitted checklist/files documents; these documents mirror the approved plan scope and verification points.
