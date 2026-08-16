# Research — GUI-069: Backlog must render as the first board column

## The question

Where does the renderer order board columns, and why does Backlog end up after
Done instead of before Preparing?

## Findings

### F1. There is exactly one place the board decides its columns

`apps/gui/src/renderer/src/components/Board.tsx:115-121`:

```ts
const statuses = mergeColumns(
  // Backlog is a list, not a column (FRD-011). ...
  STAGES.filter((s) => s.id !== "backlog").map((s) => ({ id: s.id, name: s.name, color: s.color })),
  items.map((i) => i.status),
);
```

`STAGES` is `UI_STAGES` from `apps/gui/src/shared/stages.ts`, which is the
renderer's mirror of core's `STAGES` (`packages/core/src/stages.ts:35-74`).
Both list `backlog` **first**; `apps/gui/src/shared/stages.test.ts` asserts the
two agree field-for-field, so the ordering source is not in doubt and is not
where the bug lives.

Nothing else in the renderer computes a column list. `GroupView.tsx:104`,
`Editor.tsx:224`, `App.tsx:781` (context menu "Move to") and `App.tsx:985`
(palette move verbs) all iterate the **full** six-stage `UI_STAGES` — so the
Backlog stage is already offered everywhere except the board itself.

### F2. The displacement is the unknown-status fallback, exactly as the ticket says

`mergeColumns` (`Board.tsx:29-34`) appends any status found on an item that has
no configured column, at the end. `backlog` was configured and then filtered
out, so from `mergeColumns`' point of view it is indistinguishable from a status
nobody ever declared. It comes back as `{ id: "backlog", name: "backlog" }` —
no `color`, name is the raw id — and it comes back **last**.

Confirmed against history: commit `841c5bc` ("feat(gui): the Backlog becomes a
list, and the board drops its column") changed **one line** in `Board.tsx`, the
`STAGES.filter(...)`. `mergeColumns` was not touched. The exclusion was
therefore defeated in the same commit that introduced it, on any board with a
backlogged ticket — i.e. every real board.

### F3. "Styled like every other stage" is mostly already true — but not for the reason expected

The ticket says the column "reads as a raw id rather than a styled stage". Two
corrections that matter for scoping:

- **Name:** the fallback column's name is the literal `"backlog"`, but
  `.col-head { text-transform: uppercase }` (`styles.css:237-251`) renders it as
  `BACKLOG` — visually identical to the `BACKLOG` a real column would show.
  So the name defect is real in the data but invisible on screen.
- **Colour:** `Board.tsx` never renders a stage colour at all. `color: s.color`
  at line 119 is dead data — the only `columnColor` call on the board
  (`Board.tsx:190`) resolves against `board.areas`, not stages. No column has a
  stage colour today, so the losing column is not being singled out.

The only *visible* defect is therefore the **position**. That is worth stating
plainly because verification criterion 1 ("styled like every other stage, with
its stage colour and name from `STAGES`") reads as if colour rendering exists
and Backlog is missing out on it. It does not exist. See open question Q1.

### F4. The fix must change `mergeColumns`, not just delete the filter

Deleting the `.filter(...)` alone would fix the symptom and leave the defect:
`mergeColumns` still cannot tell "unknown status" from "known status,
deliberately hidden", so the next stage anyone hides re-appears last in exactly
the same way. The ticket already names this as the actual defect. The shape
that fixes it is to pass `mergeColumns` the set of **known** stage ids
separately from the list of *rendered* columns, so a known-but-hidden status is
dropped rather than resurrected — and an unknown status still gets its trailing
fallback column (verification criterion 3).

### F5. There is no component-test harness in this GUI

Every test under `apps/gui/src` is a pure-function vitest suite
(`lib/board.test.ts`, `lib/windowedRows.test.ts`, `shared/stages.test.ts`, …).
There is no jsdom/React-testing-library setup, so `Board.tsx` itself is
untestable as it stands and `mergeColumns` is module-private. Moving
`mergeColumns` into `apps/gui/src/renderer/src/lib/board.ts` — which already
owns exactly this class of pure board helper and already has
`lib/board.test.ts` next to it — is what makes the three verification criteria
assertable rather than eyeballed. See Q4 (resolved).

### F6. Moving a card *into* Backlog already works and is ungated

Backward moves cross no boundary (`boundaryThreshold`, `stages.ts:133-137`, and
gates fire only when `to >= threshold > from`), so making Backlog a drop target
introduces no new gate path. `getGateStatus` is documented as "per board stage"
(`shared/ipc.ts:463-467`), so the drag lock-tint already has data for Backlog
and needs no change. `App.tsx:658-671` (`moveRelative`, Ctrl+←/→) already walks
the full six-id list, so Ctrl+← out of Preparing already sends a card to
Backlog — where today it vanishes off the left of the board and reappears at
the far right. The fix makes that keyboard path coherent for free.

### F7. Governing docs that will contradict the shipped behaviour

Two statements, in two files:

| Doc | Line | Text | Who should own the amendment |
|---|---|---|---|
| `docs/functional/frd/FRD-007-fixed-six-stage-board.md` | 28 (B4) | "The kanban renders Preparing → Done; Backlog renders as the dedicated list view (FRD-011)." | **GUI-069** — this ticket is what makes it false |
| `docs/functional/frd/FRD-011-backlog-list-view.md` | 10 (Overview) | "the kanban renders Preparing → Done" | **GUI-070** |
| `docs/functional/frd/FRD-011-backlog-list-view.md` | 18 (R5) | "the board's Backlog column disappears from the kanban" | **GUI-070** |

The recommendation is that **GUI-069 touches FRD-007 only** and GUI-070 owns
every FRD-011 edit, for a concrete mechanical reason: FRD-011's Overview is
**lead prose**, and `scripts/build-manual.mjs:41-47,62-72` compiles the lead
prose of nine curated FRDs into the committed artifact
`apps/gui/src/renderer/src/manual/chapters.generated.ts`, with
`npm run check:manual` failing when it is stale. Two tickets editing FRD-011's
Overview means two tickets regenerating the same generated file — a guaranteed
conflict on a machine-written artifact. FRD-007's B4 sits **below** the first
`## ` heading, so amending it does *not* touch the manual at all. See Q2.

The cost of that split is a short window in which FRD-011 R5 describes
behaviour that no longer exists. GUI-069 blocks GUI-070, so the window closes
by construction; the honest mitigation is one sentence in GUI-069's plan's
Governing-docs section naming GUI-070 as the follow-up.

`apps/gui/release-notes.md:153` also says "The board drops its Backlog column",
but that is a **shipped** release's notes — history, not a claim about current
behaviour. Do not rewrite it; add a new entry under the `0.3.3 (unreleased)`
section instead.

## What this implies for the ticket

1. The change is small and local: one component, one helper, one FRD line.
2. It must not be done as a one-line filter deletion — `mergeColumns` is the
   defect and leaving it ambiguous re-arms the bug.
3. It must not touch `App.tsx`. GUI-070 (view removal) and GUI-071 (tab counts)
   both edit `App.tsx`; keeping GUI-069 out of that file is what lets the three
   run as parallel lanes.
4. Two decisions are the operator's, not the implementer's: whether column
   headers should gain stage colour (they have none today), and whether GUI-069
   is authorized to amend FRD-007 B4.
