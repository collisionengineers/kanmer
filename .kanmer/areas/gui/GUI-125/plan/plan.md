---
kind: plan
ticket: "GUI-125"
profile: chore
---

# Plan — remove residual priority filter state

## Scope

Remove the unused `priority` member from the GUI filter state and delete only focused-test residue that asserts or preserves a priority filter surface. Keep `defaultPriority` persistence for new-ticket creation unless the implementation proves it is unused; that compatibility behavior is outside this ticket's scope.

## Implementation

1. Inspect `FilterBar.tsx`, its callers, and focused tests for the `Filters.priority` field and any dead setter/serialization paths.
2. Remove the dead state and update affected types/callers/tests without introducing a replacement filter.
3. Run the focused GUI tests plus the relevant typecheck/build or record an explicit environment-sensitive limitation.

## Verification

- `rg` finds no live `Filters.priority` or priority-filter selector path in the GUI.
- Focused filter tests pass without weakening assertions.
- Existing `defaultPriority` persistence behavior remains source-backed and unchanged.

## Stop condition

Stop at Review with the recorded worktree/branch, post-implementation report, exact checks, and a PR linked to GUI-125. Do not merge or broaden the change into unrelated GUI cleanup.
