# Checklist — GUI-069

Derived from `plan.md`, one box per step.

- [x] Move `mergeColumns` from `Board.tsx:29-34` into
      `apps/gui/src/renderer/src/lib/board.ts`, exported, with a third
      parameter for the **known** status ids kept distinct from the **rendered**
      columns: known-but-not-rendered is dropped, neither-known-nor-rendered
      still gets a trailing `{ id, name: id }` fallback column.
- [x] Add `describe("mergeColumns")` to `lib/board.test.ts`: configured columns
      keep their given order; an unknown status appends last; a known-but-hidden
      status is never resurrected; the full stage list puts `backlog` first with
      no duplicate column.
- [x] In `Board.tsx`, delete the local `mergeColumns` and the
      `.filter((s) => s.id !== "backlog")` + its FRD-011 comment; import from
      `../lib/board.js`; pass full `UI_STAGES` as rendered columns and the full
      stage id list as known ids. Change nothing else in the component.
- [x] Export `mergeColumns` from `packages/ui/src/index.ts` in the "Pure helpers
      the components are built on" block (alphabetical), after confirming
      `packages/ui` is tracked with `git ls-files packages/ui`.
- [x] Add a `0.3.3 (unreleased)` entry to `apps/gui/release-notes.md`; leave
      line 153 (shipped 0.3.x notes) untouched.
- [x] Confirm no `App.tsx`, `styles.css` or FRD file was touched
      (`git diff --name-only` against `origin/main`).
- [x] Verification run: `npm test`, `npm run typecheck`, `npm run build:ui`,
      `npm run build -w @kanmer/gui`, `npm run check:manual` (confirming no
      regeneration is needed), plus the GUI smoke boot — six columns, BACKLOG
      leftmost, Ctrl+← from Preparing lands there. **This box produces
      `proof.md`.**

## Progress notes

**`packages/ui` is tracked in git — the research note is stale.** `git ls-files
packages/ui` returns 21 files in both the main checkout and this worktree, and
`git ls-tree origin/main packages/ui/src/` lists `index.ts`. The package was
untracked when research was written and has since been committed; the barrel
edit is committable and is in the commit.

**One unplanned line: `BoardColumn` dropped from `Board.tsx`'s type import.**
Removing the local `mergeColumns` left that type unused, and the GUI typecheck
(`tsconfig.web.json`) rejects it. Not scope drift — a mechanical consequence of
the move, in the same import statement.

**`mergeColumns`' third argument defaults to `[]`**, which preserves the old
behaviour exactly for any caller that does not pass it. A test pins that, so the
new parameter cannot silently change a future caller's semantics.

**`npm run check:manual` was run, not assumed: "manual: up to date (12
chapters)".** No curated FRD lead prose changed, so `chapters.generated.ts`
needs no regeneration — confirmed rather than inferred, per the plan.

**Rail (all green, in `.worktrees/gui-069`):** `npm test` 21 files / 210 tests
passed (the 8 new `mergeColumns` cases among them, board.test.ts 25/25);
`npm run typecheck` clean with all four workspaces named in the output
(`@kanmer/core`, `@kanmer/mcp-server`, `@kanmer/ui`, `@kanmer/gui`);
`npm run build:ui` success; `npm run build -w @kanmer/gui` success;
`npm run check:manual` up to date; MCP `smoke.mjs` 120/120 and
`smoke-protocol.mjs` 26/26 (both untouched by this change, run per AGENTS.md
§10.2); GUI smoke boot `KANMER_SMOKE=1 KANMER_OPEN=<sandbox> npx electron .`
exit 0 against a purpose-built sandbox holding two `backlog` tickets, one
`preparing` and one item with the unknown status `triage`.
