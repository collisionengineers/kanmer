# Open questions — GUI-069

All questions are answered. Q1 and Q2 were answered by the HZN-003 scheduler on
2026-08-16 — the reasoning is in `scratch/scheduling.md` and is settled; do not
re-open either.

## Answered

- [x] **Q1. Should board column headers render the stage colour, or is "styled
      like every other stage" satisfied by the existing treatment?**
      **ANSWERED: (a) — the existing treatment satisfies it. No CSS change.**
      Criterion 1 means "Backlog is a real column from `STAGES`, given the same
      `.col-head` treatment as every other column". Research finding F3: **no**
      column renders a stage colour today — `Board.tsx:119` carries
      `color: s.color` into the column objects and nothing reads it, the board's
      only `columnColor` call (`Board.tsx:190`) resolves against `board.areas`,
      and `.col-head` (`styles.css:237-251`) sets only `color: var(--muted)`.
      `color: s.color` stays dead data. Adding stage colour would be a design
      change to all six headers, not a fix to one — scope drift inside a `fix`
      ticket, which review would rightly push back on. The only *visible* defect
      is the position; that is what gets fixed. If stage-coloured headers are
      wanted they are their own ticket — not filed speculatively, because nobody
      has asked for it.

- [x] **Q2. Is GUI-069 authorized to amend FRD-007 B4, and does it leave FRD-011
      entirely to GUI-070?**
      **ANSWERED: GUI-069 amends NO FRD. GUI-070 is single owner of both
      FRD-007 B4 and every FRD-011 edit.**
      Research proposed splitting B4 between the tickets; single owner wins, for
      a mechanical reason: **B4 is one sentence** — "The kanban renders
      Preparing → Done; Backlog renders as the dedicated list view (FRD-011)" —
      and **both halves reverse**, GUI-069 falsifying the first and GUI-070 the
      second. Splitting it means two branches editing the same line: a
      guaranteed conflict. GUI-070 lands second (GUI-069 blocks it), so it is
      the only ticket that can state the finished position in one edit. FRD-011
      follows the same owner, reinforced by the manual: its Overview is *lead
      prose*, compiled by `scripts/build-manual.mjs` into the committed
      `chapters.generated.ts` and guarded by `npm run check:manual`, so two
      editors means two regenerations of one machine-written file.
      **The cost, stated plainly:** between GUI-069 merging and GUI-070 merging,
      FRD-007 B4 and FRD-011 R5 are false. The window is bounded — GUI-069
      blocks GUI-070, same lane, same release — and GUI-069's plan's
      Governing-docs section names GUI-070 as the ticket that corrects them.
      **Bonus consequence:** GUI-069 needs no manual rebuild, since it changes no
      curated FRD lead prose. Confirmed by running `npm run check:manual`, not
      assumed.

## Resolved during research

- [x] **Q3. With zero backlog tickets, should the Backlog column still render?**
      **Yes — always render all six.** Verification criterion 2 asks that the
      board not gain and lose a column as the backlog count crosses zero, and
      rendering the full `UI_STAGES` list is exactly what delivers that: the
      column list stops depending on which statuses happen to be present. The
      appearing/disappearing behaviour is a *symptom* of the current
      fallback-driven column, not a property to preserve.

- [x] **Q4. Should `mergeColumns` move out of `Board.tsx` into `lib/board.ts`?**
      **Yes.** There is no jsdom / React-testing-library harness anywhere in
      `apps/gui` — every test is a pure-function vitest suite — so a
      module-private helper inside `Board.tsx` cannot be asserted at all, and
      all three verification criteria are statements about `mergeColumns`'
      behaviour. `lib/board.ts` already owns this exact class of pure board
      helper (`columnCards`, `positionForDrop`, `optimisticOrder`) and has
      `lib/board.test.ts` beside it. It is exported from the `@kanmer/ui` barrel
      per the standing obligation recorded in commit `841c5bc`.
      *Correction to the research note:* `packages/ui/` is **tracked** in git as
      of `origin/main@5d0e0d7` (`git ls-files packages/ui` → 21 files). The
      "untracked" observation was true when research was written and is now
      stale; the barrel edit is committable.

- [x] **Q5. Does making Backlog a drop target introduce new gate or IPC work?**
      **No.** Backward moves cross no boundary
      (`packages/core/src/stages.ts:133-137`: a gate fires only when
      `to >= threshold > from`), and `getGateStatus` already returns a map over
      every board stage (`apps/gui/src/shared/ipc.ts:463-467`), so the drag
      lock-tint has Backlog data already. No main-process or preload change.
