# Checklist — GUI-071

- [ ] Create `apps/gui/src/renderer/src/lib/views.ts`: `View`, `ViewSpec`, one
      `VIEWS: Record<View, ViewSpec>` keying label + item predicate + `counted`,
      plus `VIEW_IDS`, `viewItemsFor(view, items)` and
      `viewCount(view, items): number | null`. `import type` only from
      `@kanmer/core`. No `backlog` case.
- [ ] Write `apps/gui/src/renderer/src/lib/views.test.ts`: Board counts all
      non-archived tickets incl. Done, excl. groups; Archived counts archived
      items *incl.* groups; Standup has no badge; stage moves leave Board's
      count alone, archiving moves one Board→Archived; and the criterion
      asserted exhaustively over `VIEW_IDS` — every badge equals
      `viewItemsFor(view, items).length` (the rows the view shows unfiltered).
- [ ] Rewire `App.tsx`: import from `./lib/views.js`, delete the local `View`
      and `VIEW_LABELS`, `allViewItems` → `viewItemsFor(view, items)`,
      Ctrl+1…9 reads `VIEW_IDS`, tab strip renders `VIEWS[v].label` and a badge
      from a `useMemo`'d `Record<View, number | null>` keyed on `items`.
- [ ] Collapse the last inline duplication: `FilterBar`'s `items` prop
      (`App.tsx:1153`) becomes `allViewItems`.
- [ ] Check the empty states (`App.tsx:1213-1235`) — the named regression site:
      `view !== "standup"` guard intact, zero-item Board and zero-item Archived
      each show their message, a no-match filter shows "No matches".
- [ ] Write FRD-019 R5: tab badge = everything in that view, ignoring search
      and filters; column counts = what matches the current filter; what each
      view's badge counts; the rule lives in `lib/views.ts` under test.
- [ ] Verification run (this box produces proof.md): `npm test`,
      `npm run typecheck`, `npm run build:ui`, `npm run check:manual`
      (11 chapters), plus the app observed — badges unchanged, badges hold
      still under a filter while column counts narrow, archiving moves one
      Board→Archived live.

## Progress notes
