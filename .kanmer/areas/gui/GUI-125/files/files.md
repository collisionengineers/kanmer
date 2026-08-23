# Files — GUI-125

## In scope

- `apps/gui/src/renderer/src/components/FilterBar.tsx` priority filter state/type residue.
- Focused GUI filter tests and any callers/types that still carry the dead priority filter field.

## Out of scope

- `defaultPriority` persistence or new-ticket creation behavior.
- Adding a replacement priority selector/filter.
- Unrelated GUI cleanup.

## Evidence map

- [[GUI-011]] historical audit identified the residual `Filters.priority` state.
- `docs/functional/frd/FRD-008-priority-removal.md` requires no priority surface while preserving compatibility behavior where source-backed.

## Acceptance evidence

- No live GUI `Filters.priority` or priority-filter selector path remains.
- Focused filter tests pass without weakened assertions.
- `defaultPriority` persistence remains unchanged and source-backed.
