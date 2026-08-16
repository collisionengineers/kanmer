# Open questions — GUI-072

Each question below carries a **researcher's default** so the plan never
silently assumes an answer. Defaults were chosen from evidence in `research`;
the operator can override any of them before implementation.

## ⚠️ Operator-facing — read these two first

These are the only calls that are not purely technical. Both are answered with a
default that keeps the ticket closable autonomously, so the run is **not
blocked** — but they are the ones an operator may want to reverse.

- [x] **O1 — Does `proof:visual` for this ticket require a human looking at the
  running Electron app, or is an agent-produced headless-Chromium render
  acceptable?**
  **Default: agent-produced is acceptable, and this ticket can close without a
  human.** Evidence: the renderer *is* Chromium and the stylesheet is a plain
  file, so every line of the ticket's verification list is measurable
  headlessly — checkbox geometry (866px today vs ~13px fixed), label-click
  toggling, and both themes/densities via attribute toggles. A probe run during
  research already reproduced the defect and produced a PNG. proof.md must
  still state the limit plainly: this proves Chromium layout from `styles.css`,
  not the packaged app at the user's DPI or with OS accessibility scaling.
  *Override this if the board's `proof:visual` convention means "a human saw
  it" — in that case GUI-072 stops at Verifying like GUI-068 did, and that is a
  policy decision, not a technical one.*

- [x] **O2 — May a new test dependency be added to `apps/gui` for a permanent
  regression test?**
  **Default: no new dependency.** `apps/gui` has never had jsdom, testing-library
  or playwright; its vitest runs in the `node` environment over pure logic. The
  playwright that made the research measurement possible lives in `.ds-sync/`,
  which is gitignored and machine-local — usable for one-off proof, not
  committable as a test. Default plan: a zero-dependency vitest test that reads
  `styles.css` and asserts a bare `.check` rule with `display:flex` and a
  `.check input { width:auto }` companion, **labelled honestly as a
  rule-presence assertion rather than a layout assertion**. *Override to add
  `playwright` (real geometry, plus a browser download in CI) or `jsdom`
  (cascaded values only — jsdom performs no layout and would silently drop the
  `color-mix()` declarations elsewhere in this stylesheet).*

## Technical — resolved with defaults

- [x] **Q3 — Class-level fix or root-cause fix?** (`research` F6)
  **Default: class-level.** Add the bare `.check` rule only; leave
  `input, select, textarea { … width: 100% }` at styles.css:82 alone. It is the
  ticket's stated approach, it is CSS-only (so it collides with neither GUI-074
  on `Settings.tsx` nor GUI-070 on `BacklogTable.tsx`), and narrowing the global
  rule re-cascades every text input in the app for a benefit no current screen
  needs. If the plan wants belt-and-braces, an additive
  `input[type="checkbox"], input[type="radio"] { width: auto }` reset is the
  lower-risk half of the root-cause option.

- [x] **Q4 — Delete `.filterbar .check`, or leave it?** (`research` F4)
  **Default: delete both `.filterbar .check` rules.** `FilterBar.tsx` has had no
  checkbox since the initial commit; the rules match nothing. Leaving them is
  what made the class look styled and caused this bug in the first place.
  Deleting them is provably zero-risk once the bare `.check` exists — grep is
  the proof.

- [x] **Q5 — Unify `.check-row` into `.check`?** (`research` F5)
  **Default: no, not in this ticket.** Give `.check` the same declarations, but
  leave `TicketCreate.tsx:192` and the `.check-row` rule untouched. It is the
  only checkbox row that renders correctly today; touching it converts the
  reference implementation into a regression risk for no user-visible gain. The
  duplicate-idiom cleanup is a separate, safe follow-up.

- [x] **Q6 — The ticket's verification list is wrong in one place and short in
  another.** (`research` F3, F4)
  **Default: correct it in the plan's checklist rather than editing the ticket
  body.** Replace *"and the filter bar"* (no such checkbox exists) with *"and
  the Backlog actions row"* (`BacklogTable.tsx:147` — a fourth broken site the
  ticket does not mention, measured broken at 94px). Keep the label-click and
  themes/densities lines as written.

- [x] **Q7 — Does the wider "component-scoped rule used by an unrelated
  component" audit belong here?** (ticket's third Approach bullet)
  **Default: no — out of scope, and worth its own ticket.** The survey for this
  ticket covered every `className="check"` in the repo (four sites, all
  accounted for) and the checkbox-row idiom generally. A stylesheet-wide sweep
  for dead or mis-scoped selectors across 1,884 lines is real work with its own
  risk profile and should not ride along on a one-rule fix. Recommend filing it
  rather than silently dropping it.

## Parked (explicitly deferred)

- Migrating `styles.css` away from a single global stylesheet (CSS modules, or a
  real component layer in `@kanmer/ui`). This bug is an argument for it; this
  ticket is not the place to make it.
- Introducing a screenshot/visual-regression baseline for the GUI. The
  design-sync capture pipeline already renders every component in headless
  Chromium and could become one, but it is gitignored, machine-local tooling
  today.
