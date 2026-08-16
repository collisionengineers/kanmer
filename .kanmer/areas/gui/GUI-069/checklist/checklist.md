# Checklist — GUI-069

Derived from `plan.md`, one box per step.

- [ ] Move `mergeColumns` from `Board.tsx:29-34` into
      `apps/gui/src/renderer/src/lib/board.ts`, exported, with a third
      parameter for the **known** status ids kept distinct from the **rendered**
      columns: known-but-not-rendered is dropped, neither-known-nor-rendered
      still gets a trailing `{ id, name: id }` fallback column.
- [ ] Add `describe("mergeColumns")` to `lib/board.test.ts`: configured columns
      keep their given order; an unknown status appends last; a known-but-hidden
      status is never resurrected; the full stage list puts `backlog` first with
      no duplicate column.
- [ ] In `Board.tsx`, delete the local `mergeColumns` and the
      `.filter((s) => s.id !== "backlog")` + its FRD-011 comment; import from
      `../lib/board.js`; pass full `UI_STAGES` as rendered columns and the full
      stage id list as known ids. Change nothing else in the component.
- [ ] Export `mergeColumns` from `packages/ui/src/index.ts` in the "Pure helpers
      the components are built on" block (alphabetical), after confirming
      `packages/ui` is tracked with `git ls-files packages/ui`.
- [ ] Add a `0.3.3 (unreleased)` entry to `apps/gui/release-notes.md`; leave
      line 153 (shipped 0.3.x notes) untouched.
- [ ] Confirm no `App.tsx`, `styles.css` or FRD file was touched
      (`git diff --name-only` against `origin/main`).
- [ ] Verification run: `npm test`, `npm run typecheck`, `npm run build:ui`,
      `npm run build -w @kanmer/gui`, `npm run check:manual` (confirming no
      regeneration is needed), plus the GUI smoke boot — six columns, BACKLOG
      leftmost, Ctrl+← from Preparing lands there. **This box produces
      `proof.md`.**

## Progress notes
