# Proof — GUI-069

Gathered on **merged `main` @ `488797d`** ("fix(gui): render Backlog as the
board's first column (GUI-069) (#38)"), in the main checkout at
`C:\Users\PC\Documents\GitHub\kanmer`, after `git checkout main` and
`git pull --ff-only`. Not the feature branch.

## What was verified

| Ticket criterion | How | Result |
|---|---|---|
| **1.** With backlog tickets present, Backlog renders **first**, styled like every other stage, with its name from `STAGES` | `mergeColumns > renders Backlog first, and only once, when backlog tickets are present` — asserts `cols[0].id === "backlog"`, exactly one backlog column, and `cols[0].name === UI_STAGES[0].name` (`"Backlog"`, which `.col-head`'s `text-transform: uppercase` renders as `BACKLOG`). Plus the direct old-vs-new comparison below. | **Pass** |
| **2.** With zero backlog tickets the board still looks right — no column appearing/disappearing as the count crosses zero | `mergeColumns > renders every stage even when no item has that status` — `mergeColumns(stageColumns, [], stageIds)` returns all six stage ids. Structural, not incidental: the column list no longer reads `items` for its membership. | **Pass** |
| **3.** A genuinely unknown status still gets its fallback column, and still appears last | `mergeColumns > gives a genuinely unknown status a trailing fallback column` — an item with status `triage` yields a 7th column `{ id: "triage", name: "triage" }` at the end. Still holds when a known status is simultaneously hidden. | **Pass** |
| **The defect itself** — `mergeColumns` can now tell "unknown status" from "known status, deliberately hidden" | `mergeColumns > never resurrects a known status that was deliberately not rendered`, and `... still falls back for an unknown status while a known one stays hidden`. Both fail against the pre-merge implementation. | **Pass** |
| Governing docs untouched by this ticket, as planned | `git show --stat 488797d` — no path under `docs/` in the merge commit. | **Pass** |
| Q1 answered (a) honoured — no CSS change | `styles.css` absent from the merge commit. | **Pass** |
| Lane discipline — `App.tsx` untouched, so GUI-070/GUI-071 stay conflict-free | `App.tsx` absent from the merge commit. | **Pass** |

## Evidence

**Merge commit and its file list — five files, exactly the planned set:**

```
$ git log --oneline -2
488797d fix(gui): render Backlog as the board's first column (GUI-069) (#38)
43dcedb chore(gui): remove the "?" manual link from the Settings nav (#37)

$ git show --stat 488797d --name-only
apps/gui/release-notes.md
apps/gui/src/renderer/src/components/Board.tsx
apps/gui/src/renderer/src/lib/board.test.ts
apps/gui/src/renderer/src/lib/board.ts
packages/ui/src/index.ts
5 files changed, 118 insertions(+), 14 deletions(-)
```

**`npm test` — core and GUI suites on merged main:**

```
$ npm test
  (core)  Test Files  8 passed (8)        Tests  182 passed (182)
  (gui)   Test Files  21 passed (21)      Tests  209 passed (209)
          ✓ src/renderer/src/lib/board.test.ts (25 tests) 16ms
          ✓ src/shared/stages.test.ts (3 tests) 7ms
```

`shared/stages.test.ts` green is the tripwire from the `files` document: it
asserts `UI_STAGES` equals core's `STAGES`, so the fix did not stray into the
stage-definition layer.

*On the count:* the GUI suite reads **209** here against **210** on the feature
branch. That is not a lost test. The branch was cut from `origin/main@5d0e0d7`;
merged main also carries PR #37 (`43dcedb`), which deleted one `it` from
`manual/manual.test.ts` (`git show --stat 43dcedb -- '*.test.ts'` →
`manual.test.ts | 10 ----------`). This ticket's own file is intact:
`git show 488797d:…/board.test.ts | grep -c "  it("` → **25**, identical to
`git show 4936358:…` on the branch. Checked rather than waved past.

**The eight new cases, run scoped from `apps/gui` (verbose):**

```
$ cd apps/gui && npx vitest run src/renderer/src/lib/board.test.ts --reporter=verbose
 ✓ src/renderer/src/lib/board.test.ts > mergeColumns > keeps the configured columns in their given order
 ✓ src/renderer/src/lib/board.test.ts > mergeColumns > renders Backlog first, and only once, when backlog tickets are present
 ✓ src/renderer/src/lib/board.test.ts > mergeColumns > renders every stage even when no item has that status
 ✓ src/renderer/src/lib/board.test.ts > mergeColumns > gives a genuinely unknown status a trailing fallback column
 ✓ src/renderer/src/lib/board.test.ts > mergeColumns > never resurrects a known status that was deliberately not rendered
 ✓ src/renderer/src/lib/board.test.ts > mergeColumns > still falls back for an unknown status while a known one stays hidden
 ✓ src/renderer/src/lib/board.test.ts > mergeColumns > ignores an empty status value
 ✓ src/renderer/src/lib/board.test.ts > mergeColumns > defaults to the old behaviour when no known set is given
 Test Files  1 passed (1)
      Tests  25 passed (25)
```

**The fix demonstrated directly — old implementation vs shipped, same inputs**
(two `backlog` items, one `preparing`, one unknown `triage`; the old side is the
pre-merge `Board.tsx:29-34` body called the way the old board called it, with
`backlog` filtered out of the column list):

```
OLD board columns: preparing(Preparing) | implementing(Implementing) | review(Review) | verifying(Verifying) | done(Done) | backlog(backlog) | triage(triage)
NEW board columns: backlog(Backlog) | preparing(Preparing) | implementing(Implementing) | review(Review) | verifying(Verifying) | done(Done) | triage(triage)
NEW, backlog deliberately hidden: preparing | implementing | review | verifying | done | triage
```

Line 1 is the reported bug precisely: Backlog after Done, carrying its raw id
`backlog` as its display name because it arrived through the unknown-status
fallback. Line 2 is criteria 1–3 together. Line 3 is the underlying defect
fixed rather than dodged — a *known* status left out of the rendered list now
stays out, while the unknown one is still appended last.

**`npm run typecheck` — all four workspaces named, none silently skipped:**

```
> @kanmer/core@0.1.0 typecheck     > tsc --noEmit
> @kanmer/mcp-server@0.1.0 typecheck > tsc --noEmit
> @kanmer/ui@0.2.0 typecheck        > tsc --noEmit
> @kanmer/gui@0.3.2 typecheck       > tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json
```

(No errors. Naming all four is the AGENTS.md §10.3 requirement — the `-w` form
is what let `c8b94a4` ship.)

**Builds — the barrel changed, so `@kanmer/ui` must build:**

```
$ npm run build:ui
ESM ⚡️ Build success in 82ms      DTS ⚡️ Build success in 3092ms    (@kanmer/core)
ESM ⚡️ Build success in 131ms     DTS ⚡️ Build success in 4874ms    (@kanmer/ui)

$ npm run build -w @kanmer/gui
✓ built in 1.86s   ✓ built in 25ms   ✓ built in 815ms
```

**`npm run check:manual` — confirmed, not assumed:**

```
$ npm run check:manual
manual: up to date (12 chapters)
```

This is the plan's claim that no curated FRD lead prose changed, tested rather
than inferred. No `chapters.generated.ts` regeneration was needed.

**GUI smoke boot (AGENTS.md §10.5), against a sandbox built to hit every
criterion at once — two `backlog` tickets, one `preparing`, and one item with
the unknown status `triage`:**

```
$ cd apps/gui && KANMER_SMOKE=1 KANMER_OPEN=<sandbox> npx electron . --user-data-dir=<fresh>
EXIT=0
```

Exit 0 means it rendered; non-zero would mean it did not.

## Not covered

- **No screenshot, and no pixel-level check that `BACKLOG` is the leftmost
  header on screen.** `apps/gui` has **no component-test harness** — no jsdom,
  no React-testing-library, every suite is a pure-function vitest suite — which
  is exactly why `mergeColumns` was moved to `lib/board.ts` in the first place:
  it is the only way these criteria become assertions rather than eyeballing.
  What is proven is that the shipped function returns the six columns with
  `backlog` first and its `STAGES` name, that `Board.tsx` renders `statuses` in
  order into `.col-head` elements, and that the app boots. The remaining gap is
  the CSS between an ordered array and the pixels. Accepted; adding a jsdom
  harness was explicitly out of scope for this `fix`.
- **The keyboard path (Ctrl+← out of Preparing landing a card in Backlog) was
  not exercised interactively.** `App.tsx:658-671` was already walking all six
  stage ids before this ticket and is untouched by it, so the behaviour changes
  only in that the destination column is now visible and in the right place.
  No code path was modified to make it work.
- **Two governing-doc statements are knowingly false as of this commit** —
  `FRD-007` B4 and `FRD-011` R5 both still describe a kanban that starts at
  Preparing and a Backlog column that disappears. This is the planned, recorded
  cost of single ownership: **[[GUI-070]] ("Remove the separate Backlog view")
  owns both amendments**, is blocked by this ticket, and lands in the same lane
  and release. Not an oversight; if GUI-070 is dropped, these amendments must be
  re-homed rather than forgotten.
- **Backlog tickets are visible in two places** — the new board column and the
  still-present Backlog view — until GUI-070 removes the view. Deliberate
  ordering: GUI-069 lands first so there is never a moment with no way to see
  backlog tickets.
