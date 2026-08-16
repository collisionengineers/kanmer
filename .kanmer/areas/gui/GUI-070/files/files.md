# Files — GUI-070

*The surface area of deleting the standalone Backlog view. Line numbers are as
read on 2026-08-16, **before** [[GUI-069]] lands; GUI-069 edits `Board.tsx` only,
so `App.tsx` numbers should hold, but re-locate by symbol rather than trusting a
line.*

Scope is set by the operator decision in `scratch/notes.md`: **option 1 — accept
the loss.** Nothing here ports multi-select or bulk actions onto the board.

## Where the change lands

| Path | What changes | Risk |
|---|---|---|
| `apps/gui/src/renderer/src/App.tsx` | Remove the `BacklogTable` import (`:35`); drop `"backlog"` from `type View` (`:49`) and from `VIEW_LABELS` (`:51-56`); delete the `view === "backlog" ? …` render branch and its four inline handlers (`:1184-1211`). | **Medium.** The render branch is a chained ternary — Board / backlog / standup / else-Archived. Cutting the middle arm wrong silently changes which view renders. The four handlers (`onMove`, `onArchive`, `onAddToGroup`, `groups`) are used **only** here; leaving them behind leaves unreachable async code that still typechecks. |
| `apps/gui/src/renderer/src/components/BacklogTable.tsx` | **Delete** (257 lines). | Low once `App.tsx` and `packages/ui` stop importing it — but it is imported from *two* trees, and the second is easy to miss. |
| `apps/gui/src/renderer/src/lib/windowedRows.ts` | **Delete** — verified sole consumer is `BacklogTable.tsx:3`. | Low. Re-run the grep after GUI-069 lands: if GUI-069 virtualized the new Backlog column (it should not have — see its ticket), this file survives and only the test's ownership changes. |
| `apps/gui/src/renderer/src/lib/windowedRows.test.ts` | **Delete** with the module it tests. | Low. Deleting a passing ~110-line suite reduces the GUI suite's count; expect and state that in the report so it does not read as a regression. |
| `apps/gui/src/renderer/src/styles.css` | Delete the `/* Backlog list view (GUI-015) */` block, `:1784-1834` — `.backlog`, `.backlog-actions`, `.backlog-scroll`, `.backlog-table`, `.backlog-table thead th`, `.backlog-table tbody tr(.selected)`, `.backlog-table td`, `.backlog-title`. | **Medium.** Delete the block, not "everything matching backlog": `.check`, `.hint`, `.banner.warn` and `.spacer` inside the markup are shared and must stay. `:1821` carries the `must match ROW_HEIGHT in BacklogTable.tsx` comment — its counterpart dies here, so no orphan coupling remains. |
| `apps/gui/src/shared/shortcuts.ts` | `:29` relabel `Ctrl+1…4 / "Switch view (Board, Backlog, Standup, Archived)"` → `Ctrl+1…3 / "Switch view (Board, Standup, Archived)"`; delete the three Backlog-context rows `:32-34` (`↑ / ↓`, `Space`, `Enter`); refresh the header comment `:10-12` that explains the derivation using the Backlog view as its example. | **Medium.** `manual.test.ts` parses this table two ways (contains-checks and a strict "nothing extra" row diff), so a formatting slip fails the suite. The three deleted rows have no surviving home — arrow/Space/Enter row semantics existed only in `BacklogTable`. |
| `apps/gui/src/renderer/src/manual/manual.test.ts` | `:60` drop `"Backlog"` from `["Board", "Backlog", "Standup", "Archived"]`. | **High if missed** — this is the one test that *will* fail from the `shortcuts.ts` edit. Update the assertion to match the new reality; do not weaken it. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | **Regenerate** via `npm run build:manual`. Never hand-edit — the header says so and `npm run check:manual` diffs it. | **Medium.** Committed build artifact. Skipping the regen ships an app whose manual still has a "The Backlog list" chapter and a Ctrl+1…4 row, and fails `check:manual`. |
| `scripts/build-manual.mjs` | Remove the `["backlog", "The Backlog list", "FRD-011-backlog-list-view.md"]` entry from `FROM_FRD` (`:35`). | **Medium.** If left, the chapter regenerates from the amended FRD's lead prose — i.e. the manual gains a chapter explaining that a view users cannot find was deleted. Also note `:64` **throws** if the FRD file is missing and `:66` throws on empty lead prose: FRD-011 must keep a non-empty overview if the entry is kept, and must not be deleted from disk either way. |
| `packages/ui/src/index.ts` | Delete `:17-18` — the `BacklogTable` and `BacklogTableProps` re-exports. | **High if missed.** `packages/ui` is a tracked workspace (`workspaces: ["packages/*", "apps/*"]`); leaving these breaks `npm run typecheck` (AGENTS.md §10 item 3 requires all four workspaces) and `npm run build:ui`. It is invisible from `apps/gui/src/renderer/`, which is where the ticket points. |
| `docs/functional/frd/FRD-011-backlog-list-view.md` | **Amend in place** (required work, not optional): reverse R5, mark R1/R3/R4/R6 as withdrawn with the reason, and record that bulk triage was weighed and dropped rather than relocated. Keep a non-empty overview. Status field needs a decision (see `open-questions`). | **Medium.** The ticket and the operator note both make this a deliverable; review checks the claim against the diff. Getting it wrong = the repo's governing docs describe a feature that does not exist. |
| `docs/functional/frd/FRD-019-gui-shell.md` | `:14` R5 — drop `Backlog (FRD-011)` from the list of views the GUI shell offers. | Low. One clause. `status: approved`, so the edit is a real amendment to an approved doc, not a draft tweak. |
| `docs/manual/getting-started.md` | `:11-12` — rewrite "Backlog is a list rather than a column, because a long queue is something you scan and triage…". It is the FRD-011 argument in user prose and it is now false. | **Medium.** Feeds `chapters.generated.ts` chapter 0, so the edit is upstream of the regen — do it *before* `npm run build:manual`. `manual.test.ts:14-19` requires every chapter body > 80 chars, so do not gut the paragraph. |
| `apps/gui/src/renderer/src/components/FilterBar.tsx` | `:5` comment "A group id — the cross-cutting lens (FRD-001 G8, FRD-011 R4)" — drop the FRD-011 R4 citation; the chips survive as a board feature. | Low, comment-only. Skippable, but leaves a citation pointing at a withdrawn requirement. |
| `apps/gui/src/renderer/src/App.tsx` (second site) | `:1726` comment "…useful rather than decorative (FRD-001 G8 / FRD-011 R4)" — same citation fix. | Low, comment-only. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `.kanmer/areas/gui/GUI-070/scratch/notes.md` | The binding operator decision. Option 1: accept the loss; no bulk-action port; FRD-011 amended, not silently contradicted. Read before deciding anything about "keeping" `BacklogTable`. |
| `apps/gui/src/renderer/src/components/Board.tsx` (`:29-33`, `:105-120`) | Where the assumption lives. `STAGES.filter((s) => s.id !== "backlog")` plus `mergeColumns`' unknown-status fallback is the current (accidental) reason backlog tickets appear at all — GUI-069's territory. If this still reads `!== "backlog"` when you start, **GUI-069 has not landed and this ticket must not proceed**: that is the cheapest possible pre-flight check. |
| `apps/gui/src/renderer/src/App.tsx` `:929-940` | The Ctrl+1…9 handler, derived from `Object.keys(VIEW_LABELS)` with a comment explaining that the previous parallel array went stale exactly when Backlog was added. This is why removal renumbers for free — and the comment's example becomes historical, which is fine to leave as history but worth reading before editing. |
| `apps/gui/src/shared/shortcuts.ts` `:1-13` | States on the record that the manual test proves *chapter ↔ table*, never *table ↔ handler*. So nothing automated will catch a wrong Ctrl+1…3 mapping: the renumbering must be checked by running the app. |
| `apps/gui/src/renderer/src/App.tsx` `:82-87`, `:94`, `:202-207`, `:221-222` | `SavedTabState.view` is in-memory only (`useRef<Map>`), never persisted. Proof that no migration, fallback or "unknown view → Board" guard is needed. Do not add one. |
| `scripts/build-manual.mjs` `:22-38`, `:62-72`, `:110-119` | The manual pipeline: curated FRD list, throws on a missing FRD or empty lead prose, `--check` fails on a stale committed artifact. Explains both why FRD-011 must survive as a file and why the regen is mandatory. |
| `apps/gui/src/renderer/src/manual/manual.test.ts` `:34-63` | Two assertions bracket the shortcuts table — every entry present, and *nothing* present that is not an entry. Tells you the `shortcuts.ts` edit has to be exact, and shows the hard-coded view list at `:60` that must change with it. |
| `packages/ui/src/index.ts` | Every component is re-exported from the GUI source tree by relative path. Deleting any renderer component is a two-tree edit; this file is the second tree. |
| `.kanmer/areas/gui/GUI-071/GUI-071.md` | The other ticket in this JSX block. Its `App.tsx:1067-1072` count expression sits *inside* the `VIEW_LABELS` map this ticket shrinks. Read it to sequence, and note its first verification criterion ("Backlog tab count equals the number of rows the Backlog view shows") is void once this lands. |
| `AGENTS.md` §6 and §10 | The command table and the done-checklist: whole-repo `npm run typecheck` (not `-w @kanmer/gui`), `npm test`, `npm run build -w @kanmer/gui`, and the `KANMER_SMOKE=1` electron boot for GUI-facing changes — which is the only real evidence the shortcut renumbering works. `npm run check:manual` belongs in the same run. |
| `docs/functional/frd/FRD-014-doc-type-guidance.md` `:15` | The repo's doc convention: ADRs are superseded and never edited; FRDs describe one feature with acceptance criteria. Supports amending FRD-011 in place rather than minting a superseding doc. |
| `apps/gui/release-notes.md` `:155` | Describes the shipped Backlog view in past release history. Historical record — **do not** amend it; the temptation to "fix" it is the trap. |

## Ripple effects

- **Tests.** `manual.test.ts:60` fails unless updated (the only forced test edit).
  `windowedRows.test.ts` disappears with its module — the GUI suite loses a file
  and its cases; say so in the report so the reviewer does not read a shrinking
  count as a deleted safety net.
- **Typecheck.** `npm run typecheck` covers `@kanmer/ui`; `packages/ui/src/index.ts`
  must land in the same commit as the component deletion or the workspace build
  breaks.
- **Committed build artifact.** `apps/gui/src/renderer/src/manual/chapters.generated.ts`
  must be regenerated (`npm run build:manual`) and committed; `npm run check:manual`
  is the gate that catches a miss.
- **Governing docs.** FRD-011 amended (required deliverable); FRD-019 R5 amended;
  FRD-007 B4 and PRD-001 problem 6 / bullets at `:25`, `:30` contradict the new
  reality — ownership is an open question, not silently this ticket's.
  `FRD-001-groups.md:27` (G8) cites FRD-011 for the group-chip GUI surface; the
  surface survives, so at most the citation is repointed.
- **Gitignored outputs.** `apps/gui/out/renderer/assets/*.css` and
  `packages/ui/dist/` contain BacklogTable traces and regenerate on build — no
  action, listed so a grep hit does not look like missed work.
- **Manual chapter deep links.** `manual.test.ts:66-73` asserts the deep-link
  targets `profiles, stages, documents, proof, shortcuts, troubleshooting` exist.
  `backlog` is **not** among them, so removing the chapter breaks no deep link —
  confirmed, not assumed.
- **Sequencing.** GUI-069 first (hard blocker). GUI-071 after, on the same JSX
  block — see `open-questions`.

## Out of scope

- **Porting bulk actions to the board** (multi-select, bulk move / archive /
  add-to-group, the per-ticket failure report). Explicitly ruled out by the
  operator's option-1 decision; ported affordances would contradict GUI-069's
  "plain first column" too.
- **Board column ordering and the `mergeColumns` fallback defect** — GUI-069.
- **The view tab count expression** (`App.tsx:1067-1072`) — GUI-071. This ticket
  removes a key from the object the loop iterates; it must not touch the count
  logic inside it.
- **`apps/gui/release-notes.md`** — history, not documentation.
- **Deleting `FRD-011` from disk** — `build-manual.mjs` throws on a missing
  curated FRD, and the operator required an amendment that records the tradeoff.
- **Adding a component test for the board's Backlog column** — the GUI has no
  jsdom/testing-library setup; introducing one is its own ticket.
