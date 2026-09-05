# Checklist — GUI-152: Focus Board (UI-A + UI-B)

One box per plan step; the acceptance boxes mirror FRD-036 R1–R9 and the
ticket's own acceptance bullets.

## UI-A

- [ ] `docs/functional/frd/FRD-036-focus-board.md` written; `refs`/`docs_todo` disposition recorded in `scratch/notes.md`
- [ ] `lib/scopes.ts` exports `Scope`, `SCOPES`, `stagesForScope`, `scopeItems`, `scopeCounts`, `primaryGroup`
- [ ] `scopes.test.ts`: the scope→stages table holds for all five scopes
- [ ] `scopes.test.ts`: no non-archived scope ever returns an archived item, and `archived` returns only archived items
- [ ] `scopes.test.ts`: `scopeCounts` equals `scopeItems(...).length` for every scope
- [ ] `lib/paging.ts` exports `PAGE_SIZE = 4`, `clampPage`, `pageColumn` with `{cards,start,end,total,page,pageCount}`
- [ ] `paging.test.ts`: a page beyond the end clamps to the last populated page (no false empty page)
- [ ] `paging.test.ts`: filtering happens before paging — the paged result of a filtered list, not the filtered result of a page
- [ ] `paging.test.ts`: a synthetic 2,000-ticket board pages correctly at both ends
- [ ] The fixed pipeline order is documented in `paging.ts`'s module docblock
- [ ] `main/settings.ts` carries `viewPrefs` keyed by project id, normalised on read, written under `withSettingsFileLock`
- [ ] `settings.test.ts` proves a malformed `viewPrefs` entry is dropped rather than crashing, and a good one round-trips
- [ ] `CH.getViewPrefs`/`CH.setViewPrefs`, the `ViewPrefs` type and the two `KanmerApi` methods exist in `shared/ipc.ts`
- [ ] `preload/index.ts` forwards both; `main/index.ts` handles both and resolves the logical `project_id` via `store.getProject()` with a root-path fallback
- [ ] No preference is written to a ticket and no gate input changes (R8)

## UI-B

- [ ] `components/Sidebar.tsx` renders Workspace (5 scopes + counts), Areas (All + one per area with colour dot) and Standup, in semantic `<nav>`/`<ul>`/`<button>`
- [ ] The active scope carries `aria-current="page"`; the collapse toggle carries `aria-expanded` (R7)
- [ ] `Sidebar.test.tsx`: counts match `scopeCounts`, `aria-current` tracks the active scope, and every control is reachable and activatable by keyboard
- [ ] `Board.tsx` renders exactly `stagesForScope(scope)` as columns while `UI_STAGE_IDS` stays `mergeColumns`' `known` argument (no fallback column resurrection)
- [ ] Each column shows at most 4 cards with a `start–end of total` pager; the pager is absent when `total <= 4` (R3)
- [ ] Column head count is the filtered total; the rail count is the unfiltered scope total; the pager reports what is shown (R4)
- [ ] Compact card: title first, small id, area context, one group chip + `+N`; the memoised `Card` still receives only primitives
- [ ] Drag/drop and Ctrl+Arrow still work; `onCardDrop` still computes from `columnCards(itemsRef.current, statusId)` — the full column, never the page (R6)
- [ ] A drop that cannot be expressed from the visible page is refused with a visible reason and the context-menu move stays available (R6)
- [ ] `Board.test.tsx` extended: pager renders, counts are right, a column with matches past the old page shows them; the existing empty-column drop-anchor test still passes
- [ ] `App.tsx` routes scope through `viewItemsFor`/`applyFilters`; `scope === "archived"` renders `ArchivedList` with restore and permanent-delete intact (R9)
- [ ] Search and the command palette reach every scope, and opening a result switches scope/page as needed to show the item (R5)
- [ ] Scope, rail-collapsed and column pages persist per logical project and restore on reopen (R8)
- [ ] `styles.css`: rail, pager and compact-card rules from the existing dark/light tokens; `prefers-reduced-motion` respected; the rail collapses below ~900px (R7)
- [ ] Standup remains reachable from the rail; the existing tab strip and every Settings section still reach their surfaces (R9)
- [ ] No new dependency added

## Verification

- [ ] `npm run test -w @kanmer/gui` exits 0 (every pre-existing GUI test still green)
- [ ] `npm run typecheck -w @kanmer/gui` exits 0
- [ ] `npm run build -w @kanmer/gui` exits 0
- [ ] `npm run verify:docs` and `npm run check:manual` exit 0 (regenerating a mirror if they ask for it)
- [ ] Root `npm run typecheck` exits 0
- [ ] Manual pass on the live board: Active shows 4 columns; Backlog/Completed/Archived counts equal `get_status.counts`; Done (373) pages; an empty filtered scope states the filter matched nothing; the rail is fully keyboard-operable
- [ ] `post-implementation-report` written with the parity checklist ticked item by item
- [ ] Draft PR opened, `prs` recorded, ticket moved to Review, PR marked ready
