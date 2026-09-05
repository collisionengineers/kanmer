---
kind: review-attestation
pr: "323"
head_sha: "ad8ac33a4ce13dd51a9a7edebae5bceafbeaf9b1"
verdict: pass
reviewer: "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
independent: true
plan_hash: "18710dbbd3fe2734"
ticket_updated: "2026-09-05T02:46:32.991Z"
board_sha: "b8f866007f5ae4a37c7b7d37a2ac997d1fc7dd5d"
expected_reviewers:
  - "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
threads_snapshot: []
findings:
  - id: F-001
    severity: minor
    summary: "The whole-cell drop refusal fires for ANY target column holding more than PAGE_SIZE cards while its last page is off screen, not only for a same-column cross-page reorder. Dragging a card onto the body of a paged column (e.g. Completed with 373 cards) to change its stage is now refused unless the pointer lands on a visible card. On this board that is the normal cross-stage drag gesture for Done and, under All tickets, for Backlog."
    disposition: accepted-risk
    reason: "The ticket's own acceptance sanctions exactly this — 'cross-page drop is refused or routed to the menu move' — and 09_FOCUS_BOARD_IMPLEMENTATION.md section 5 forbids inventing a paged drop's position from displayed neighbours. The refusal is loud, not silent: a role=status line naming the last page and the right-click menu, also pushed through App's existing live region, with Board.test.tsx asserting both the refusal and that the same drop succeeds on the last page. Card-to-card drops across pages still resolve against the full column, and 'Move to' and Ctrl+Arrow are unchanged. A better end state (auto-page to the last page, or read the whole-cell drop as 'end of the visible page') is a design decision the approved reference does not settle, so it belongs to GUI-153, not to a remediation return here."
  - id: F-002
    severity: minor
    summary: "Board.tsx's `refused` state is cleared only by a subsequent card drop or a successful whole-cell drop. Changing page, changing scope or changing the filter leaves the refusal sentence rendered in that column's footer, so the message can outlive the condition it describes (e.g. it still reads 'go to the last page' after the user has gone to the last page)."
    disposition: accepted-risk
    reason: "Cosmetic and self-correcting on the next drop; it cannot cause a wrong move, and the message text is truthful about the drop that was refused. A `useEffect` clearing it on `scope`/`pages` change is a two-line fix better carried with the F-001 redesign in GUI-153 than spent as this ticket's single remediation return."
  - id: F-003
    severity: minor
    summary: "The debounced view-preference save effect (App.tsx ~1422) lists `columnTotals` in its dependency array. `columnTotals` is a fresh object whenever `viewItems` changes, so every keystroke in the search box or every filter change reschedules the timer and, 400 ms after the user stops typing, issues `setViewPrefs` — a settings.json read+write under the file lock — even when scope, collapse and pages are all unchanged. `clampPages`' identity guard prevents a re-render but does not prevent the IPC call."
    disposition: accepted-risk
    reason: "Write amplification only, bounded by the 400 ms debounce to at most a few writes per filtering session, on a small JSON file already written by several other preference paths and serialised by withSettingsFileLock. Nothing is corrupted and no ticket is touched. The narrow fix (store the totals in a ref, or compare the serialised prefs before invoking) is a follow-up, not a defect in the approved acceptance."
  - id: F-004
    severity: minor
    summary: "The `restoringPrefs` guard is a one-shot ref set during `openProject` and cleared by the first run of the save effect. If the restored preferences are identical to the current state, no dependency of that effect changes, the effect does not run, and the flag stays true — so the user's next genuine scope/collapse/page change is consumed clearing the flag instead of being persisted."
    disposition: accepted-risk
    reason: "Reproduces only on re-opening a project whose stored preferences already equal the live state, and costs at most one deferred save: the change after it persists normally, and the value on disk is never wrong, only stale by one edit. Preference persistence is best-effort by design here (the setter's rejection is deliberately swallowed). Recorded as residual risk rather than a return."
  - id: F-005
    severity: note
    summary: "The pager's prev/next controls have no `.col-pager button:focus-visible` rule (unlike `.nav-item` and `.card`, which get an explicit 2px accent outline) and rely on the UA focus ring; and because they are `disabled` at the ends, a keyboard user who pages to the last page loses focus to `<body>`. 09_FOCUS_BOARD_IMPLEMENTATION.md section 6 asks for 'focus after navigation' on paginated columns."
    disposition: accepted-risk
    reason: "The controls are real `<button>`s with `aria-label`s ('Next Done tickets'), reachable and activatable by Tab+Enter — asserted in Board.test.tsx — and Chromium's default ring is visible, so nothing is unreachable or invisible. Disabling rather than hiding the ends is a deliberate, tested choice ('disables the ends rather than hiding them, so the bound is visible'). Focus retention at the ends and an explicit ring are exactly the pointer-free polish UI-D/GUI-153 owns."
  - id: F-006
    severity: note
    summary: "The header FilterBar search is scope-bounded: typing a Completed ticket's id while on Active work matches nothing. Only Ctrl+K (CommandPalette, which searches the whole `items` array) reaches every scope. The implementation contract section 3 asks for a global search that reaches backlog, completed and archived records 'with a clear scope control'."
    disposition: accepted-risk
    reason: "The acceptance bullet ('search reaches all scopes and opens the item even when outside the visible page') is met by the palette plus `revealItem`, which switches scope to one holding the item, pages that column to it via `pageOf`, and then selects it. The rail is the clear scope control, and the scoped empty state is truthful rather than misleading — 'No matches for the current filters in Active work — N tickets hidden' with a clear-filters button, which is a strict improvement on the previous bare 'No matches for the current filters.' Widening the header search to all scopes would change what FilterBar's facet lists describe and is not in this packet."
  - id: F-007
    severity: note
    summary: "`revealItem` switches scope and page but does not clear an active area/assignee/label/group filter or the search box, so revealing an item excluded by the current filters opens the Editor on it while its card is absent from the board (`pageOf` falls back to page 1 for an item not in the filtered column)."
    disposition: rejected-with-reason
    reason: "Not a regression and not a defect: the previous `onJump` was `setView('ticket'); trySelect(id)`, which did strictly less. The exact item is still opened, which is what the contract requires ('Selecting a result opens the actual item'). Silently clearing a filter the user set would be the more surprising behaviour, and the ticket does not ask for it."
  - id: F-008
    severity: note
    summary: "The compact card renders its title as `<div class=\"card-title\">` where the approved reference's `card()` uses an `<h3>`, so the board exposes no heading structure to a screen reader."
    disposition: accepted-risk
    reason: "The card is an `<article role=\"button\" tabIndex={0}>` carrying a full `aria-label` (id, title, stage, area, blocked, deployment) — it is announced as one named control, which is the correct shape for a draggable, activatable card and is unchanged from before this PR. A heading inside an interactive control adds little and the reference's `<button>`-with-`<h3>` shape is not directly portable to the draggable article. Cosmetic-semantic, no operation affected."
  - id: F-009
    severity: note
    summary: "There is no App-level test file in @kanmer/gui (there never has been), so R5 (`revealItem` switching scope and page for a palette/activity/toast result) and the renderer half of R8 (load on project open, debounced save, per-tab snapshot) are covered only by unit tests of their parts — `pageOf`, `scopeItems`, `settings.test.ts`, `preload/index.test.ts` — plus the author's throw-away jsdom render of the live board, which was deleted."
    disposition: accepted-risk
    reason: "The absence of an App harness is pre-existing, not caused by this PR; standing one up is a larger change than this packet allows and is not in the plan's expected files. Every pure part of both paths is unit-tested (paging.test.ts 'finds the page holding an item so a search result can be revealed'; scopes.test.ts; settings.test.ts round-trip and malformed-file cases), the wiring is a one-line prop substitution at each of the seven call sites, and the post-implementation report supplies a nine-step manual script for the operator. Residual risk recorded."
  - id: F-010
    severity: note
    summary: "`docs_todo` remains true and `refs` does not cite FRD-036, because `update_item` resolves refs against the repo root (main) where the new FRD does not yet exist. The refusal is quoted verbatim in scratch/notes.md."
    disposition: accepted-risk
    reason: "A true statement about main, not a missing document: docs/functional/frd/FRD-036-focus-board.md is in the PR, follows the existing FRD frontmatter shape (`status: approved` / `covers:`, matching FRD-019), and `npm run verify:docs` passes on the branch. The leave-backlog gate accepts docs_todo. ACTION FOR WHOEVER MERGES: after the squash lands, set `refs: [docs/functional/frd/FRD-019-gui-shell.md, docs/functional/frd/FRD-011-backlog-list-view.md, docs/functional/frd/FRD-036-focus-board.md]` and `docs_todo: false` on GUI-152."
  - id: F-011
    severity: note
    summary: "The post-implementation report's deviation 6 says 'two pre-existing test files gained afterEach(cleanup)'. Only Board.test.tsx is pre-existing; the other file is the new Sidebar.test.tsx."
    disposition: rejected-with-reason
    reason: "A wording slip in the report, not a change to the code. I checked the whole diff for `cleanup`: the only occurrences are the two `afterEach(cleanup)` registrations and one in-test `cleanup()` used to re-render the same column at three different pages. No assertion is weakened anywhere, and 646/646 tests pass."
  - id: F-012
    severity: note
    summary: "The reviewed head moved from `8ef01486` to `ad8ac33a` after the round-0 attestation was written, because the coordinator ran `gh pr update-branch` to bring PR #321 / DOC-028 (`bd36854967b0fa0b68489a4f3db592a59d451696`) into the branch. This record replaces the `8ef01486` attestation for that reason, not because any finding changed."
    disposition: fixed
    reason: "Re-gathered and verified at the new head before rewriting. `ad8ac33a` is a true merge commit whose parents are exactly `8ef01486` and `bd368549`; `git diff 8ef01486 ad8ac33a` touches only DOC-028's six files (AGENTS.md, plugins/kanmer/scripts/agents-block-body.mjs, plugins/kanmer/skills/kanmer-setup/SKILL.md, scripts/agents-block-body.mjs, scripts/agents-block-routing.test.mjs, scripts/verify-agents-block.mjs; 98 insertions, 12 deletions); `git diff 8ef01486 ad8ac33a -- apps/ docs/ package.json package-lock.json` is empty, so not one reviewed byte of the GUI or the FRD changed; `git diff bd368549..ad8ac33a --stat` still reports the same 17 files, 2570 insertions and 196 deletions as the round-0 diff, so the merge resolved nothing inside this ticket's work; and no conflict markers exist anywhere in the merged tree. `8ef01486` — the ticket's only recorded commit — remains an ancestor of the head, so COMMITS_UNREACHABLE still holds. Every finding F-001…F-011 is carried forward verbatim with its round-0 disposition."
---

# Review — GUI-152 (PR #323, head `ad8ac33a`), round 0, consolidated

Independent review. I am not the author: the implementer is `claude-code`
working `.worktrees/GUI-152` under lane C of HZN-009. I reviewed the branch
read-only in that same worktree (verified clean, never switched off its branch)
plus `gh pr diff`; I did not touch `.worktrees/kanmer` other than through MCP.

**This record replaces the attestation written against `8ef01486`.** It is not a
new round: `review_round` is still 0, no ticket has been returned to
Implementing, and the findings are identical. The head moved only because the
coordinator ran `gh pr update-branch` to bring merged `main` into the branch.
See F-012 and "Why the head moved" below.

## Why the head moved, and what it did not change

`ad8ac33a4ce13dd51a9a7edebae5bceafbeaf9b1` is a merge commit with parents
`8ef01486d6ff4605b1b3e876550e325c671f9afa` (the reviewed work) and
`bd36854967b0fa0b68489a4f3db592a59d451696` (main after PR #321 / DOC-028).

| Check | Result |
|---|---|
| `git log --oneline 8ef01486..ad8ac33a` | exactly two commits: the merge and `bd368549` (DOC-028) |
| `git diff 8ef01486...ad8ac33a --stat` | 6 files, +98/−12 — `AGENTS.md`, `plugins/kanmer/scripts/agents-block-body.mjs`, `plugins/kanmer/skills/kanmer-setup/SKILL.md`, `scripts/agents-block-body.mjs`, `scripts/agents-block-routing.test.mjs`, `scripts/verify-agents-block.mjs`. All DOC-028's. |
| `git diff 8ef01486 ad8ac33a -- apps/ docs/ package.json package-lock.json` | **empty** — no GUI file, no FRD, no manifest changed |
| `git diff bd368549..ad8ac33a --stat` | the same 17 files / 2570 insertions / 196 deletions as round 0 — the merge resolved nothing inside this ticket's work |
| conflict markers in the merged tree | none |
| `git merge-base --is-ancestor 8ef01486 ad8ac33a` | true — the ticket's recorded commit stays reachable |

Because the reviewed bytes are unchanged, the round-0 code review, the
acceptance walk-through and the scoped-check evidence below carry over by
content identity. The `verify` job on run `33941260052` is the hosted evidence
for the *merged* tree, which is where DOC-028's new
`scripts/agents-block-routing.test.mjs` and `scripts/verify-agents-block.mjs`
actually run; nothing in `@kanmer/gui` reads AGENTS.md or those scripts.

## What the change does

Implements UI-A and UI-B of the approved Focus Board against real data, in
17 files, all under `apps/gui/**` except the new FRD. No dependency was added
(`package.json`, `package-lock.json` and `apps/gui/package.json` are untouched
in the ticket's contribution), and nothing under `packages/`, `plugins/`,
`scripts/`, `.github/` or `Kanmer_Upgrade_Pack_2026-09-05/` is modified by this
ticket. `lib/views.ts`, `lib/board.ts`, `ArchivedList.tsx`, `Editor.tsx` and
`Settings.tsx` — the plan's do-not-modify list — are all untouched.

- **`lib/scopes.ts`** (new): the five scopes, `stagesForScope`, `scopeItems`,
  `scopeCounts`, `primaryGroup`.
- **`lib/paging.ts`** (new): `PAGE_SIZE = 4`, `pageCount`, `clampPage`,
  `pageColumn`, `clampPages`, `pageOf`, with the fixed pipeline order stated in
  the module docblock.
- **`main/settings.ts` / `shared/ipc.ts` / `preload/index.ts` / `main/index.ts`**:
  `viewPrefs` keyed by logical `project_id`, normalised on read, two channels,
  two forwarders, two handlers.
- **`components/Sidebar.tsx`** (new), **`Board.tsx`**, **`App.tsx`**,
  **`styles.css`**: the rail, bounded columns with a per-column pager, compact
  cards, scope routing, `revealItem`, preference load/save.
- **`docs/functional/frd/FRD-036-focus-board.md`** (new).

## Acceptance, bullet by bullet, with evidence

| Ticket acceptance | Result |
|---|---|
| Pipeline order project → scope → filters/search → sort → page, **structurally** enforced | **Met.** `App.tsx` composes `scopeItems(viewItemsFor("ticket", items), scope)` → `applyFilters(...)` → `Board`; `Board.tsx` then does `columnCards(items, status.id)` → `pageColumn(...)`. `pageColumn` takes an already-filtered array and only slices, so filtering after slicing is not expressible at any caller. `paging.test.ts` asserts the direction explicitly, including "would have shown a false empty state the other way round". |
| Page clamped/reset when the filtered set changes | **Met.** `pageColumn` clamps on every render (`clampPage` → `pageCount`), so a stored page can never address a non-existent slice; `clampPages` additionally prunes what is persisted. Board.test.tsx "shows the last populated page rather than a false empty state" renders `pages: { done: 99 }` over 6 items and gets `5–6 of 6`. |
| No false empty state | **Met.** `clampPage`'s upper bound is the last populated page, and the last page of a non-empty column always holds ≥1 card; `paging.test.ts` "never returns an empty page for a non-empty column" sweeps that. |
| Every ticket reachable; search across scopes opens an item outside the visible page | **Met.** `paging.test.ts` "reaches every card across its pages, exactly once"; Board.test.tsx "reaches every card in a column across its pages"; `revealItem` (palette, activity, dispatches, toasts, standup, main-process reveal) resolves the item's scope, sets its column page from `pageOf` and selects it. See F-006/F-007 for the two edges. |
| Manual reorder uses the full column order via `lib/board.ts`; cross-page drop truthful | **Met.** `onCardDrop` still calls `positionForDrop(columnCards(itemsRef.current, statusId), …)` — the whole sorted column, taken from a ref so the memoised cards are not invalidated. Board.test.tsx "resolves a drop at the top of a later page against the card above it in the full column" drops on the first visible card of page 2 (DONE-5) and asserts `position: { after: "DONE-4" }` — a card on the previous page. The whole-cell fallback is refused with a visible, announced reason (F-001) and allowed once the last page shows. |
| Keyboard / a11y: `aria-current`, focusable rail, visible focus, reduced motion, narrow window | **Met**, with F-005 as residual. Sidebar is `<nav aria-label>` → labelled `<ul>`s of `<button>`s with `aria-current="page"` on exactly one entry (Sidebar.test.tsx "marks exactly one scope as the current page" and "moves aria-current off every scope while Standup is showing"), `aria-expanded` on the collapse toggle, every glyph `aria-hidden` + `focusable="false"`, labels retained in the DOM while collapsed, and "has no control that a pointer can reach but a keyboard cannot". `.nav-item:focus-visible` gives a 2px accent outline; `@media (prefers-reduced-motion: reduce)` is global (`transition-duration: 0.01ms !important`) rather than per component; `@media (max-width: 900px)` collapses the rail. |
| View prefs keyed by `project_id` in `main/settings.ts`, IPC following the existing pattern, never written to tickets | **Met.** `viewPrefsKey()` resolves `store.getProject()?.project_id ?? projectId` — the same reader `registrySelectedIdentity` uses — so the boundary still carries only the root path every other project-scoped method takes (AGENTS.md §8 gotchas 15/16). `CH.getViewPrefs`/`CH.setViewPrefs` + two `KanmerApi` methods + two `ipcRenderer.invoke` forwarders exactly mirror `setPreferences`. `setViewPrefs` writes under `withSettingsFileLock`; `normalizeViewPrefs`/`normalizeViewPrefsMap` default every field, drop non-integer or ≤1 pages, and cap at 64 projects × 32 columns so a hand-edited file cannot crash the renderer or grow without bound. No ticket write and no gate input exists on this path. |
| Existing operations preserved | **Met.** I walked the report's parity table against the code rather than accepting it. Editor/`openEditor`/`trySelect`, `ContextMenu` (including "Move to ▸"), `QuickAdd` (both call sites), `FilterBar` (now gated on the derived `activeView === "ticket"`, given the same `allViewItems` expression as before), `Standup`, `ActivityPanel`, `Dispatches`, `ArchivedList` with `onRestore`/`onDelete` verbatim, `TabStrip`, `Settings`, the migration/staleness/board-worktree/update banners, Ctrl+1…3 / Ctrl+F / Ctrl+N / Ctrl+K / Ctrl+, / Ctrl+Tab / F1, the gate tint and Ctrl+Arrow are all either untouched or changed only by substituting `revealItem` for `setView + trySelect`. `setView("archived")` no longer exists anywhere — `activeView` is derived once from `view` and `scope`, so the tab strip, the rail, the badges and the empty states cannot disagree. `viewCounts(items)` is unchanged, so tab badges still ignore filters while the new column count is the filtered total and the pager reports the shown range: three numbers, three sources (FRD-019 R5a/R5b). All 55 pre-existing GUI test files pass unedited. |
| No new dependency; nothing outside `apps/gui/**` and the FRD | **Met**, verified from the ticket's contribution diff (`bd368549..ad8ac33a`) and an empty lockfile diff. The rail's glyphs are inlined SVG paths rather than an icon package. |
| FRD-036 written, correct format, no overclaim | **Met.** Frontmatter matches the house shape (`status: approved`, `covers:`), it states plainly that it supersedes nothing, refines FRD-019 §R5 and does not revive FRD-011, names the reference as a *design authority only* whose data is fabricated, and its slicing table assigns UI-C (list toggle, `expectedRevision` + conflict UI, keyboard stage-move parity audit, time-in-stage) and UI-D (packaged qualification) to GUI-153. Its Non-goals repeat that boundary. `npm run verify:docs` and `npm run check:manual` pass on the branch. |

## `Board.tsx` performance shape

Memoisation is not regressed. `Card` is still `memo`'d and every prop is a
primitive or a stable callback — the group chip deliberately arrives as
`groupChip: string | null` + `groupExtra: number` rather than the `groups`
array, which is the same discipline the pre-existing `blocked`/`dispatching`
booleans follow. `itemsRef` still shields `onCardDrop` from an items-shaped
dependency. In `App.tsx`, `allViewItems`, `viewItems`, `railCounts`,
`columnTotals` and `tabCounts` are all `useMemo`'d, and `selectView`,
`selectScope` and `revealItem` are `useCallback`s with stable identities.
`columnCards`/`mergeColumns` per render is unchanged from before this PR. I
found **no per-render filesystem or document read**: the only client call in
`Board.tsx` is `client.getGateStatus` inside `onDragBegin`. `Sidebar` is not
memoised and re-renders with `App` on every keystroke, but it renders ~14
buttons from already-computed counts, so that is noise, not a finding.

## Deviations and open questions, dispositioned

1. **`docs_todo` stays true / `refs` omits FRD-036** — F-010, accepted with a
   named action for whoever merges.
2. **Card DOM order (open question)** — **resolved in favour of the code, no
   change required.** I read the reference:
   `approved-ui/source/prototype.js:93` `card()` emits
   `<span class="row between"><span class="card-id">…</span>…</span>` then
   `<h3>` then `<span class="card-context">`. The implementation's
   `card-top` → `card-title` → `card-context` is the reference's order exactly,
   and the exception badges sit on the id line where the design puts them. The
   author's own instinct to check was right; the answer is that the current DOM
   is correct. The `<h3>`-vs-`<div>` difference is F-008.
3. **Labels kept on the card** — accepted. The implementation contract §4 says
   never delete information to make cards fit and §2 says compact density, not a
   data cull; labels are a user-set filterable attribute rendered quietly below
   the context line, and Board.test.tsx asserts they survive.
4. **Refusal narrowed to the whole-cell drop** — accepted as reasoned; the
   scope of what that actually catches is F-001.
5. **`selectScope` clears remembered pages** — accepted. A page stored against
   a column the new scope does not render addresses nothing; clearing is honest
   where clamping would preserve a number that means something else. Note that
   `selectView("ticket")` does *not* clear pages, which is the right asymmetry.
6. **`afterEach(cleanup)` in two test files** — F-011; harness only, verified
   across the whole diff.
7. **Global `prefers-reduced-motion`** — accepted, and stronger than a
   per-component rule.
8. **Screenshots not attached (open question)** — **uncovered, and I could not
   close it either.** This lane cannot drive an Electron window or capture a
   frame, so I did not run `npm run dev:gui`; asserting anything about rendered
   pixels would be fabrication. The author's substitute (a jsdom render of the
   real 422-record board through the real components, since deleted) is
   reproducible from the numbers in the report and I independently confirmed the
   arithmetic it depends on — `get_status.counts` reads done 373, backlog 15,
   archived 30, and `scopeCounts` is proven equal to `scopeItems(...).length`
   for every scope by `scopes.test.ts`. **Residual risk: pixel fidelity against
   `approved-ui/previews/`, real-pointer drag, hover states, and the live
   behaviour of the `prefers-reduced-motion` and ≤900px media queries are
   unverified by anyone.** They are UI-D/GUI-153 scope; the operator's manual
   pass (the nine-step script in the post-implementation report) is what should
   close them before the 0.4.2 cut.

## Independent verification

Run in `.worktrees/GUI-152`, scoped only — I did **not** run `npm run verify`
(HZN-009 reserves the full rail for CI and the cut). These were executed against
the GUI tree at `8ef01486`, which `git diff 8ef01486 ad8ac33a -- apps/ docs/`
proves is byte-identical at `ad8ac33a`; the merged tree is covered by the
hosted `verify` job on run `33941260052`.

| Command | Exit | Result |
|---|---|---|
| `npm run test -w @kanmer/gui` | 0 | 57 files, **646 passed** — reproduces the report exactly |
| `npm run typecheck -w @kanmer/gui` | 0 | node + web projects clean |
| `npm run build -w @kanmer/gui` | 0 | main, preload and renderer bundles built |
| `npm run verify:docs` | 0 | PASS — mirror, 3 remote chapters, 26 doctor ids, links/fences/canary/provider boundaries |
| `npm run check:manual` | 0 | manual up to date (22 chapters) |
| `npm run dev:gui` | not run | this lane cannot drive Electron; see open question 8 |

## Threads

No review threads, reviews or requested changes exist on this head. Confirmed
after the head moved through both `gh pr view --json comments,reviews` and the
GraphQL `reviewThreads` surface, which returns an empty node list.
`threads_snapshot` is therefore truthfully empty. The single issue comment on
the PR is my own round-0 disposition summary
(`#issuecomment-5548939864`), not a review thread. No bot has posted;
`chatgpt-codex-connector` is never a gate.

## Checks

**Run `33941260052`** (head `ad8ac33a`), read at the time of writing:

| Job | Id | Result |
|---|---|---|
| `verify` | 101239035884 | pending |
| `kanmer-gate` | 101239035996 | pending |
| `regate` | 101239038213 | skipped |

The previous run **`33940024896`** (head `8ef01486`) recorded `verify`
**SUCCESS** (job 101235488681, 8m37s) and `kanmer-gate` **FAILURE**
(job 101235488616) whose only finding was `NO_REVIEW_RECORD` — the record this
document supplies. Every other gate check passed there: `NO_TICKET`,
`OPEN_QUESTIONS` (0 of 0), `WRONG_STAGE` (review), `DEPENDENCY_BLOCKED` (none),
`WRONG_TARGET` (base `main` = the configured integration branch),
`COMMITS_UNREACHABLE` (`8ef01486` reachable — still true at the new head).

`board_sha` above is the board branch tip read with `boardSync` local == remote
and `ahead: 0`; the commit carrying this attestation is pushed as its
descendant, so `collectBoardEvidence`'s `merge-base --is-ancestor` test resolves
`current`. The gate reads the **remote** board and does not re-run on a board
push, so `kanmer-gate` must be re-run (`workflow_dispatch`) after that push
before any gate result is evidence about this record.

## Residual risk

F-001 (whole-cell stage-drop onto a paged column is refused) is the one a user
will meet on this board; it is loud, tested, and has two working alternatives.
F-003/F-004 are preference-persistence edges that cost at most a redundant write
or one deferred save. F-005/F-006/F-008/F-009 are polish and coverage notes.
The genuinely unverified surface is pixel and pointer behaviour (open question
8), which no automated evidence in this PR claims to cover — the report and the
FRD both say so plainly, which is the right kind of honesty.

## Verdict

**pass**, unchanged at `ad8ac33a`. The diff matches the packet and the plan; the
pipeline order the ticket exists to fix is enforced by construction rather than
by convention; the false-empty-state class is closed and tested on a 2,000-item
board; manual ordering still reads the whole column and the one drop paging
breaks fails loud instead of moving a card somewhere invisible; parity holds
across every surface I could reach in code; the FRD is well-formed and does not
claim UI-C/UI-D; the merge of `main` changed no reviewed byte; and no finding of
any severity is left open.

**Not merged, and the ticket has not been moved.** Merge requires `verify` and
`kanmer-gate` green at `ad8ac33a` with the board pushed, and the operator's
authorised merge — after which `refs`/`docs_todo` must be updated per F-010.
