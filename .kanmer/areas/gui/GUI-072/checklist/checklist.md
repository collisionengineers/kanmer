# Checklist — GUI-072

Derived from plan.md, one box per step.

- [x] Add the bare `.check` rule to `styles.css` after the `input:focus` block — `display:flex; align-items:center; gap:8px; cursor:pointer` + `.check input { width:auto }`, layout declarations only (no `font-size`, no `color`, no `margin`)
- [x] Grep `FilterBar.tsx` for `check` to confirm it is dead, then delete `.filterbar .check` and `.filterbar .check input` (styles.css:602-612)
- [x] Confirm no `.tsx` file is modified — CSS-only route (file-disjoint from GUI-070/074/080)
- [x] Add `apps/gui/src/renderer/src/lib/stylesCheckRule.test.ts` — zero-dependency, parses `styles.css`, asserts bare `.check` + `.check input{width:auto}` exist and `.filterbar .check` is gone, labelled in its `describe` and header comment as a **rule-presence assertion, not a layout assertion**
- [x] Rail green: `npm test`, `npm run typecheck`, `npm run build:ui`
- [x] Render BEFORE PNGs (merge-base `styles.css`) for all four `.check` sites + `.check-row`, in dark, light, and compact density, via the gitignored `.ds-sync/` playwright
- [x] Render AFTER PNGs under the same three conditions
- [x] **Open every PNG with the `Read` tool** — actually look at the images; measuring geometry does not satisfy the operator's proof condition
- [x] Numeric assertions captured: checkbox width ≤ ~20px at all four sites, label `display:flex`, checkbox vertical centre aligned with label text, label box single-line, label-text click still toggles `checked`, `.check-row` unchanged before vs. after
- [x] Post-implementation report written; PR opened
- [ ] Review (author = reviewer, stated in the first line); merge with `gh pr merge`
- [ ] `move_item GUI-072 verifying`; write `proof.md` from merged main — including a description of what the before/after images SHOW in words that could only come from looking, plus the honest limit (Chromium layout from `styles.css`; not the packaged app at the user's DPI or under OS accessibility scaling)
- [ ] `move_item GUI-072 done`; closeout from the MAIN checkout (worktree removed, branch deleted, ticket released)

## Progress notes

**Grep confirming `.filterbar .check` is dead** — `FilterBar.tsx` matches
`check`/`checkbox` zero times (case-insensitive); the only `filterbar` string in
any `.tsx` is `className="filterbar"` at `FilterBar.tsx:49`. Both rules deleted.

**The committed test is a real guard, not a vacuous one.** Stashed the
stylesheet change and re-ran it: 3 of its 4 assertions fail against the pre-fix
`styles.css` (`no bare .check rule …: expected null not to be null`;
`.check input` missing; `.filterbar .check` still present). The 4th — the
`.check-row`-unchanged assertion — passes in both states, which is the point of
it.

**Two probe-scaffolding artefacts found and corrected**, worth recording because
both would have become false findings in proof:
1. The label-click test first reported "no toggle" everywhere. Cause: it clicked
   the label's *bounding rect* corner, which for a 2-line inline label is not
   over the text run, and for the lower sites was below the viewport. Fixed by
   clicking the centre of the text run's last client rect and raising the
   viewport to 1400px. Label-click toggles at **all five** sites in **both**
   states — the bug never broke toggling, only layout.
2. The compact-density variant first wrapped the whole tree in a real
   `.board.compact` box. `.board` is `display:grid; grid-template-rows:auto 1fr`,
   so the stacked views became grid items and `.modal.ticket-create` collapsed to
   28px, clipping the control row. That measured the harness, not the stylesheet.
   Replaced with a `display: contents` wrapper, which contributes the compact
   selector ancestry without generating a box — the right shape, since compact
   density is a cascade question.

**Compact density cannot reach a checkbox row at all.** Every `.board.compact`
selector in the stylesheet targets `.cell`, `.card`, `.card-title` or
`.area-group` (styles.css:297-309), and the class lives on Board's own div
(`Board.tsx:141`). No `.check` site is inside `.board`: Settings and TicketCreate
are modals, BacklogTable renders `.backlog`. The compact render is consequently
pixel-identical to the dark render, before and after.

**`packages/ui` needed no source change**, as `files` predicted. `npm run build:ui`
regenerated `dist/index.css`, which now carries `.check{display:flex;…}` at line 99
and no `.filterbar .check` at all. `dist/` is gitignored — `git status` shows only
the stylesheet and the new test.

---

## Closeout — GUI-072

- [x] PR merge verified — #39 `MERGED` at 2026-08-16T22:23:00Z, merge commit `ed52e39`
- [x] proof.md finalised — written on merged main at `ed52e39`, six images under `proof/`
- [x] Moved to final stage (done, 2026-08-16T22:27Z)
- [x] Outcome recorded in ticket body (PR link, corrected verification list, follow-up GUI-082)
- [x] cd out of worktree; `git worktree remove .worktrees/gui-072`
- [x] `git branch -D gui-072-checkbox-rows` (squash-merged, so `-d` refuses by design)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
