## OPERATOR ANSWER — 2026-08-16 — proof:visual policy (board-wide)

**Q O1 answered: agent-produced headless-Chromium evidence DOES count as
`proof:visual` on this board — with one binding condition, in the operator's own
words:**

> "Agent rendered evidence counts, as long as the image is actually reviewed
> using vision."

**Read that condition literally. It is not satisfied by measuring geometry.**
Numbers from `getBoundingClientRect()` are a *measurement*, not a visual review —
a layout can measure correctly and still look wrong (clipped glyph, wrong
baseline, invisible contrast, overlapping neighbour). The operator is requiring
that someone actually LOOK.

Concretely, before writing `proof`:

1. Render and save the PNG.
2. **Open the PNG with the `Read` tool** so the image is genuinely in context and
   seen. Do not skip this because the assertions passed.
3. **Describe in `proof.md` what the image shows** — the before and the after —
   in words that could only be written by something that looked at it. If the
   description could have been written from the numbers alone, the review did not
   happen.
4. Keep the numeric assertions as well. They are the regression guard; the
   viewing is the proof.

Both states must be captured: **before** (the bug reproduced — research measured
the Settings checkbox at 866px wide) and **after** (the fix, ~13px and vertically
centred on the label). Repeat under `data-theme="light"` and the compact density
class, as research proposed.

**State the honest limit in `proof.md`**, as research already worded it: this
proves Chromium layout from `styles.css`; it does not prove the packaged app at
the user's DPI or under OS accessibility scaling.

**Q O2 stands at its default: NO new test dependency in `apps/gui`.** The
playwright that makes the render possible lives in the gitignored, machine-local
`.ds-sync/` — fine for producing one-off proof, not committable as a test. Ship
the zero-dep vitest test that parses `styles.css` and asserts the bare `.check`
rule exists, and **label it honestly as a rule-presence assertion, not a layout
assertion**. Do not let that label slip — a test named as if it checked layout,
which only checks a selector exists, is the same false-safety-net problem
GUI-074 is deleting a test over.

Technical defaults from research stand and are not re-opened: class-level fix
rather than narrowing the global `input` rule; delete the dead `.filterbar .check`;
do NOT unify `.check-row` into `.check` here (it is the only working row — do not
turn the reference implementation into a regression risk); correct the ticket's
unsatisfiable "and the filter bar" verification line in the plan's checklist, not
the ticket body, substituting the Backlog actions row; the wider mis-scoped
selector audit is out of scope.

**Take the CSS-only route.** It is what keeps this ticket file-disjoint from
GUI-074 and GUI-080 (both edit `Settings.tsx`) and from GUI-070 (which may delete
`BacklogTable.tsx` outright). A markup-touching fix would collide with all three.
