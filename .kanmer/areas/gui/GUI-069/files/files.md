# Files — GUI-069

Lane note up front: **GUI-069 must not touch `App.tsx` or FRD-011.** GUI-070 and
GUI-071 both edit `App.tsx`, and GUI-070 owns every FRD-011 edit (see the
Ripples section for why that one is mechanical, not stylistic). Keeping to the
table below makes the three tickets conflict-free in parallel.

## Files this change touches

| Path | What changes | Risk |
|---|---|---|
| `apps/gui/src/renderer/src/components/Board.tsx` | Drop `.filter((s) => s.id !== "backlog")` and its comment at :115-121, so the column list is the full `UI_STAGES` again. Change the `mergeColumns` call to pass the known-stage ids separately from the rendered columns. | **Medium.** The board's only renderer; drag/drop maths, the memoized `Card`, the gated-drop tint and `gridTemplateColumns` all read `statuses`. Column count goes 5→6 when Backlog is empty (it is already 6 whenever a backlog ticket exists). `.content { overflow: auto }` (`styles.css:205-210`) absorbs the extra width, so no layout work is needed. |
| `apps/gui/src/renderer/src/lib/board.ts` | New home for `mergeColumns`, currently module-private in `Board.tsx:29-34`, taught to distinguish "unknown status" from "known status, deliberately not rendered". | **Low.** Pure, dependency-free helpers; the file already owns exactly this class of function (`columnCards`, `positionForDrop`, `optimisticOrder`) and is where the AGENTS.md §8 gotcha 9 note points implementers. Additive — no existing export changes shape. |
| `apps/gui/src/renderer/src/lib/board.test.ts` | New `describe("mergeColumns")` covering the three verification criteria: backlog renders first; a genuinely unknown status still gets a trailing fallback column; a known-but-hidden status is never resurrected. | **Low.** Additive. This is the only way to assert the fix — see the "no component harness" note below. |
| `packages/ui/src/index.ts` | Add `mergeColumns` to the "Pure helpers the components are built on" export block (:38-46) if it moves to `lib/board.ts`. Commit `841c5bc` calls barrel export a "standing obligation". | **Low**, with a caveat: `packages/ui/` is **untracked in git** as of this research (`?? packages/ui/` in `git status`). Confirm its tracking state before assuming an edit here lands. |
| `docs/functional/frd/FRD-007-fixed-six-stage-board.md` | Amend B4 (line 28): "The kanban renders Preparing → Done; Backlog renders as the dedicated list view (FRD-011)" is exactly what this ticket makes false. | **Low mechanically, gated by a decision.** One line. It is a governing doc reversing a shipped decision, so it needs the operator's word (open question Q2) and a note in the plan's Governing-docs section. B4 sits below the first `## ` heading, so it is **not** manual lead prose and needs no regeneration. |
| `apps/gui/release-notes.md` | New entry under `## 0.3.3 (unreleased — notes accumulating)`. | **Low.** Do not edit line 153 — that is a shipped release's notes, i.e. history. |

## Ripple effects

- **Generated manual — the reason FRD-011 is off-limits here.**
  `scripts/build-manual.mjs:41-47,62-72` compiles the **lead prose** (everything
  above the first `## `) of nine curated FRDs into the committed artifact
  `apps/gui/src/renderer/src/manual/chapters.generated.ts`;
  `npm run check:manual` fails when it is stale. FRD-011's Overview (line 10)
  is lead prose and *does* carry the false claim — but GUI-070 will rewrite that
  Overview anyway, and two tickets editing it means two tickets regenerating the
  same machine-written file. FRD-007's B4 is *not* lead prose, so amending it
  triggers no regeneration. Net effect: **GUI-069 requires no manual rebuild.**
- **Stage-mirror test.** `apps/gui/src/shared/stages.test.ts` asserts
  `UI_STAGES` equals core's `STAGES`. Nothing in this ticket edits either file,
  so it should stay green — if it goes red, the fix strayed into the wrong layer.
- **No component-test harness.** Every existing GUI test is a pure-function
  vitest suite; there is no jsdom / React-testing-library setup. `Board.tsx`
  cannot be asserted directly, which is precisely why `mergeColumns` has to
  leave it to be covered at all.
- **Design-system preview.** `packages/ui/src/demo.tsx` seeds three `backlog`
  demo items, so `Board` in the `@kanmer/ui` demo and the `.design-sync`
  previews/caches (`.design-sync/previews/Board.tsx`,
  `.design-sync/.cache/review/Board.*.json`) currently render the trailing
  fallback column too. Both trees are untracked; refreshing them is optional
  and explicitly not a blocker.
- **Keyboard move becomes coherent for free.** `App.tsx:658-671`
  (`moveRelative`, Ctrl+←/→) already walks all six stage ids, so Ctrl+← out of
  Preparing already moves a card to Backlog — today it disappears from the left
  and re-materialises at the far right. Worth checking manually after the fix;
  it needs **no code change**.
- **No new gate paths.** Backward moves cross no boundary
  (`packages/core/src/stages.ts:133-137`), and `getGateStatus` is already
  documented as returning a per-stage map (`apps/gui/src/shared/ipc.ts:463-467`),
  so the drop target and its lock-tint work without touching main or preload.
- **Verification (AGENTS.md §10).** Renderer-only change: `npm test`,
  `npm run typecheck` (all workspaces, not `-w`), `npm run build -w @kanmer/gui`,
  and the GUI smoke boot (§10.5). Core, the MCP server and the plugin bundle are
  untouched, so §10.6 does not apply.

## Deliberately out of scope

| Path | Why |
|---|---|
| `apps/gui/src/renderer/src/App.tsx` | **GUI-070 and GUI-071's lane.** View list, `VIEW_LABELS`, the `BacklogTable` branch and the tab counts all live here. GUI-069 needs nothing from this file. |
| `apps/gui/src/renderer/src/components/BacklogTable.tsx`, `lib/windowedRows.ts`, `lib/windowedRows.test.ts` | The separate Backlog view. GUI-069 lands *first* specifically so the column exists before GUI-070 removes the view. |
| `docs/functional/frd/FRD-011-backlog-list-view.md` | GUI-070 owns it. See the manual-regeneration ripple above. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts`, `apps/gui/src/shared/shortcuts.ts`, `apps/gui/src/renderer/src/manual/manual.test.ts` | Generated / view-list artifacts that only move when FRD-011 lead prose or the view list does. |
| `apps/gui/src/renderer/src/styles.css` | Only in play if open question Q1 is answered "yes, add stage colour". Unresolved — do not touch it speculatively. |
| `packages/core/src/stages.ts`, `apps/gui/src/shared/stages.ts` | The stage order is already correct in both. The bug is downstream of them. |

## Context files an implementer must read first

| Path | What it tells you |
|---|---|
| `apps/gui/src/renderer/src/components/Board.tsx:29-34` | `mergeColumns` — the actual defect. It cannot distinguish an unconfigured status from a configured-then-hidden one, which is why the filter at :119 was silently undone. |
| `apps/gui/src/renderer/src/components/Board.tsx:83-113, 250-260` | Why `Card` is memoized and why the drop callbacks read `itemsRef`. Passing a `Set` or a freshly-built object into `Card` re-renders the whole board on every dragover. Do not "tidy" this while you are in the file. |
| `AGENTS.md` §8 gotcha 9 | `order` is column-scoped while the board renders grouped by area; drop-neighbour maths must come from `columnCards(items, statusId)`. Adding a column does not change this, but a fresh reader of `Board.tsx` will otherwise assume the area groups are the unit. |
| `apps/gui/src/shared/stages.ts` (whole file) | Why the renderer keeps its own copy of the six stages — core is Node-only and the renderer may only `import type` from it. Do not "fix" the duplication; `shared/stages.test.ts` is what keeps the two honest. |
| `packages/core/src/stages.ts:35-74, 111-149` | Authoritative stage order, and `boundaryThreshold` — the reason a backward move into Backlog crosses no gate. |
| `scripts/build-manual.mjs:22-47, 62-72, 110-120` | Which FRDs feed the in-app manual, that only **lead prose** is compiled, and that `--check` fails on a stale artifact. This is what makes FRD-007-vs-FRD-011 a real distinction rather than a preference. |
| `git show 841c5bc -- apps/gui/src/renderer/src/components/Board.tsx` | The one-line commit that created the bug, with its reasoning. Reading it is what stops the fix being another one-line change in the opposite direction. |
| `apps/gui/src/renderer/src/lib/board.test.ts` | The house style for testing this layer: pure functions, property-shaped assertions, no DOM. |
