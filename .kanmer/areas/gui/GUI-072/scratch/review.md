## Review — GUI-072 · PR #39 · 2026-08-16

**I am both author and reviewer of this change. This is a self-review and should
not be read as an independent one.** What that costs is stated in the verdict.

### Changes (reviewer's reading of the diff, not the author's summary)

Two files, +74 / −11.

1. `apps/gui/src/renderer/src/styles.css`
   - **+16 at `:99`** — a bare `.check { display:flex; align-items:center;
     gap:8px; cursor:pointer }` and `.check input { width:auto }`, preceded by a
     seven-line comment that names the rule it counteracts. Sits immediately
     after the `input:focus` block, i.e. inside the base form-styling run, before
     the first component section (`/* Welcome */`).
   - **−11 at `:602`** — `.filterbar .check` and `.filterbar .check input`
     removed outright. Nothing replaces them.
   - Specificity check: `.check input` is (0,2,0) against the global
     `input, select, textarea` at (0,0,1), so `width:auto` wins regardless of
     source order. The rule would work even if it had been appended at the end
     of the file; placing it early is a readability choice, not a cascade one.
2. `apps/gui/src/renderer/src/lib/stylesCheckRule.test.ts` — new, 58 lines, four
   assertions, no new dependency. Reads the stylesheet via
   `new URL("../styles.css", import.meta.url)` and regex-extracts rule bodies.

No `.tsx` touched. No markup, no component, no behaviour.

### Comments

1. **[non-blocking] `.check` omits `.check-row`'s `font-size` and `margin-top`,
   and this is the one place the change deviates from "copy the reference".**
   Checked it is deliberate rather than an oversight: it is argued in plan.md,
   in the commit message, in the report, and in the CSS comment itself. It is
   also the right call — the before/after renders confirm the Settings row text
   is the same size in both, so the diff repositions without restyling. Had the
   typography been copied, the reviewer's complaint would have been the opposite
   and louder. **Disposition: won't-do — correct as shipped.**

2. **[non-blocking] Deleting `.filterbar .check` is a deletion of code no test
   covered.** Verified independently rather than trusting the report: `grep -i
   check` over `FilterBar.tsx` returns nothing, and the only `filterbar` string
   in any `.tsx` is `className="filterbar"` at `FilterBar.tsx:49`. The rules
   could not have been matching. Additionally, the new bare `.check` would now
   cover a filter-bar checkbox if one ever returns — the deletion removes dead
   weight without removing capability. **Disposition: fixed-in-PR (the deletion
   itself); no follow-up needed.**

3. **[non-blocking] The committed test claims less than a reader might assume
   from a file in a `.test.ts` next to logic tests.** This is the failure mode
   the operator explicitly warned about. Checked the label holds in all four
   places it could slip: filename comment ("deliberately NOT a layout test"),
   `describe` string ("presence only — not a layout assertion"), report, and PR
   body. It also carries the honest sentence "It catches someone deleting or
   renaming the `.check` rule. It does not catch a layout regression arriving by
   some other route." **Disposition: won't-do — the labelling is the mitigation,
   and it is applied consistently.**

4. **[non-blocking] Is the test vacuous?** Checked by stashing the stylesheet
   change and re-running: 3 of 4 assertions fail pre-fix with useful messages.
   The 4th (`.check-row` unchanged) passes in both states by design — it is a
   don't-regress-the-reference guard, not a fix assertion. **Disposition:
   verified, no action.**

5. **[non-blocking] `ruleBody()` uses `[^}]*` to capture a rule body**, so it
   would misbehave on a nested block. No nesting exists in this stylesheet today
   and the selectors it targets are top-level. Worth knowing if someone later
   moves these rules into an `@media`. **Disposition: won't-do — noted here
   rather than over-engineered.**

6. **[non-blocking] `.check` is now a new global class in a stylesheet with no
   CSS modules.** Bounded: `className="check"` appears at exactly four sites
   repo-wide, all of them checkbox rows, all four verified fixed. The general
   fragility is real but is the pre-existing architecture, parked explicitly in
   `open-questions`. **Disposition: filed-as-nothing (already parked).**

7. **[non-blocking] The ticket body's verification list is still wrong** — it
   asks for the filter bar, which has had no checkbox since the initial commit.
   Per Q6 the correction lives in plan.md's acceptance list (Backlog actions row
   substituted), not in the ticket body. The plan does carry it. **Disposition:
   as-decided.**

8. **[non-blocking] Scope discipline.** No unplanned extras rode along: the
   global `input` rule at `:82` is untouched, `.check-row` is untouched,
   `TicketCreate.tsx` is untouched, and the stylesheet-wide mis-scoped-selector
   audit (Q7) was not smuggled in. The report names it as an unfiled follow-up
   rather than pretending it is done — **that follow-up is still unfiled**, and
   is the one loose thread this review leaves behind.

### Checks performed

- **Report against diff.** The report's Changes table lists both files with
  accurate line counts and honest rationale; the diff does exactly what it says
  and nothing more. The "deliberate omission" and "what the test does not claim"
  paragraphs are not padding — both describe real decisions a reviewer would
  otherwise have to reconstruct.
- **Governing docs.** `refs` = `FRD-019-gui-shell.md`. R5 enumerates the
  Appearance controls; the diff changes no control's existence, wiring or
  semantics — it is a stylesheet layout correction, and the label-click test
  confirms the `<label>` wrapper still toggles, so R1–R5's "shipped behaviours
  hold" acceptance is untouched. The plan's Governing-docs section claims
  "meets, no amendment" and that claim holds against the diff. No ADR claimed,
  none needed.
- **`files` ripple list followed up.** `packages/ui` needed no source change (it
  is a barrel) and `npm run build:ui` was run — `dist/index.css` carries
  `.check{display:flex…}` at line 99 and no `.filterbar .check`; `dist/` is
  gitignored so nothing is committed, and `git status` confirms only the two
  intended files.
- **Rail.** `npm test` 205 passed / 22 files; `npm run typecheck` clean across
  all four workspaces; `npm run build:ui` clean.
- **Evidence quality.** Before/after renders exist for all four call sites plus
  the control, in dark, light and compact, and the images were opened and looked
  at — not merely measured. Two probe-scaffolding artefacts (a mis-aimed
  label-click and a `.board` grid wrapper that collapsed the modal) were caught
  and corrected before they could become false findings, and both are recorded
  in the checklist notes. That self-correction is the strongest signal in the
  evidence set.
- **PR mergeability.** `MERGEABLE` / `CLEAN`, two files, no conflicts with the
  lane (GUI-074 already merged to main and touches only `Settings.tsx`).

### Verdict

**Pass.** Merging under the standing delegation, then `move_item verifying`.

The honest caveat: a self-review cannot supply the independence that catches an
author's blind spot, and the most likely undetected defect here is a taste
judgement I already agree with — the 8px gap, the omitted typography, the rule's
placement. What a second reader would add is aesthetic dissent, not a
correctness catch; the correctness claims are all independently re-checked above
against the diff and the repo rather than against the author's word.
