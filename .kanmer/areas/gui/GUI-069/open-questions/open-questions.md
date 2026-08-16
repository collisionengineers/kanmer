# Open questions — GUI-069

## OPERATOR ONLY — these two block the plan

- [ ] **Q1. Should board column headers render the stage colour, or is "styled
      like every other stage" satisfied by the existing treatment?**
      Verification criterion 1 asks for Backlog "styled like every other stage,
      with its stage colour and name from `STAGES`". Research finding F3: **no
      column has a stage colour today.** `Board.tsx:119` carries `color: s.color`
      into the column objects and nothing ever reads it — the board's only
      `columnColor` call (`Board.tsx:190`) resolves against `board.areas`, and
      `.col-head` (`styles.css:237-251`) sets only `color: var(--muted)`.
      Likewise the name: the fallback column's name is the raw `"backlog"`, but
      `text-transform: uppercase` renders it as `BACKLOG` — identical on screen
      to a real column. So the only *visible* defect is the position.
      **Recommendation: answer (a).** (a) Criterion 1 means "Backlog is a real
      column from `STAGES`, same `.col-head` treatment as the others" — no CSS
      change, colour stays dead data. (b) Add stage colour to all six headers —
      that is a design change to every column, not a fix to one, and belongs in
      its own ticket. Picking (b) inside a `fix` ticket is the kind of scope
      drift review will push back on.

- [ ] **Q2. Is GUI-069 authorized to amend FRD-007 B4, and does it leave FRD-011
      entirely to GUI-070?**
      `FRD-007-fixed-six-stage-board.md:28` (B4) says "The kanban renders
      Preparing → Done; Backlog renders as the dedicated list view (FRD-011)."
      This ticket makes that false, so it must be amended by *someone*.
      FRD-011 says the same thing twice (Overview line 10, R5 line 18) and
      GUI-070 already carries explicit user authorization to amend FRD-011.
      **Recommendation: yes to both — GUI-069 amends FRD-007 B4 only; GUI-070
      owns every FRD-011 edit.** The reason is mechanical, not taste:
      FRD-011's Overview is *lead prose*, which `scripts/build-manual.mjs`
      compiles into the committed artifact `chapters.generated.ts` (guarded by
      `npm run check:manual`). Two tickets editing that Overview means two
      tickets regenerating the same machine-written file — a guaranteed
      conflict. FRD-007's B4 is below the first `## `, so it is not lead prose
      and triggers no regeneration.
      **The cost, stated plainly:** between GUI-069 merging and GUI-070 merging,
      FRD-011 R5 describes a Backlog column that no longer disappears. GUI-069
      blocks GUI-070 so the window is bounded; the mitigation is one sentence in
      GUI-069's plan's Governing-docs section naming GUI-070 as the follow-up.
      If you would rather GUI-069 amend both FRDs and GUI-070 rewrite FRD-011
      wholesale afterwards, say so — it is defensible, it just costs a conflict
      on the generated manual.

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
      `lib/board.test.ts` beside it. If it moves, add it to the `@kanmer/ui`
      barrel's pure-helpers block per the standing obligation recorded in commit
      `841c5bc` — noting `packages/ui/` is currently untracked in git.

- [x] **Q5. Does making Backlog a drop target introduce new gate or IPC work?**
      **No.** Backward moves cross no boundary
      (`packages/core/src/stages.ts:133-137`: a gate fires only when
      `to >= threshold > from`), and `getGateStatus` already returns a map over
      every board stage (`apps/gui/src/shared/ipc.ts:463-467`), so the drag
      lock-tint has Backlog data already. No main-process or preload change.
