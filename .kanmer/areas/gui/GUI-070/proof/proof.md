# Proof — GUI-070: Remove the separate Backlog view

**Evidence gathered on merged `main` at `2f06713`** (squash of PR #43, merged
2026-08-16T22:48:28Z), in the main checkout at
`C:\Users\PC\Documents\GitHub\kanmer` — not on the feature branch.

```
$ git log --oneline -1
2f06713 fix(gui): remove the separate Backlog view (GUI-070) (#43)
```

## The rail

```
$ npm run build:ui
@kanmer/core  ESM + DTS build success
@kanmer/ui    ESM + DTS build success (dist/index.d.ts 24.46 KB)

$ npm run typecheck
> npm run typecheck --workspaces --if-present
  @kanmer/core@0.1.0        tsc --noEmit      ok
  @kanmer/mcp-server@0.1.0  tsc --noEmit      ok
  @kanmer/ui@0.2.0          tsc --noEmit      ok
  @kanmer/gui@0.3.2         tsc --noEmit -p tsconfig.node.json && -p tsconfig.web.json   ok

$ npm run check:manual
manual: up to date (11 chapters)

$ npm test
Test Files  21 (20 passed, 1 pre-existing flake — see below)
     Tests  217 (215–216 passed, 1–2 pre-existing flakes)
```

`build:ui` and `typecheck` are jointly the evidence that
`packages/ui/src/index.ts` stopped re-exporting the deleted component — the one
edit that was invisible from the folder the ticket pointed at, and the one that
would have broken two workspaces if missed.

### The test count is smaller by design

**22 files / 230 tests → 21 files / 217 tests.** The difference is
`windowedRows.test.ts`, deleted with the module it covered. Measured, not
inferred: before deletion the original file was restored from `HEAD` and run on
its own —

```
$ npx vitest run src/renderer/src/lib/windowedRows.test.ts   # at pre-change HEAD
Test Files  1 passed (1)
     Tests  13 passed (13)
```

13 + 217 = 230. Nothing was silently disabled.

### The one failing test is a pre-existing flake, proven so

`src/main/kanmerGit.test.ts` intermittently fails 1–3 of its 7 cases in the main
checkout:

```
Error: Test timed out in 5000ms.
Error: EPERM, Permission denied: \\?\C:\Users\PC\AppData\Local\Temp\kanmer-git-6FsRCK
  ❯ src/main/kanmerGit.test.ts:49:3   rmSync(dir, { recursive: true, force: true, maxRetries: 3 })
```

Three independent lines of evidence that it is not this change:

1. **`GUI-070` touches nothing under `src/main/`** —
   `git show 2f06713 --stat | grep -c "src/main/"` → `0`.
2. **It fails the same way at the pre-merge base commit.** The base `fc2045b`
   was checked out and the file run there alone: same `Test timed out in 5000ms`
   + `EPERM … kanmer-git-p1uDFi`, 2 of 7 failing. The flake predates the merge.
3. **It passes in full when given room.**
   ```
   $ npx vitest run src/main/kanmerGit.test.ts --testTimeout=30000
   Test Files  1 passed (1)
        Tests  7 passed (7)   (37.8s total; individual cases 4.3–6.5s)
   ```
   The cases spawn real `git` subprocesses and delete temp worktrees; against a
   5 s default timeout on a loaded Windows box they sit on the edge, and
   `rmSync` hits the same `EPERM`-while-something-holds-the-file condition
   FRD-007 M5 documents. The same file ran **7/7 green inside the full suite** on
   the branch worktree before merge.

Not fixed here — it is a pre-existing test-infrastructure defect in a file this
ticket does not touch, and folding it in would be smuggling an unplanned change
through a deletion ticket.

## Ticket criterion 1 — "Backlog tickets are reachable and workable from the board alone"

**Met.** Observed in the running app (built `main`, opened on a throwaway
sandbox board with one Backlog and one Preparing ticket):

![The board on merged main: nav reads Board / Standup / Archived with no Backlog tab, and Backlog is the first of six columns holding GUI-001](assets/board-no-backlog-tab.png)

The screenshot shows both halves at once: **no Backlog tab in the nav**, and
`GUI-001` sitting in the **Backlog** column, first of six. Driving the app over
CDP confirmed it is workable, not merely visible:

```
board columns   ["Backlog","Preparing","Implementing","Review","Verifying","Done"]
click GUI-001   { selected: "GUI-001", editorFor: "GUI-001" }
```

The card selects and opens its editor — the same affordances as any other
column.

## Ticket criterion 2 — "View shortcuts still map to the right views with no gap in the numbering"

**Met, and verified at runtime rather than by reading the derivation.**
`shortcuts.ts:1-13` states on the record that no test covers the `App.tsx`
handler, so the app was booted with `--remote-debugging-port` and driven over
CDP. Every line below is an observation:

```
nav tabs                  ["Board","Standup","Archived"]          (no Backlog tab)
Ctrl+3  → active tab      "Archived"
Ctrl+1  → active tab      "Board"
Ctrl+2  → active tab      "Standup"
Ctrl+3  → active tab      "Archived"     (repeat, out of order — stable)
Ctrl+4  → active tab      "Board"        (unchanged: the key is now inert)
```

The keys were exercised out of order and repeated, so this is a mapping and not
a lucky sequence. **Ctrl+4 is inert** — it used to open Archived, and the
renumbering left no dangling binding. The prediction the ticket asked to be
verified (deriving from `VIEW_LABELS` absorbs the removal for free) held: not one
line of the handler changed.

Boot check separately:

```
$ KANMER_SMOKE=1 KANMER_OPEN=<sandbox> npx electron . --user-data-dir=<fresh>
exit 0
```

## Ticket criterion 3 — "No dead components or unreferenced exports left behind"

**Met.**

```
$ git grep -n "BacklogTable\|windowedRows" -- ':!*/dist/*' ':!*/out/*' ':!docs/*'
(no output)
```

No source file on `main` mentions either symbol. The surviving mentions are all
deliberate and all in `docs/`: FRD-011's amendment (which names
`BacklogTable.tsx`'s path in git history as the recovery route) and
`docs/plans/kanmer-v3/phase-5-…/plan.md` (a dated delivery plan, left as history
for the same reason `apps/gui/release-notes.md:155` was). Deleted outright:
`BacklogTable.tsx` (257 lines), `windowedRows.ts` (79), `windowedRows.test.ts`
(111); plus the 52-line CSS block, with **zero added lines** in that file's
diff — proof the shared `.check` / `.hint` / `.banner.warn` / `.spacer` rules
were not disturbed.

## Ticket criterion 4 — "FRD-011 amended, with the tradeoff recorded rather than erased"

**Met.** From `git show 2f06713 -- docs/functional/frd/FRD-011-backlog-list-view.md`:

```
+status: withdrawn
+withdrawn: 2026-08-16 by GUI-070 — the view was built, shipped, and removed; see the Amendment below
+> **Withdrawn.** This feature was built (GUI-015), shipped, and then removed
+> withdrawn document is a record, not a blank page — the reasoning is what makes
+- R1. ~~Columns: id, title, area, groups (chips), … Virtualized rendering …~~ **Withdrawn (GUI-070)** — there is no table.
+- R3. ~~Row actions: … multi-select for bulk move/label/group/archive.~~ **Withdrawn (GUI-070)** — and **not relocated**; see the amendment.
+- R4. ~~Horizon-group chips …~~ **Withdrawn as written (GUI-070)** — the chips themselves survive, but as a **board** feature …
+- R6. ~~Keyboard: arrow navigation, Enter opens, Space selects …~~ **Withdrawn (GUI-070)** — those row bindings existed only inside the table …
```

R5 is reversed in its own section, and the requirements are **struck, not
deleted** — the argument stays readable, which is the whole point of amending
rather than erasing. The tradeoff is recorded in the words the operator
required:

> **It did not move. It is gone.** Multi-select, bulk *Move to Preparing*, bulk
> archive, bulk add-to-group, and the per-ticket failure report … all of it died
> with `BacklogTable`. GUI-069's Backlog column is deliberately **plain**.

**All four governing documents amended, verified in the merged commit:**

| Doc | Amendment | Verified |
|---|---|---|
| `docs/functional/frd/FRD-011-backlog-list-view.md` | `status: withdrawn`, R5 reversed, R1/R3/R4/R6 withdrawn, bulk triage recorded as weighed and dropped, `withdrawn` convention written down for the next document | +108 lines in `2f06713`; quoted above |
| `docs/functional/frd/FRD-007-fixed-six-stage-board.md` | **B4, both halves** — kanban renders all six stages Backlog → Done, list view withdrawn, column deliberately plain | in `2f06713` |
| `docs/product/prd/PRD-001-kanmer-v3.md` | dated note under problem 6 naming the bulk-triage loss and saying problem 6 is *accepted* not solved; `:25` and `:30` carry inline pointers to it | +23 lines in `2f06713` |
| `docs/functional/frd/FRD-019-gui-shell.md` | R5 — three views, Board renders Backlog → Done | in `2f06713` |

Plus `docs/functional/frd/FRD-001-groups.md` (citation repoints only — the group
chips survive as a board feature) and `docs/manual/getting-started.md` (the
FRD-011 argument in user prose, rewritten rather than erased).

FRD-011 is still on disk, as it must be: `scripts/build-manual.mjs:64` throws on
a missing curated FRD. `npm run check:manual` reporting *up to date (11
chapters)* — down from 12 — is the evidence that the regenerated
`chapters.generated.ts` was committed and the "The Backlog list" chapter is gone
from the in-app manual.

## Downstream bookkeeping

**GUI-071's first verification criterion was struck** ("Backlog tab count equals
the number of rows the Backlog view shows"). Its body now carries a dated
amendment explaining that the view is gone while its actual defect — one shared
count expression for every non-Archived tab — is untouched and still needs
fixing. Visible in the screenshot above: the Board tab reads `2`, which is every
non-archived ticket, exactly the bug GUI-071 exists for.

## Summary

All four ticket criteria met on merged `main`. Rail green apart from one
pre-existing, load-sensitive flake in a file this change does not touch, proven
pre-existing by reproducing it at the base commit `fc2045b`.
