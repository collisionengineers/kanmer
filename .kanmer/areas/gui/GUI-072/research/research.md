# Research — GUI-072: checkbox rows float away from their labels in Settings

## The question

Why do the Settings checkboxes render detached from their label text, what is
the actual CSS mechanism, and how far does the fix reach — GUI only, or into
`packages/ui` (`@kanmer/ui`) as well?

## Findings

### F1 — The cause is a global `input` rule, not a missing `.check` rule alone

`apps/gui/src/renderer/src/styles.css:82-92`:

```css
input,
select,
textarea {
  font: inherit; color: var(--text); background: var(--bg);
  border: 1px solid var(--line-2); border-radius: 6px;
  padding: 7px 9px;
  width: 100%;
}
```

There is no type exclusion, so `input[type="checkbox"]` gets `width: 100%`,
7/9px padding, a border, a radius and the app background — it stops being a
checkbox and becomes a full-width bar.

The ticket is right that a bare `.check` rule does not exist (only
`.filterbar .check`, styles.css:602-612), but that is the *second* half. The
class provides no `display:flex` / `align-items:center` to contain the input,
so the label stays `display:inline` and the stretched control pushes the text
onto the next line. **Two conditions, both required**: a global rule that
stretches the checkbox, and a class that never counteracts it outside the
filter bar. `.filterbar .check input { width: auto }` is the only antidote in
the stylesheet.

### F2 — Measured in a real browser, not inferred

Rendered the real `styles.css` over the real markup shapes in headless Chromium
(the playwright already present in `.ds-sync/node_modules` — machine-local,
gitignored). Computed values:

| call site | label `display` | checkbox computed width | label box height |
|---|---|---|---|
| Settings `.check` inside `.modal.settings .settings-pane` | `inline` | **866px** | 37px (wraps to 2 lines) |
| BacklogTable `.check` inside `.backlog-actions` | `block` (blockified flex item) | **94px** | 38px (2 lines) |
| TicketCreate `.check-row` | `flex`, `align-items:center` | **13px** | 19px (1 line) |

The screenshot reproduces the reported appearance precisely: Chromium paints the
checkbox glyph centred inside the stretched control, so it reads as "pushed to
the far right and onto the line above the text". Correct rendering (`.check-row`)
is checkbox-then-text on one line, vertically centred.

### F3 — There are four broken sites, not three; the ticket misses one

Repo-wide, `className="check"` appears at exactly four places:

- `components/Settings.tsx:282` — Appearance › Notifications
- `components/Settings.tsx:309` — Appearance › Behaviour (confirm-on-delete)
- `components/Settings.tsx:513` — Git › "Automatic sync"
- `components/BacklogTable.tsx:147` — the Backlog "select all / N in Backlog" row

BacklogTable's is inside `.backlog-actions` (a flex row), **not** `.filterbar`,
so it is broken the same way — confirmed at 94px in F2. The ticket does not
mention it.

### F4 — `.filterbar .check` is dead CSS; the ticket's filter-bar check cannot be performed

`git show fed2a9f:.../FilterBar.tsx` has `<label className="check">` around an
"Archived" checkbox. The current `FilterBar.tsx` has no checkbox at all — the
archived list became its own view. The `.filterbar .check` and
`.filterbar .check input` rules (styles.css:602-612) were written in the
initial commit and have matched nothing since.

Consequence: the ticket's verification line *"…in Appearance, Git, **and the
filter bar**"* is unsatisfiable as written. Substitute the Backlog actions row
(F3) for the filter bar.

### F5 — The correct idiom already exists under a different name

`.check-row` (styles.css:1322-1332) is exactly the rule `.check` should have
been:

```css
.check-row { display: flex; align-items: center; gap: 8px; margin-top: 6px;
             font-size: 12px; cursor: pointer; }
.check-row input { width: auto; }
```

Used once, at `components/TicketCreate.tsx:192`, and it renders correctly (F2).
So the codebase has two class names for one idiom, one of which works. The
fix has a reference implementation to copy verbatim.

### F6 — Two candidate fixes, with very different blast radii

1. **Class-level** (the ticket's approach): add a bare `.check` rule mirroring
   `.check-row`. Touches only `.check` sites; nothing else in the app can
   change. Leaves the global `input` rule still stretching any future
   checkbox/radio that is not wrapped in `.check`.
2. **Root-cause-level**: narrow styles.css:82 to
   `input:not([type="checkbox"]):not([type="radio"])` (or add an explicit
   `input[type="checkbox"] { width: auto; ... }` reset). Fixes every present and
   future checkbox, but re-cascades a rule that every text/number/search input
   in the app depends on.

These are not exclusive — (1) + a narrow checkbox reset is defensible. The plan
must choose deliberately; this document does not.

### F7 — `packages/ui` is a barrel, so the ripple is a rebuild, not a code change

`packages/ui/src/index.ts` re-exports the GUI's real components by relative
path and does `import "../../../apps/gui/src/renderer/src/styles.css"`. There is
no shared Checkbox component and no second stylesheet — `.design-sync/NOTES.md`
states it outright: *"Nothing is reimplemented — if a GUI component changes,
`npm run build:ui` picks it up."* `packages/ui/dist/index.css` is build output
and `dist/` is gitignored, so there is no committed artefact to update. The
design-system ripple is: run `npm run build:ui`, and the DS preview cards
(`.design-sync/previews/Settings.tsx`, `TicketCreate.tsx`) render the fix.

### F8 — There is no component-rendering test capability in the repo today

`apps/gui` runs `vitest run` with no config file, so the environment is `node`;
every existing test under `renderer/src/lib/` is pure logic. No jsdom, no
testing-library, no playwright in any workspace's dependencies. The playwright
that made F2 possible lives in `.ds-sync/` — a gitignored, machine-local
toolchain belonging to the design-sync pipeline, not a repo test dependency.

## How this can be proven without a human at the keyboard

**It can.** Every line of the ticket's own verification list is reachable
headlessly, because the Electron renderer *is* Chromium and the stylesheet is a
plain file:

- **Geometry, not vibes.** Load `styles.css` + the component markup in headless
  Chromium and assert `getComputedStyle(input).width !== "100%"`, the label's
  `display === "flex"`, and — the assertion that actually encodes the bug —
  `input.getBoundingClientRect()` is ≤ ~20px wide and its vertical centre is
  within a few px of the label text's. That single measurement fails today
  (866px) and passes after the fix (13px).
- **Clicking the label still toggles.** `page.click` on the label text, then
  assert `input.checked` flipped — covers the "the `<label>` wrapper must
  survive" requirement.
- **Both themes, both densities.** Set `data-theme="light"` and the density
  class on the root and repeat the measurement; both are attribute toggles, no
  human needed.
- **A screenshot for `proof:visual`.** The same run writes a PNG, which the
  verifying agent reads directly. F2's probe already produced one.

Honest limits, to be stated in proof.md rather than glossed: this proves the
stylesheet's geometry in Chromium, not the packaged Electron app at the user's
DPI/zoom, and a screenshot at default scaling does not exercise OS-level
accessibility scaling.

The durable-regression-test question is separate from the proof question, and
cheaper than it looks. Three options, in ascending cost:

- **Zero new dependencies**: a vitest test that reads `styles.css` and asserts a
  bare `.check` rule exists with `display:flex` and a `.check input{width:auto}`
  companion. Honest about what it is — a rule-presence assertion, not a layout
  assertion — and it would have caught this bug's regression.
- **jsdom** (one devDep): assert the *cascaded* values via
  `getComputedStyle`. Note jsdom performs no layout, so it can assert
  `width: "auto"` as a declaration but can never produce the 866px number; and
  jsdom's CSS parser may silently drop the `color-mix()` declarations elsewhere
  in this stylesheet.
- **playwright** (one devDep + a browser download in CI): the real measurement
  from F2, committed.

## What this implies for the ticket

- The fix is CSS-only if approach (1) is taken — no `.tsx` file needs to change,
  which is worth protecting because GUI-074 also edits `Settings.tsx` and
  GUI-070 may delete `BacklogTable.tsx` outright (same lane C).
- `.check-row` should be treated as the specification for the new `.check` rule.
- Whatever `.filterbar .check` keeps, it must not keep `width: auto` on the
  input as its only home — that has to move to the bare rule.
- The ticket's verification checklist needs one correction (F4) and one addition
  (F3) before it is used as an acceptance list.
