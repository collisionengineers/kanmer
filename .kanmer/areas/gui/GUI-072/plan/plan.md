# Plan — GUI-072: Fix checkbox rows floating away from their labels in Settings

Written FROM `research` and `files`, with the operator's answers in
`scratch/operator-answers.md` treated as binding.

## Approach

**CSS-only, class-level.** The defect needs two conditions to hold at once
(research F1): the global `input, select, textarea { … width: 100% }` rule at
`styles.css:82-92` stretches `input[type="checkbox"]`, and there is no bare
`.check` rule to counteract it, so the `<label>` stays `display: inline` and the
stretched control pushes the text onto the next line. Measured: Settings
checkbox **866px** wide, Backlog actions checkbox **94px**, correctly-styled
`.check-row` **13px**.

We add the missing bare `.check` rule, modelled on the working `.check-row`
(`styles.css:1322-1332`, `TicketCreate.tsx:192`), and delete the dead
`.filterbar .check` pair. We do **not** narrow the global `input` rule: it
re-cascades every text/number/search input in the app for no benefit any current
screen needs, and it is the settled decision in `open-questions` Q3. We do **not**
touch any `.tsx` — that is what keeps this ticket file-disjoint from GUI-074 and
GUI-080 (both edit `Settings.tsx`) and GUI-070 (may delete `BacklogTable.tsx`).
We do **not** unify `.check-row` into `.check` (Q5): it is the only checkbox row
that renders correctly today, and collapsing it would turn the reference
implementation into a regression risk.

**One deliberate deviation from "copy the reference verbatim":** `.check-row`
carries `font-size: 12px` and `margin-top: 6px` alongside its layout
declarations. Those are typographic/spacing choices belonging to the
ticket-create modal, not to the checkbox-row idiom. Copying them into `.check`
would shrink the Settings row text and shift its spacing — a visible change
beyond the reported bug, and exactly the scope creep `files` flags as trap (a).
So `.check` takes **only** the layout declarations
(`display:flex; align-items:center; gap:8px; cursor:pointer`) plus
`.check input { width:auto }`. Nothing about colour or font size.

## Governing docs

`refs`: `docs/functional/frd/FRD-019-gui-shell.md`.

- **Meets — no amendment needed.** FRD-019 **R5** enumerates the Settings tabs
  and the Appearance controls ("theme dark/light/system, density, notifications,
  delete-confirm, new-ticket defaults"). This ticket changes neither the *set* of
  controls nor their *behaviour* — the notifications and delete-confirm
  checkboxes, and the Git "Automatic sync" checkbox, keep identical markup, identical
  state wiring, and identical semantics. Only their rendered layout is corrected,
  restoring the appearance R5 already presumes. FRD-019's own acceptance line for
  R1–R5 ("the shipped behaviours hold") is unaffected because no behaviour changes.
- **Modifies:** none.
- **New ADR:** none. A one-rule CSS fix that copies an idiom already present in
  the stylesheet is not a design decision worth an ADR. The decisions that *were*
  contested (class-level vs. root-cause; delete the dead rule; do not unify
  `.check-row`) are recorded in `open-questions` Q3–Q7 and re-affirmed by the
  operator in `scratch/operator-answers.md`.

## Steps

1. **Add the bare `.check` rule** to `apps/gui/src/renderer/src/styles.css`,
   immediately after the `input:focus, select:focus, textarea:focus` block
   (~line 98) so it sits with the base form styling rather than inside a
   component section:

   ```css
   /* Checkbox row: neutralises the full-width `input` rule above. */
   .check {
     display: flex;
     align-items: center;
     gap: 8px;
     cursor: pointer;
   }
   .check input {
     width: auto;
   }
   ```

   Layout declarations only — no `font-size`, no `color`, no `margin`.

2. **Delete the dead `.filterbar .check` and `.filterbar .check input` rules**
   (`styles.css:602-612`). `FilterBar.tsx` has had no checkbox since the initial
   commit (research F4); the rules match nothing. Confirm with a grep over
   `FilterBar.tsx` for `check` before deleting, and record that grep as the
   zero-risk evidence.

3. **Add the zero-dependency regression test**, `apps/gui/src/renderer/src/lib/`
   `stylesCheckRule.test.ts`: read `styles.css` from disk and assert (a) a bare
   `.check { … }` rule exists carrying `display: flex` and `align-items: center`,
   (b) a `.check input { width: auto }` companion exists, (c) no
   `.filterbar .check` rule remains. **Name and document it honestly as a
   rule-presence assertion, not a layout assertion** — the file's `describe`
   block and a header comment must say so in as many words. It cannot and does
   not measure geometry; jsdom performs no layout and no browser dependency is
   being added (`open-questions` O2, operator-confirmed).

4. **Rail:** `npm test`, `npm run typecheck`, `npm run build:ui`
   (the last regenerates the gitignored `packages/ui/dist/index.css`; `packages/ui`
   is a barrel over the GUI renderer, so nothing there is edited and nothing is
   committed).

5. **Produce the visual proof** (see Verification below) — before and after PNGs,
   each actually opened with the `Read` tool.

6. Post-implementation report, PR, review (author = reviewer, stated in the first
   line), merge, `verifying`, `proof.md` written from the merged main checkout,
   `done`, closeout.

## Verification

The board's `proof:visual` policy for this ticket is settled in
`scratch/operator-answers.md`, in the operator's words: *"Agent rendered evidence
counts, as long as the image is actually reviewed using vision."* That is a
literal requirement and drives this section.

**A. The images (the proof).**
Using the playwright already cached in the gitignored, machine-local `.ds-sync/`
(never a repo dependency), render the real `styles.css` over the real markup
shapes for all four `.check` sites plus the `.check-row` control:

1. **Before** — `styles.css` at merge-base: capture PNG.
2. **After** — `styles.css` with the fix: capture PNG.
3. Repeat both under `data-theme="light"` and under the compact density class.
4. **Open every PNG with the `Read` tool.** Measuring `getBoundingClientRect()`
   is a measurement, not a visual review; a layout can measure right and still
   look wrong (clipped glyph, wrong baseline, invisible contrast, colliding
   neighbour).
5. **Describe in `proof.md` what the images actually show**, before and after, in
   words that could only come from having looked at them. If the description
   could have been written from the numbers, this step did not happen.

**B. The numbers (the regression guard, kept as well).**
In the same run assert, for each of the four `.check` sites:
- checkbox `getBoundingClientRect().width` ≤ ~20px (866px / 94px today);
- the label's computed `display === "flex"`;
- the checkbox's vertical centre within a few px of the label text's;
- the label box is a single line (height ≈ 19px, not 37-38px);
- clicking the **label text** still flips `input.checked` — the `<label>` wrapper
  survives, which is the ticket's second verification line;
- `.check-row` (`TicketCreate.tsx:192`) is unchanged before vs. after — the
  reference implementation must not move.

**C. The committed test.** `npm test` green, including the new rule-presence test.

**D. The honest limit, stated plainly in `proof.md`:** this proves Chromium
layout produced from `styles.css`. It does **not** prove the packaged Electron
app at the user's DPI/zoom, nor behaviour under OS-level accessibility scaling.

**E. Corrected acceptance list** (replaces the ticket body's, per Q6 — corrected
here in the plan, not by editing the ticket):
- [ ] Checkbox sits immediately left of its label text, vertically centred, in
      Appearance (notifications), Appearance (confirm-on-delete), Git (automatic
      sync), **and the Backlog actions row** — *not* "the filter bar", which has
      had no checkbox since the initial commit and is unsatisfiable as written.
- [ ] Clicking the label text still toggles the box.
- [ ] Both themes, both card densities.

## Risks / open questions

- **Risk: a new global class.** `styles.css` has no CSS modules, so a bare
  `.check` is a new global selector. *Mitigation:* `className="check"` appears at
  exactly four sites repo-wide (research F3), all of them intended to be checkbox
  rows; the rule is purely additive layout with no colour or type changes.
- **Risk: over-reach into typography.** Copying `.check-row` verbatim would apply
  `font-size:12px` to the Settings rows. *Mitigation:* the deviation above —
  layout declarations only, stated explicitly so review reads it as a decision,
  not an omission.
- **Risk: the committed test looks stronger than it is.** *Mitigation:* it is
  named and documented as a rule-presence assertion in its `describe` block, its
  filename, and this plan. Do not let that label slip.
- **Risk: `.filterbar .check` deletion.** *Mitigation:* grep `FilterBar.tsx`
  before deleting and record the result; the bare `.check` would cover it anyway
  if a filter-bar checkbox ever returns.
- **Risk: lane collisions in HZN-003.** *Mitigation:* CSS-only. GUI-074/GUI-080
  own `Settings.tsx`; GUI-070 may delete `BacklogTable.tsx`. This ticket touches
  neither, plus one new test file nobody else owns.
- **Out of scope, and stays out:** narrowing the global `input` rule; unifying
  `.check-row`; the stylesheet-wide mis-scoped/dead-selector audit (worth its own
  ticket, per Q7); CSS modules migration; a visual-regression baseline.

**No open questions remain.** O1 and O2 were answered by the operator; Q3–Q7 stand
at their researcher defaults, re-affirmed.
