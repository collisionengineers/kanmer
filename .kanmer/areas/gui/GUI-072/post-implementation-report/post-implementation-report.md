# Post-implementation report — GUI-072

## Summary

Checkbox rows across the app now render as one line — box, gap, label text,
vertically centred — instead of a full-width bar with the text pushed beneath
it. The fix is two CSS rules and one deletion: a bare `.check` rule that lays
the row out as a flex line and gives the checkbox its intrinsic width back, and
the removal of the dead `.filterbar .check` pair whose existence made the class
*look* styled. No `.tsx` file changed. All four `.check` call sites are fixed —
including `BacklogTable.tsx:147`, a fourth broken site the ticket did not list —
and the one row that already rendered correctly (`.check-row`) is untouched.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/renderer/src/styles.css` (+16 at `:99`) | added bare `.check { display:flex; align-items:center; gap:8px; cursor:pointer }` and `.check input { width:auto }`, with a comment naming the global rule it counteracts | The defect needs two conditions: `input, select, textarea { … width:100% }` (`:82-92`) has no type exclusion so a checkbox stretches, and nothing outside `.filterbar` restored `width:auto` or gave the label a flex line. This supplies both. Placed immediately after the `input:focus` block so it sits with the base form styling it corrects, not inside a component section. |
| `apps/gui/src/renderer/src/styles.css` (−11 at `:602-612`) | deleted `.filterbar .check` and `.filterbar .check input` | Dead since the initial commit — `FilterBar.tsx` matches `check`/`checkbox` zero times; the "Archived" checkbox those rules styled became its own view. Keeping them is what made a mis-scoped rule masquerade as a styled class. |
| `apps/gui/src/renderer/src/lib/stylesCheckRule.test.ts` (new, 4 tests) | zero-dependency vitest test parsing `styles.css` | Regression guard for the selectors, no browser dependency added. |

**Deliberate omission, please read it as a decision.** `.check-row`
(`styles.css:1322`) is the reference implementation and carries
`font-size: 12px` and `margin-top: 6px` alongside its layout declarations.
`.check` takes the layout declarations **only**. Those two are typographic
choices belonging to the ticket-create modal; copying them would have shrunk the
Settings row text and shifted its spacing — a visible change beyond the reported
bug. `.check` therefore inherits whatever typography its surrounding section
already sets, which is why the before/after renders show identical text size.

**What the new test does and does not claim.** It is a **rule-presence
assertion**, said so in its filename comment, its `describe` string and this
report. It reads the stylesheet as text; it renders nothing, cascades nothing,
and cannot produce the 786px-vs-13px number that actually characterises this
bug. It catches someone deleting or renaming `.check`. It does not catch a
layout regression arriving by another route. It is not vacuous: stashing the
stylesheet change makes 3 of its 4 assertions fail. Adding jsdom or playwright
to `apps/gui` was declined by the operator (`open-questions` O2); the layout
evidence lives in proof.md instead.

## Governing docs

`refs`: `docs/functional/frd/FRD-019-gui-shell.md` — **meets, no amendment.**
R5 enumerates the Settings tabs and the Appearance controls (theme, density,
notifications, delete-confirm, new-ticket defaults). This change alters neither
the *set* of controls nor their *behaviour*: identical markup, identical state
wiring, identical semantics — only the rendered layout is corrected, restoring
the appearance R5 already presumes. FRD-019's acceptance line for R1–R5 ("the
shipped behaviours hold") is untouched. No ADR: copying an idiom already present
in the stylesheet is not a design decision. The decisions that *were* contested
(class-level vs. narrowing the global `input` rule; deleting the dead rule; not
unifying `.check-row`) are recorded in `open-questions` Q3–Q7 and re-affirmed by
the operator in `scratch/operator-answers.md`.

## Risks / follow-ups

- **The global `input` rule still stretches any future checkbox or radio not
  wrapped in `.check`.** This is the settled trade (Q3): narrowing
  `styles.css:82` re-cascades every text/number/search input in the app. The
  class-level fix is deliberately the narrower blast radius.
- **`.check` and `.check-row` remain two names for one idiom.** Left that way on
  purpose (Q5) — `.check-row` is the only row that has always rendered
  correctly, and collapsing it here would turn the reference into a regression
  risk. Safe follow-up, not this ticket.
- **Follow-up worth filing (Q7):** a stylesheet-wide audit for other
  component-scoped rules whose class is used by an unrelated component. The
  survey for this ticket covered every `className="check"` (four sites, all
  accounted for) but not the other 1,800 lines. Not filed yet.
- **Lane C sequencing:** CSS-only, so this collides with none of GUI-069/070/071
  (tab/view machinery, may delete `BacklogTable.tsx`) or GUI-074/080
  (`Settings.tsx`). If GUI-070 removes the Backlog view, one of the four fixed
  sites simply disappears; nothing here references that component.

## Verification hand-off

On merged `main`:

1. `npm test` — 205 tests, 22 files, including the 4 new rule-presence
   assertions. `npm run typecheck` across all four workspaces.
   `npm run build:ui` — regenerates the gitignored `packages/ui/dist/index.css`;
   confirm it carries `.check{display:flex…}` and no `.filterbar .check`.
2. **The visual proof, which is the substance of this ticket.** Re-render every
   `.check` call site over the merged `styles.css` in headless Chromium (the
   playwright cached in the gitignored `.ds-sync/` — machine-local, not a repo
   dependency), in dark, light and compact, and capture PNGs.
   **Then open each PNG with the `Read` tool and describe what it shows in
   proof.md.** Per the operator's binding condition, agent-rendered evidence
   counts as `proof:visual` *"as long as the image is actually reviewed using
   vision"* — geometry numbers are a measurement, not a review.
3. Keep the numeric assertions as the regression guard. Expected after the fix,
   at all four sites: checkbox 13×13px (was 786px in Settings, 94px in Backlog),
   label `display:flex` (was `inline`/`block`), box centre within 0.3px of the
   text centre (was ~20px off), label box 19–19.5px tall (was 36.5–38px, i.e.
   two lines), 11px gap between box and text, and clicking the label *text*
   still flips `checked`. `.check-row` must be byte-identical before and after.
4. State the limit: this proves Chromium layout produced from `styles.css`, not
   the packaged Electron app at the user's DPI/zoom, nor OS accessibility
   scaling.

The probe used pre-merge is at
`%TEMP%/claude/…/scratchpad/gui072/probe.mjs` (machine-local, not committed).
