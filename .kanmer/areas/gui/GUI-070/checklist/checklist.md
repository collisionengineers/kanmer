# Checklist — GUI-070

*Derived from plan.md, one box per step. The reasoning is in the plan.*

- [ ] Pre-flight: `Board.tsx` no longer filters out `backlog` (GUI-069 landed) — verified at `488797d`
- [ ] Worktree `.worktrees/gui-070` on `gui-070-remove-backlog-view` off `origin/main`; ticket taken
- [ ] `App.tsx`: drop the `BacklogTable` import, `"backlog"` from `type View` and `VIEW_LABELS`, and the whole `view === "backlog"` render arm with its four inline handlers
- [ ] Delete `components/BacklogTable.tsx`, `lib/windowedRows.ts`, `lib/windowedRows.test.ts` (re-grep `windowedRows` for consumers first)
- [ ] `packages/ui/src/index.ts`: delete the `BacklogTable` / `BacklogTableProps` re-exports
- [ ] `styles.css`: delete the `/* Backlog list view (GUI-015) */` block only — leave `.check`, `.hint`, `.banner.warn`, `.spacer` alone
- [ ] `shared/shortcuts.ts`: `Ctrl+1…4` → `Ctrl+1…3` with the new label, delete the three `context: "Backlog"` rows, refresh the header comment
- [ ] `manual/manual.test.ts:60`: drop `"Backlog"` from the view list without weakening the assertion
- [ ] `scripts/build-manual.mjs`: remove the `["backlog", …]` `FROM_FRD` entry
- [ ] `docs/manual/getting-started.md`: rewrite the "Backlog is a list rather than a column" sentence (chapter body must stay > 80 chars)
- [ ] FRD-011 → `status: withdrawn` + `## Amendment (GUI-070)` reversing R5, withdrawing R1/R3/R4/R6, recording bulk triage as **weighed and dropped, not relocated**
- [ ] FRD-007 B4 rewritten — both halves — plus the `Related:` pointer annotated
- [ ] PRD-001: dated note under problem 6, and pointers to it from `:25` and `:30`
- [ ] FRD-019 R5: drop `Backlog (FRD-011)`, Board renders Backlog → Done (Phase 0.2 audit snapshot left untouched)
- [ ] FRD-001: G8 citation repointed to FRD-019; `:34` acceptance criterion loses its `+ backlog` half
- [ ] Source comment citations: `FilterBar.tsx:5` and `App.tsx:1722` keep FRD-001 G8, drop FRD-011 R4
- [ ] `npm run build:manual` run **after** the doc edits; `chapters.generated.ts` committed
- [ ] Rail green: `npm test`, `npm run typecheck`, `npm run build:ui`, `npm run check:manual`
- [ ] `KANMER_SMOKE=1` boot: no Backlog tab; Ctrl+1/2/3 → Board/Standup/Archived with no gap; Backlog column reachable and workable on the board
- [ ] `git fetch origin && git rebase origin/main` (GUI-072 in flight in `styles.css`), rail re-run, PR opened
- [ ] GUI-071's first verification criterion struck via `update_item`
- [ ] Verification run on merged main (this box produces proof.md)

## Progress notes
