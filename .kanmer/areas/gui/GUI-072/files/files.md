# Files — GUI-072

## What the change touches

| path | what changes | risk |
|---|---|---|
| `apps/gui/src/renderer/src/styles.css` | **The whole fix.** Add a bare `.check` rule mirroring `.check-row` (`display:flex; align-items:center; gap; cursor:pointer` + `.check input { width:auto }`). Reduce `.filterbar .check` (:602-612) to whatever is genuinely filter-bar-specific, or delete it as dead (research F4). Optionally narrow the global `input` rule at :82-92 to exclude checkbox/radio. | **Medium.** One global stylesheet, no CSS modules — a new bare `.check` is a new global class. Two specific traps: (a) if `.check` inherits `.filterbar .check`'s `font-size:12px`/muted colour, the Settings rows change size as well as position, which is scope creep the reviewer will notice; (b) touching the global `input` rule at :82 re-cascades every text/number/search input in the app — a much wider blast radius than the ticket asks for. |
| `apps/gui/src/renderer/src/components/Settings.tsx` (`:282`, `:309`, `:513`) | **No change expected.** The markup is already correct (`<label class="check"><input type="checkbox"> text</label>`). Only changes if the plan unifies on `.check-row` instead. | Low in itself — but `GUI-074` also edits this file (removes the "?" manual link from the Settings nav) and is in the same lane. A CSS-only fix avoids the collision entirely; a markup fix creates one. |
| `apps/gui/src/renderer/src/components/BacklogTable.tsx` (`:147`) | **No change expected**, same reason. This is the fourth broken site the ticket does not list. | Low, but **`GUI-070` may delete this file outright** ("Remove the separate Backlog view"). If GUI-070 lands first, this site disappears; if GUI-072 lands first, nothing is lost. Do not add a test that hard-references this component. |
| `apps/gui/src/renderer/src/components/TicketCreate.tsx` (`:192`) | **No change expected.** Only touched if the plan decides to collapse `.check-row` into `.check` and delete the duplicate rule. | Low. Currently the only *working* checkbox row in the app — if it is touched, it becomes the regression risk rather than the reference. |
| `apps/gui/src/renderer/src/lib/<new>.test.ts` (new) | The regression test, if one is added. Existing tests in this folder are pure-logic, node-environment vitest — a stylesheet-parsing assertion fits that shape with no new dependency; a layout assertion does not (research F8). | Low. The real risk is writing a test that *looks* like it proves layout while only proving a rule exists. Label it for what it is. |

## Ripple effects

- **`packages/ui` (`@kanmer/ui`) — rebuild, not edit.** The package is a barrel over the GUI renderer: `packages/ui/src/index.ts` re-exports the real components by relative path and imports the GUI's `styles.css`. There is **no shared checkbox component** and no second stylesheet, so the fix does not ripple into design-system *source*. It does change build output: `npm run build:ui` regenerates `packages/ui/dist/index.css`. `dist/` is gitignored, so nothing is committed and nothing goes stale in git — but an un-rebuilt local `dist/` will keep showing the bug.
- **`.design-sync/` demo harness.** `previews/Settings.tsx` and `previews/TicketCreate.tsx` render the real components through `@kanmer/ui`, so a design-sync re-capture picks the fix up after `npm run build:ui`. No preview file needs editing. `packages/ui/docs/components/*.md` are category stubs only — no change. (`.design-sync/` and `.ds-sync/` are both gitignored and machine-local.)
- **Tests.** `npm run test -w @kanmer/gui` today is node-environment vitest over `renderer/src/lib/*`; nothing existing touches CSS, so nothing existing can break. Adding jsdom or playwright would introduce the first browser-ish test in the repo and a vitest `environment` setting — a toolchain decision, not a styling one.
- **Governing docs.** `docs/functional/frd/FRD-019-gui-shell.md` R5 enumerates the Appearance-tab controls; this ticket changes their appearance, not their behaviour or set, so **no FRD amendment is needed**. Worth one line in the plan's Governing-docs section saying exactly that, so review does not go looking.
- **Sequencing (HZN-003 lane C).** `GUI-069` → `GUI-070` → `GUI-071` all rework the tab/view machinery and `GUI-070` may delete `BacklogTable.tsx`; `GUI-074` edits `Settings.tsx`. A CSS-only fix collides with none of them and can be sequenced anywhere in the lane. A markup-touching fix collides with two of them.
- **Build artefacts.** `apps/gui/out/` only; gitignored. No packaging, updater, or MCP-server surface is involved.

## Context files — read these before touching anything

| path | what it tells you |
|---|---|
| `apps/gui/src/renderer/src/styles.css:82-92` | The actual cause: `input, select, textarea { … width: 100% }` with no type exclusion. Any fix that does not neutralise this for checkboxes is not a fix. |
| `apps/gui/src/renderer/src/styles.css:1322-1332` (`.check-row`) | The working reference implementation of a checkbox row. Copy its declarations; do not invent new ones. |
| `apps/gui/src/renderer/src/styles.css:602-612` (`.filterbar .check`) | The rule that made the class *look* styled. `FilterBar.tsx` has had no checkbox since the initial commit, so this is dead — decide explicitly whether to delete it. |
| `apps/gui/src/renderer/src/components/TicketCreate.tsx:192` | The one checkbox row that renders correctly today. If it regresses, the fix over-reached. |
| `.design-sync/NOTES.md` | Explains that `@kanmer/ui` is a barrel over the GUI and that `npm run build:ui` is what propagates a renderer change into the design system. Prevents the wrong assumption that `packages/ui` holds its own components or CSS. |
| `.worktrees/kanmer/.kanmer/areas/gui/GUI-012/proof/proof.md` | Precedent for how a GUI visual claim has been written honestly on this board — it separates what tests established from what "needs a human at a running app". GUI-072 can beat that bar (see research "How this can be proven"), but should be as explicit about its limits. |
| `.worktrees/kanmer/.kanmer/groups/HZN-003/run.md` | Lane C membership and the known-collision list, incl. `GUI-074` on `Settings.tsx`. |

## Deliberately out of scope

- Redesigning form/field styling in Settings generally (spacing, field widths, section rhythm). This ticket restores one row layout.
- Removing the Backlog view or its actions row — that is `GUI-070`.
- The "?" manual link in the Settings nav — that is `GUI-074`.
- A general audit for *other* component-scoped rules whose class is used by an unrelated component (the ticket's third Approach bullet). The survey done here found `.check` to be the only live instance of that pattern among checkbox rows; a stylesheet-wide dead/mis-scoped-selector audit is real work and belongs in its own ticket, not smuggled into a one-rule fix.
- Converting `styles.css` to CSS modules or a token/component layer.
