# Review — GUI-069 / PR #38

**I am both author and reviewer of this change. This is a self-review and should
not be read as an independent one.** What follows is an honest second pass over
my own diff, not a second opinion. The mitigation on offer is that everything
below is checkable: the commands and their output are recorded, and the
before/after is demonstrated rather than asserted.

## Changes (the reviewer's reading of the diff)

`gh pr diff` shows five files, matching `git diff --name-only origin/main`
exactly. Nothing snuck in.

1. **`apps/gui/src/renderer/src/lib/board.ts`** — `mergeColumns` arrives (+31
   lines), lifted from `Board.tsx` with one behavioural addition: a third
   parameter `known: Iterable<string> = []`. The body computes `hidden` = known
   minus rendered, and excludes those from the fallback set. Pure, no imports
   added, no existing export changed. The doc comment spends most of its length
   on *why the parameter exists* and names commit `841c5bc` — appropriate,
   because the parameter is otherwise unexplainable at the current call site.
2. **`apps/gui/src/renderer/src/lib/board.test.ts`** — +58 lines, one new
   `describe`, 8 cases; `UI_STAGES` newly imported. Existing suites untouched.
3. **`apps/gui/src/renderer/src/components/Board.tsx`** — net −5 lines. The
   local `mergeColumns` and the `STAGES.filter((s) => s.id !== "backlog")`
   comment block are gone; the import line gains `mergeColumns` and loses the
   now-unused `BoardColumn` type; the call site passes all six stages plus the
   stage-id list. **Nothing else in the component is touched** — I checked
   specifically for drive-by tidying of `itemsRef`, the memoized `Card` and the
   drop callbacks, since the `files` doc warns that a fresh `Set` or object into
   `Card` re-renders the board on every dragover. There is none.
4. **`packages/ui/src/index.ts`** — one line, alphabetically placed in the
   pure-helpers block.
5. **`apps/gui/release-notes.md`** — one new `0.3.3` subsection. Line 153 (the
   shipped release's "The board drops its Backlog column") is untouched, as the
   `files` doc required: that is history, not a claim about current behaviour.

## Comments

- **[non-blocking] The third `mergeColumns` argument is a no-op at the only call
  site.** `rendered` and `known` are both the full stage list, so `hidden` is
  always empty today. In a `fix` ticket that has the shape of speculative
  generality. I am satisfied it is not, and the reason is the ticket's own: the
  ambiguity *is* the defect. `841c5bc` demonstrated that conflating "no column"
  with "no column on purpose" silently reverses an intended exclusion, and the
  test that pins it is a regression test for a bug that actually shipped, not a
  guess about a future one. Accepting the alternative — delete the filter, leave
  `mergeColumns` alone — would leave the board one hidden stage away from the
  identical bug. **Disposition: won't-change.**
- **[non-blocking] `BoardColumn` removed from `Board.tsx`'s type import was not
  in the plan.** It is a mechanical consequence: the moved function was its only
  consumer in that file, and `tsc -p tsconfig.web.json` rejects the unused
  import, so the change could not compile without it. Same import statement,
  zero behavioural reach. **Disposition: fixed-in-PR, recorded in the checklist
  progress notes and the report.**
- **[non-blocking] Backlog tickets now appear in two places at once** — the new
  board column *and* the separate Backlog view in `App.tsx` — until GUI-070
  removes the view. That duplication is deliberate and is the reason the lane is
  ordered this way: GUI-069 lands first precisely so there is never a moment
  with no way to see backlog tickets. **Disposition: filed-as-ticket —
  [[GUI-070]] already exists, is blocked by this one, and owns the removal.**
- **[non-blocking] Two governing docs are false the moment this merges.**
  FRD-007 B4 and FRD-011 R5. Checked and accepted — see Governing docs below.
  **Disposition: filed-as-ticket — GUI-070 owns both amendments.**
- **[non-blocking] `color: s.color` remains dead data** on all six columns, as
  it was before this ticket. Open question Q1 answered (a): no column renders a
  stage colour today, so adding one would be a design change to six headers
  inside a `fix`. **Disposition: won't-do-because — and deliberately not filed,
  since nobody has asked for coloured headers.**
- **No blocking comments.** Nothing was raised that needs a PR Review ticket.

## Check 1 — report against diff

`post-implementation-report.md` lists all five files with a rationale each, and
each rationale matches what the diff does. It volunteers the two things a
reviewer would otherwise have to catch: the unplanned `BoardColumn` removal, and
that the new parameter is inert at the present call site. It also corrects the
research document's stale "packages/ui is untracked" note rather than repeating
it. The report claims no test or check it did not run. **Holds.**

## Check 2 — governing docs

The plan's Governing-docs section says GUI-069 amends **no** FRD, that FRD-007
B4 and FRD-011 R5 are consequently **false between this merge and GUI-070's**,
and names GUI-070 as the ticket that corrects them. Verified against the diff:
no file under `docs/` is touched. Verified against the board: `blocks: [GUI-070]`
is recorded on the ticket, so the corrective ticket visibly cannot be lost, and
GUI-069 is the head of that lane.

This is the part of a self-review most at risk of going easy on itself, so
stated flatly: **shipping a change that knowingly falsifies two governing-doc
statements is a real cost, accepted for a real reason.** B4 is a single sentence
whose two halves are reversed by two different tickets; splitting it across two
branches is a guaranteed same-line conflict, and FRD-011's Overview is lead prose
compiled into a committed generated artifact, so a second editor means a second
regeneration of a machine-written file. Single ownership by the ticket that lands
second is the only arrangement where the finished position is stated once,
correctly. The window is bounded to one PR in the same lane and release. **If
GUI-070 is dropped or deferred, these amendments must be re-homed, not
forgotten** — that is the risk this verdict is accepting, and it is written down
in the plan, the report, the PR body and here.

No new ADR was needed or written: the six-stage order is already authoritative
in `packages/core/src/stages.ts`. **Holds.**

## Check 3 — the code, and the ripples from `files`

- **Does it actually fix the bug?** Demonstrated, not assumed. Running the
  pre-GUI-069 implementation and the new one side by side over the same inputs
  (two `backlog` items, one `preparing`, one unknown `triage`):

  ```
  OLD board columns: preparing | implementing | review | verifying | done | backlog(backlog) | triage
  NEW board columns: backlog(Backlog) | preparing | implementing | review | verifying | done | triage
  NEW, backlog deliberately hidden: preparing | implementing | review | verifying | done | triage
  ```

  Line 1 is the shipped bug exactly as the ticket describes it — Backlog after
  Done, carrying its raw id as its name. Line 2 is all three verification
  criteria at once: Backlog first with its `STAGES` name, and `triage` still
  last. Line 3 is the defect fixed rather than merely dodged: a known status
  that is deliberately not rendered now stays gone, and the unknown one is still
  appended. The two regression tests in the suite assert lines 1→2 and 3; both
  fail against the old implementation.
- **Criterion 2 (zero backlog tickets).** Covered by "renders every stage even
  when no item has that status". The column list no longer reads `items` for its
  membership at all, so the appearing/disappearing behaviour cannot recur — this
  is structural, not a test-shaped patch.
- **Column header name.** `UI_STAGES[0].name` is `"Backlog"`, so `.col-head`
  (which uppercases) renders `BACKLOG` from a real stage rather than a raw id.
- **`shared/stages.test.ts` green** — the tripwire for the fix straying into the
  stage-definition layer. It did not; neither stage file is in the diff.
- **Ripples from the `files` document, each followed up:** manual regeneration
  — `npm run check:manual` run, `manual: up to date (12 chapters)`, confirmed
  not assumed; `@kanmer/ui` barrel — updated, and `packages/ui` verified
  **tracked** (21 files under `git ls-files`, `index.ts` in `origin/main`),
  correcting the research note; no gate/IPC work — none present, as predicted;
  `App.tsx` untouched, keeping the GUI-070/GUI-071 lane conflict-free.
- **Search for missed callers:** `mergeColumns` was module-private before this
  PR, and `grep` across `apps/gui` and `packages/ui` finds exactly one runtime
  caller (`Board.tsx:112`), the test file, and the barrel. No caller was left
  behind on the old signature — and the parameter's default preserves the old
  behaviour for any that might appear later, which is itself pinned by a test.
- **Unplanned extras:** none, beyond the one-token `BoardColumn` removal above.

## Rail (re-checked as reviewer, in `.worktrees/gui-069`)

| Command | Result |
|---|---|
| `npm test` | 21 files / **210 tests passed**; `board.test.ts` 25/25 incl. 8 new |
| `npm run typecheck` | clean; all four workspaces named in the output |
| `npm run build:ui` | success (barrel changed) |
| `npm run build -w @kanmer/gui` | success |
| `npm run check:manual` | `manual: up to date (12 chapters)` |
| `smoke.mjs` / `smoke-protocol.mjs` | 120/120 and 26/26 |
| GUI smoke boot (`KANMER_SMOKE=1`) | exit 0, sandbox with 2 backlog + 1 preparing + 1 `triage` |

`gh pr view`: `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`.

## Verdict

**PASS** — with the self-review caveat in the first line standing.

Checked: the diff file-by-file against the report; the plan's Governing-docs
section against both the diff and the board's `blocks` edge; every ripple listed
in the `files` document; the absence of `App.tsx`, `styles.css` and any `docs/`
file from the diff; the full rail re-run; and the fix demonstrated against the
old implementation on the same inputs rather than taken on trust.

One accepted risk, restated so it cannot be lost: **FRD-007 B4 and FRD-011 R5
are false from the moment this merges until GUI-070 lands.** GUI-070 exists, is
blocked by this ticket, and owns both corrections.

Merging, then → Verifying.
