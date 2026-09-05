# Checklist — GUI-152: Focus Board (UI-A + UI-B)

One box per plan step; the acceptance boxes mirror FRD-036 R1–R9 and the
ticket's own acceptance bullets.

## UI-A

- [x] `docs/functional/frd/FRD-036-focus-board.md` written; `refs`/`docs_todo` disposition recorded in `scratch/notes.md`
- [x] `lib/scopes.ts` exports `Scope`, `SCOPES`, `stagesForScope`, `scopeItems`, `scopeCounts`, `primaryGroup`
- [x] `scopes.test.ts`: the scope→stages table holds for all five scopes
- [x] `scopes.test.ts`: no non-archived scope ever returns an archived item, and `archived` returns only archived items
- [x] `scopes.test.ts`: `scopeCounts` equals `scopeItems(...).length` for every scope
- [x] `lib/paging.ts` exports `PAGE_SIZE = 4`, `clampPage`, `pageColumn` with `{cards,start,end,total,page,pageCount}`
- [x] `paging.test.ts`: a page beyond the end clamps to the last populated page (no false empty page)
- [x] `paging.test.ts`: filtering happens before paging — the paged result of a filtered list, not the filtered result of a page
- [x] `paging.test.ts`: a synthetic 2,000-ticket board pages correctly at both ends
- [x] The fixed pipeline order is documented in `paging.ts`'s module docblock
- [x] `main/settings.ts` carries `viewPrefs` keyed by project id, normalised on read, written under `withSettingsFileLock`
- [x] `settings.test.ts` proves a malformed `viewPrefs` entry is dropped rather than crashing, and a good one round-trips
- [x] `CH.getViewPrefs`/`CH.setViewPrefs`, the `ViewPrefs` type and the two `KanmerApi` methods exist in `shared/ipc.ts`
- [x] `preload/index.ts` forwards both; `main/index.ts` handles both and resolves the logical `project_id` via `store.getProject()` with a root-path fallback
- [x] No preference is written to a ticket and no gate input changes (R8)

## UI-B

- [x] `components/Sidebar.tsx` renders Workspace (5 scopes + counts), Areas (All + one per area with colour dot) and Standup, in semantic `<nav>`/`<ul>`/`<button>`
- [x] The active scope carries `aria-current="page"`; the collapse toggle carries `aria-expanded` (R7)
- [x] `Sidebar.test.tsx`: counts match `scopeCounts`, `aria-current` tracks the active scope, and every control is reachable and activatable by keyboard
- [x] `Board.tsx` renders exactly `stagesForScope(scope)` as columns while `UI_STAGE_IDS` stays `mergeColumns`' `known` argument (no fallback column resurrection)
- [x] Each column shows at most 4 cards with a `start–end of total` pager; the pager is absent when `total <= 4` (R3)
- [x] Column head count is the filtered total; the rail count is the unfiltered scope total; the pager reports what is shown (R4)
- [x] Compact card: small id line carrying only exception badges, the title as the dominant element, an area context line, one group chip + `+N`; the memoised `Card` still receives only primitives. DOM order follows the approved reference — see deviation 2 in the post-implementation report
- [x] Drag/drop and Ctrl+Arrow still work; `onCardDrop` still computes from `columnCards(itemsRef.current, statusId)` — the full column, never the page (R6)
- [x] A drop that cannot be expressed from the visible page is refused with a visible reason and the context-menu move stays available (R6) — narrowed to the whole-cell "bottom of the column" drop, deviation 4
- [x] `Board.test.tsx` extended: pager renders, counts are right, a column with matches past the old page shows them; the existing empty-column drop-anchor test still passes
- [x] `App.tsx` routes scope through `viewItemsFor`/`applyFilters`; `scope === "archived"` renders `ArchivedList` with restore and permanent-delete intact (R9)
- [x] Search and the command palette reach every scope, and opening a result switches scope/page as needed to show the item (R5)
- [x] Scope, rail-collapsed and column pages persist per logical project and restore on reopen (R8)
- [x] `styles.css`: rail, pager and compact-card rules from the existing dark/light tokens; `prefers-reduced-motion` respected; the rail collapses below ~900px (R7)
- [x] Standup remains reachable from the rail; the existing tab strip and every Settings section still reach their surfaces (R9)
- [x] No new dependency added

## Verification

- [x] `npm run test -w @kanmer/gui` exits 0 (57 files, 646 tests; every pre-existing GUI test still green)
- [x] `npm run typecheck -w @kanmer/gui` exits 0
- [x] `npm run build -w @kanmer/gui` exits 0
- [x] `npm run verify:docs` and `npm run check:manual` exit 0
- [x] Root `npm run typecheck` exits 0
- [x] Live-board pass: Active shows 4 columns; Backlog/Completed/Archived counts equal `get_status.counts`; Done (373) pages across all 94 pages with no empty page; an empty filtered scope shows blank counts and no pager; all 14 rail controls are focusable buttons. Pixel comparison against the previews and real-pointer interaction are UI-D / GUI-153 and are named as uncovered in the report
- [x] `post-implementation-report` written with the parity checklist ticked item by item
- [x] Draft PR opened (#323), `prs` and `commits` recorded, ticket moved to Review, PR marked ready, then merged to `main` at `32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507` (verified: `gh pr view 323` reports `state: MERGED`, `mergeCommit.oid: 32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507`). Head `8ef01486d6ff4605b1b3e876550e325c671f9afa`.

## Not ticked (out of scope for this ticket, owned by GUI-153)

- [ ] Pixel comparison against `approved-ui/previews/` (desktop/laptop/mobile) and real-pointer interaction (live drag, hover states, live `prefers-reduced-motion` and ≤900px behaviour) — no automated or manual evidence in this PR or by this verifier covers rendered pixels or pointer events; the reviewer's scratch/review.md open question 8 and the post-implementation report both name this residual risk explicitly and assign it to GUI-153/UI-D.

## Closeout — GUI-152

- [x] PR merge verified (`gh pr view GUI-152-focus-board-scopes --json state,mergedAt,url,mergeCommit` → state MERGED, mergedAt 2026-09-05T03:25:46Z, mergeCommit.oid 32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507)
- [x] proof.md already final (merged_sha, PASS result, receipts recorded by kanmer-verify); no further edit needed
- [x] Ticket already at final stage (Done)
- [x] Outcome already recorded in ticket body (Outcome section + Out of scope/[[GUI-153]] follow-up); `commits[]` updated to include the merge SHA `32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507` alongside the pre-merge head `8ef01486d6ff4605b1b3e876550e325c671f9afa`
- [x] cd out of worktree; `git worktree remove .worktrees/GUI-152` — exit 0
- [x] `git branch -D GUI-152-focus-board-scopes` (squash/rebase-merged; branch head `8ef01486` not an ancestor of the merge commit) — exit 0; also deleted the stale remote branch (`git push origin --delete GUI-152-focus-board-scopes`) — exit 0
- [x] `git fetch --prune origin` — exit 0; `git worktree prune -v` — exit 0
- [x] `take_ticket action: "release"` — exit 0; lease fields cleared
