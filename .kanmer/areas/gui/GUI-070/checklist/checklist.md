# Checklist — GUI-070

*Derived from plan.md, one box per step. The reasoning is in the plan.*

- [x] Pre-flight: `Board.tsx` no longer filters out `backlog` (GUI-069 landed) — verified at `488797d`
- [x] Worktree `.worktrees/gui-070` on `gui-070-remove-backlog-view` off `origin/main`; ticket taken
- [x] `App.tsx`: drop the `BacklogTable` import, `"backlog"` from `type View` and `VIEW_LABELS`, and the whole `view === "backlog"` render arm with its four inline handlers
- [x] Delete `components/BacklogTable.tsx`, `lib/windowedRows.ts`, `lib/windowedRows.test.ts` (re-grep `windowedRows` for consumers first)
- [x] `packages/ui/src/index.ts`: delete the `BacklogTable` / `BacklogTableProps` re-exports
- [x] `styles.css`: delete the `/* Backlog list view (GUI-015) */` block only — leave `.check`, `.hint`, `.banner.warn`, `.spacer` alone
- [x] `shared/shortcuts.ts`: `Ctrl+1…4` → `Ctrl+1…3`, delete the three `context: "Backlog"` rows, refresh the header comment
- [x] `manual/manual.test.ts:60`: drop `"Backlog"` from the view list without weakening the assertion
- [x] `scripts/build-manual.mjs`: remove the `["backlog", …]` `FROM_FRD` entry
- [x] `docs/manual/getting-started.md`: rewrite the "Backlog is a list rather than a column" sentence (chapter body must stay > 80 chars)
- [x] FRD-011 → `status: withdrawn` + `## Amendment (GUI-070)` reversing R5, withdrawing R1/R3/R4/R6, recording bulk triage as **weighed and dropped, not relocated**
- [x] FRD-007 B4 rewritten — both halves — plus the `Related:` pointer annotated
- [x] PRD-001: dated note under problem 6, and pointers to it from `:25` and `:30`
- [x] FRD-019 R5: drop `Backlog (FRD-011)`, Board renders Backlog → Done (Phase 0.2 audit snapshot left untouched)
- [x] FRD-001: G8 citation repointed to FRD-019; `:34` acceptance criterion loses its `+ backlog` half
- [x] Source comment citations: `FilterBar.tsx:5` and `App.tsx:1722` keep FRD-001 G8, drop FRD-011 R4
- [x] `npm run build:manual` run **after** the doc edits; `chapters.generated.ts` committed
- [x] Rail green: `npm test`, `npm run typecheck`, `npm run build:ui`, `npm run check:manual`
- [x] `KANMER_SMOKE=1` boot: no Backlog tab; Ctrl+1/2/3 → Board/Standup/Archived with no gap; Backlog column reachable and workable on the board
- [x] `git fetch origin && git rebase origin/main` (GUI-072 in flight in `styles.css`), rail re-run, PR opened
- [ ] GUI-071's first verification criterion struck via `update_item`
- [ ] Verification run on merged main (this box produces proof.md)

## Progress notes

**Pre-flight passed.** `Board.tsx:108-116` maps all six `STAGES` into
`mergeColumns` with the third known-status argument; the
`STAGES.filter((s) => s.id !== "backlog")` line is gone. GUI-069 landed as
`488797d`.

**Base moved during setup.** `origin/main` advanced from `488797d` to `9ac20af`
between the pre-flight fetch and `git worktree add` (three commits: `ed52e39`
GUI-072's `.check` rule, `741ef81` MCP-010, `9ac20af` skills install). The
worktree is off `9ac20af`, the pre-flight still holds there, and the later
`git rebase origin/main` was a no-op — so the whole rail ran on the tree that is
being merged.

**`windowedRows` sole-consumer finding re-confirmed after GUI-069.** A repo-wide
grep (excluding `dist/`, `out/`, `node_modules/`) found `BacklogTable.tsx`, the
module's own test, and `packages/ui/src/index.ts` — nothing else. GUI-069 did
not virtualize the new column, so both files died with the view as planned.

**Deleted suite measured, not estimated.** Before deleting it, the original
`windowedRows.test.ts` was restored from `HEAD` and run on its own: **13 cases,
all passing**. The GUI suite therefore goes 22 files / 230 tests → **21 files /
217 tests**. That is the deletion, not a regression.

**One environment wrinkle, not a code problem.** The first `npm test` in the
fresh worktree failed two GUI test files with *"Failed to resolve entry for
package `@kanmer/core`"* — `packages/core/dist` does not exist until something
builds it. `npm run build:ui` builds core first; after it, `npm test` is fully
green. Worth knowing for anyone running the rail in a new worktree: build before
test, or run `build:ui` first.

**Runtime verification went further than a smoke boot.** `KANMER_SMOKE=1`
exits 0 but only proves the renderer rendered — it cannot press a key, and
`shortcuts.ts:1-13` records that no test covers the Ctrl+N handler. So the app
was also booted against a throwaway sandbox board with
`--remote-debugging-port` and driven over CDP. Observed, not inferred:

- nav tabs are exactly `["Board","Standup","Archived"]` — no Backlog tab;
- board columns are `["Backlog","Preparing","Implementing","Review","Verifying","Done"]`;
- Ctrl+1 → Board, Ctrl+2 → Standup, Ctrl+3 → Archived, on repeat and out of
  order — no gap in the numbering;
- **Ctrl+4 is now inert** (it used to open Archived) — the renumbering left no
  dangling binding;
- a Backlog card on the board selects and opens its editor, so backlog tickets
  are workable from the board alone.

The driver script is a throwaway in the agent scratchpad, deliberately not added
to the repo: a real answer to that gap is a jsdom/testing-library setup, which is
parked in `open-questions` as its own ticket.

---

## Closeout — GUI-070

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/gui-070`
- [ ] `git branch -d gui-070-remove-backlog-view` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`

### Closeout progress

- [x] PR merge verified — `state: MERGED`, `mergedAt: 2026-08-16T22:48:28Z`, merge commit `2f06713`
- [x] proof.md finalised on merged main (`2f06713`), with the PR URL and merge date, the four ticket criteria, and a screenshot at `assets/board-no-backlog-tab.png`
- [x] Moved to Done (proof gate passed; `questions-resolved` already satisfied)
- [x] Outcome recorded in the ticket body — PR link, what was deleted, the four governing-doc amendments, the bulk-triage loss, and the GUI-071 strike
- [x] `git worktree remove .worktrees/gui-070` — **needed a second pass.** First attempt: `Permission denied`; git deregistered the worktree but could not delete the directory, and `rm -rf` then reported `Device or resource busy` on `node_modules/electron/dist/icudtl.dat`. Cause: a stray `electron.exe` (PID 19664) still running out of that worktree, left over from the CDP runtime check — `child.kill()` does not reap Electron's helper processes. Killed it, then the directory removed cleanly. Worth knowing for any GUI ticket that boots the app from its worktree.
- [x] `git branch -d gui-070-remove-backlog-view` — deleted (`was 77c9bc5`). Git warned it was not merged to HEAD, which is expected after a **squash** merge: the branch commit is not an ancestor of main, only its squashed equivalent `2f06713` is. Merge state was verified first, so this was safe.
- [x] `git push origin --delete gui-070-remove-backlog-view` — the host does not auto-delete merged branches; the remote ref was still there after the local delete.
- [x] `git fetch --prune` + `git worktree prune` — `git branch -a --list "*gui-070*"` now returns nothing, local or remote, and no `gui-070` entry remains in `git worktree list`.
- [x] `take_ticket action: "release"`
