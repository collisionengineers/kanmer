# Checklist — GUI-071

- [x] Create `apps/gui/src/renderer/src/lib/views.ts`: `View`, `ViewSpec`, one
      `VIEWS: Record<View, ViewSpec>` keying label + item predicate + `counted`,
      plus `VIEW_IDS`, `viewItemsFor(view, items)` and
      `viewCount(view, items): number | null`. `import type` only from
      `@kanmer/core`. No `backlog` case.
- [x] Write `apps/gui/src/renderer/src/lib/views.test.ts`: Board counts all
      non-archived tickets incl. Done, excl. non-tickets; Archived counts
      archived items *incl.* non-tickets; Standup has no badge; stage moves
      leave Board's count alone, archiving moves one Board→Archived; and the
      criterion asserted exhaustively over `VIEW_IDS` — every badge equals
      `viewItemsFor(view, items).length` (the rows the view shows unfiltered).
- [x] Rewire `App.tsx`: import from `./lib/views.js`, delete the local `View`
      and `VIEW_LABELS`, `allViewItems` → `viewItemsFor(view, items)`,
      Ctrl+1…9 reads `VIEW_IDS`, tab strip renders `VIEWS[v].label` and a badge
      from a `useMemo`'d `Record<View, number | null>` keyed on `items`.
- [x] Collapse the last inline duplication: `FilterBar`'s `items` prop
      (`App.tsx:1153`) becomes `allViewItems`.
- [x] Check the empty states (`App.tsx:1213-1235`) — the named regression site:
      `view !== "standup"` guard intact, zero-item Board and zero-item Archived
      each show their message, a no-match filter shows "No matches".
- [x] Write FRD-019 R5: tab badge = everything in that view, ignoring search
      and filters; column counts = what matches the current filter; what each
      view's badge counts; the rule lives in `lib/views.ts` under test.
- [x] Verification run (this box produces proof.md): `npm test`,
      `npm run typecheck`, `npm run build:ui`, `npm run check:manual`
      (11 chapters), plus the app observed — badges unchanged, badges hold
      still under a filter while column counts narrow, archiving moves one
      Board→Archived live.

## Progress notes

**Re-located every line number first, as `files` instructed.** On `origin/main`
`0c4ffda` (GUI-070 = `2f06713` merged): `View`/`VIEW_LABELS` at `:48-54`,
`allViewItems` at `:957-963`, the badge JSX at `:1068-1074`, the `FilterBar`
items prop at `:1153`, the empty states at `:1211-1235`. All three research
findings that survive GUI-070 confirmed present at those lines.

**Which duplications of the rule survived GUI-070 — three of four.**
`allViewItems` (`:957`), the inlined badge (`:1070-1072`) and the `FilterBar`
items prop (`:1153`). The fourth, `BacklogTable`'s `status === "backlog"`
filter, was deleted with the component. All three now read `lib/views.ts`.

**The numbers were already right, and that is the finding.** Post-GUI-070 the
two branches of the badge expression coincide exactly with the two surviving
counted views' predicates — Board renders every non-archived ticket and the
`else` branch counts exactly that; Archived renders every archived item and the
`archived` branch counts exactly that. So this ships **no change to any printed
number**. What ships is the missing branch: the expression was never a function
of `v`, and it agreed with the views only because Backlog — the view whose
predicate differed — was deleted. Stated plainly in the PR body so it is not
read as a no-op.

**F4 (empty states) was resolved by GUI-070, not by this ticket.** The
zero-item-view-shows-nothing bug was specific to the Backlog view, whose
`allViewItems` was board-wide. For the two surviving views `allViewItems` was
already correct, so the empty states behave identically before and after. Left
alone deliberately; checked as the named regression site and unchanged.

**Research F6's wording corrected.** It says the Archived badge counts
"archived groups". Groups are not `Item`s — `ItemType` is
`ticket | plan | research` and groups live in their own store, reached through
`GroupView`. The real asymmetry is the same shape and still worth preserving:
Archived counts archived `plan`/`research` items, Board does not. The test
covers it with `plan`/`research` fixtures. (Caught by `tsc`, which rejected
`type: "group"` in the first draft of the test.)

**`FilterBar` facet ripple did not arise.** `FilterBar` renders only when
`view === "ticket"`, where its inline expression and `allViewItems` are the
same set, so switching it narrows nothing.

**`kanmerGit.test.ts` flaked exactly as warned** — 1 of 7 (`renames locally
even with no remote to push to`, `Test timed out in 5000ms`) in the full run.
Rerun alone with `--testTimeout=30000`: **7/7 green in 54.7s**, individual
cases 4.2–13.1s against a 5s default. Pre-existing, unrelated file
(`src/main/`, untouched here), has its own ticket. Not chased.

**Drove the built app over CDP** against a copy of the live board (152
non-archived tickets, 2 archived), then reaped all four `electron.exe` PIDs so
closeout is not blocked. Observations in `proof`.

## Closeout

- [ ] PR merged (gate)
- [ ] proof.md final
- [ ] commits / prs / deployment recorded
- [ ] Outcome recorded on the ticket body
- [ ] worktree removed
- [ ] branch deleted (local + remote)
- [ ] ticket released

### Closeout done — 2026-08-16

- [x] PR merged (gate) — #53 `MERGED` 2026-08-16T23:31:44Z, squash `5cab894`
- [x] proof.md final — written on merged main, PR URL and merge date included
- [x] commits / prs recorded — `756d5da`, `7af5d94`, `5cab894`; PR #53.
      **Deployment not recorded**: the board declares no environments
      (`get_doc_gates` → `deploymentTracking: null`), so the field is not
      meaningful here.
- [x] Outcome recorded on the ticket body
- [x] worktree removed — `git worktree remove` deregistered it but refused the
      directory ("Directory not empty": `node_modules`, `package-lock.json` and
      the `out/` build, all gitignored and so invisible to `status`). Working
      tree was clean. Followed the skill's "lingering but unregistered" path:
      `rm -rf .worktrees/gui-071` + `git worktree prune`. No stray
      `electron.exe` was involved — all four PIDs from each of the two CDP runs
      were reaped before closeout, deliberately, because a survivor would have
      held the directory open.
- [x] branch deleted — local `gui-071-view-tab-counts` (`git branch -d` warned
      "not yet merged to HEAD", expected after a squash merge, and deleted it
      anyway at `7af5d94`); remote deleted; `git fetch --prune`. `git branch -a`
      shows no `gui-071` trace.
- [x] ticket released
