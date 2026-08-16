# Visual proof — GUI-072

Gathered on merged `main` at **ed52e39** ("fix(gui): give checkbox rows a bare
`.check` rule so they stop floating (#39)"), not on the feature branch.

The board's `proof:visual` policy for this ticket is the operator's, verbatim:
*"Agent rendered evidence counts, as long as the image is actually reviewed
using vision."* Every image below was opened with the `Read` tool and looked at.
The numbers in the Evidence section are the regression guard; the looking is the
proof, and the "What the images show" section is written from having looked.

## Screenshots

| What it shows | File |
|---|---|
| The bug, dark theme — all four `.check` sites broken, `.check-row` control correct | `proof/before-dark.png` |
| The fix, dark theme — same five rows | `proof/after-dark.png` |
| The bug, light theme | `proof/before-light.png` |
| The fix, light theme | `proof/after-light.png` |
| The bug, compact card density | `proof/before-compact.png` |
| The fix, compact card density | `proof/after-compact.png` |

## Where it was taken

Headless Chromium (the same engine the Electron renderer runs), 760px viewport
at `deviceScaleFactor: 2`, driven by the playwright cached in the **gitignored,
machine-local `.ds-sync/`** — deliberately not a repo dependency (`open-questions`
O2). Each page loads the shipped `apps/gui/src/renderer/src/styles.css` verbatim
and reproduces the real ancestor chain of every `.check` call site on main:

- `Settings.tsx:257`, `:284` → `.modal.settings > .settings-pane > .settings-section > label.check`
- `Settings.tsx:488` (GitTab, which returns `<div className="settings-section">`) → same chain
- `BacklogTable.tsx:147` → `.backlog > .backlog-actions > label.check`
- `TicketCreate.tsx:192` → `label.check-row` — **the control**, the one row that
  already rendered correctly and must not move

The "before" images render `styles.css` from **43dcedb**, main's state
immediately before this merge. The only variable between the two columns is the
stylesheet. Reproduce with the probe kept at
`%TEMP%/claude/…/scratchpad/gui072/{probe.mjs,proofshot.mjs}` (machine-local,
uncommitted):
`node proofshot.mjs <path-to-styles.css> <before|after> <outdir>`.

## What to look at — what the images actually show

**Before (`before-dark.png`).** Every one of the three Settings rows is two
lines tall, and the reason is immediately obvious once you see it: the checkbox
glyph is stranded *alone on its own line*, floating near the horizontal middle
of the pane — around x≈750 of a 1440-wide panel — with nothing beside it. The
label text ("Toast when an agent changes the board while the window is
unfocused") begins on the line *below*, back at the left margin, so the eye has
to travel down-and-left to connect a control to the words it governs. Nothing
visually ties them together; the three orphaned glyphs line up in a column of
their own, which reads like a stray third column of the layout rather than part
of the rows. The glyph is centred there because the control it belongs to is
actually a 786px-wide invisible bar (the border and background inherited from
the global `input` rule are indistinguishable from the pane behind them, so all
you see is the tick mark at its centre) — the bar is what pushed the text down.
The section separator rules sit far below each row, leaving conspicuous dead
space. The Backlog row shows the milder version of the same thing: its glyph
floats about 100px right of the left edge, still on its own line above
"12 in Backlog". At the bottom, the `.check-row` control is the odd one out and
looks obviously right by comparison — box, small gap, text, all on one line.

**After (`after-dark.png`).** All five rows now look like the control did. Each
Settings row is a single line: the checkbox sits hard against the left margin,
flush with the left edge of its "NOTIFICATIONS" / "BEHAVIOUR" / "GIT" section
heading above it, then a small even gap, then the text — and the box's midline
lands on the text's midline, so the pair reads as one object. Because each row
collapsed from two lines to one, the sections visibly tighten and the separator
rules pull up; the pane no longer has the ragged vertical gaps it did. The
Backlog row matches. Crucially the **text is the same size and the same colour
as before** — put the two images side by side and the words are pixel-for-pixel
where they'd be, only the box has moved up and left. That is the deliberate
omission of `.check-row`'s `font-size: 12px` doing its job: the rows were
repositioned, not restyled. And the `.check-row` control at the bottom is
unchanged between the two images, which is what confirms the fix did not reach
the reference implementation.

**Light theme (`before-light.png` / `after-light.png`).** Identical story. Worth
noting from the image specifically: in light theme the unchecked boxes render as
crisp white squares with a visible grey border, and the checked one as a solid
blue square with a white tick — so after the fix there is no contrast problem at
the new position, and no clipping of the box's border against the section's
left edge, which a purely numeric check would not have caught.

**Compact density (`before-compact.png` / `after-compact.png`).** These are
**byte-identical** to their dark-theme counterparts — same SHA-256
(`a4ddea1a…` before, `4b53dbd2…` after) — which is the cleanest possible
statement that compact density does not touch these rows. That is expected
rather than lucky: every `.board.compact` selector in the stylesheet targets
`.cell`, `.card`, `.card-title` or `.area-group`, the class lives on Board's own
div (`Board.tsx:141`), and no `.check` site is inside `.board` at all — Settings
and TicketCreate are modals, BacklogTable renders `.backlog`.

## Evidence

Geometry measured on merged main's stylesheet, all four fixed sites plus the
control, with the before column measured on 43dcedb:

```
== BEFORE (43dcedb) / dark ==
Settings › Notifications      label display=inline h=36.5px | checkbox 786x13px | Δcentre 20.5px | gap -790px
Settings › Behaviour          label display=inline h=36.5px | checkbox 786x13px | Δcentre 20.5px | gap -790px
Settings › Git                label display=inline h=36.5px | checkbox 786x13px | Δcentre 20.5px | gap -790px
Backlog actions (select-all)  label display=block  h=38px   | checkbox  94x13px | Δcentre 19.5px | gap  -98px
CONTROL .check-row            label display=flex   h=19px   | checkbox  13x13px | Δcentre 0      | gap   11px

== MERGED (ed52e39) / dark ==
Settings › Notifications      label display=flex h=19.5px | checkbox 13x13px | Δcentre 0.3px | gap 11px
Settings › Behaviour          label display=flex h=19.5px | checkbox 13x13px | Δcentre 0.3px | gap 11px
Settings › Git                label display=flex h=19.5px | checkbox 13x13px | Δcentre 0.3px | gap 11px
Backlog actions (select-all)  label display=flex h=19px   | checkbox 13x13px | Δcentre 0     | gap 11px
CONTROL .check-row            label display=flex h=19px   | checkbox 13x13px | Δcentre 0     | gap 11px

label-text click toggles `checked`: {s1:true, s2:true, s3:true, s4:true, ctl:true}
  — in BOTH states, at all five sites. The `<label>` wrapper survived the fix;
    it also means the bug never broke toggling, only layout.
Light and compact repeat the above exactly.
```

`Δcentre` is the distance between the checkbox's vertical centre and the label
text's. `gap` is the horizontal distance from the box's right edge to the text's
left edge — negative before the fix because the stretched control *overlapped
and passed* the text.

Rail on merged main:

```
$ npm test
 Test Files  22 passed (22)
      Tests  213 passed (213)          # includes the 4 new rule-presence assertions

$ npm run typecheck
@kanmer/core · @kanmer/mcp-server · @kanmer/ui · @kanmer/gui — all clean

$ npm run build:ui
ESM dist\index.css 30.17 KB · DTS build success
$ grep -A4 '^\.check {' packages/ui/dist/index.css
.check {  display: flex;  align-items: center;  gap: 8px;  cursor: pointer; }
$ grep -c 'filterbar .check' packages/ui/dist/index.css
0
```

Call-site survey re-run on merged main (GUI-069 and GUI-074 landed in between
and shifted the line numbers): `className="check"` still appears at exactly four
places — `Settings.tsx:257`, `:284`, `:488`, `BacklogTable.tsx:147` — and
`className="check-row"` at one, `TicketCreate.tsx:192`. All five are covered
above.

## Not covered — the honest limits

- **This proves Chromium layout produced from `styles.css`. It does not prove
  the packaged Electron app at the user's DPI or zoom level, nor behaviour under
  OS-level accessibility scaling.** The renderer is Chromium and the stylesheet
  is the same file, which is why this evidence is worth something; but nobody
  launched the built app, and a text-scaling setting could still interact with a
  fixed 8px gap in a way these renders would not show.
- **The committed test is a rule-presence assertion, not a layout assertion.**
  `stylesCheckRule.test.ts` reads `styles.css` as text and checks the selectors
  exist; it renders nothing and could never produce the 786px→13px number above.
  It is a guard against someone deleting or renaming `.check`, and is labelled
  as exactly that in its filename comment and `describe` string. It is not
  vacuous — 3 of its 4 assertions fail against the pre-fix stylesheet — but it
  is not what proves this ticket. These images are.
- **The probe reproduces the ancestor chains; it does not mount React.** State
  wiring (`onChange` handlers writing preferences) was not exercised. It is
  untouched by a CSS-only diff, and the label-click test does confirm the
  `<label>`→`<input>` relationship still works.
- **Only the four `.check` sites and the one `.check-row` were rendered.** The
  wider question — whether other classes in this 1,890-line stylesheet are dead
  or mis-scoped the same way — is deliberately out of scope and now filed as
  **GUI-082**.
- Two probe-scaffolding artefacts were caught and corrected during this work (a
  label-click aimed outside the text run; a `.board` grid wrapper that collapsed
  the modal being measured). Both would have produced false findings here; both
  are documented in `checklist` progress notes. Recorded because the corrections
  are part of why these numbers should be believed.
