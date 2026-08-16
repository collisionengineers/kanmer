# Proof

Branch at `cb39080`.

- No `priority` remains in `Board.tsx`, `FilterBar.tsx`, `Editor.tsx` or
  `Settings.tsx`; the create dialog offers Profile instead.
- `standup.ts` describes a ticket by stage, area and **profile** where it used
  to say priority — the standup line was the last place it leaked.
- GUI typecheck, build, and 112 GUI tests green; boot smoke exit 0.
- **Live:** 40 tickets on this repo's board had `priority` stripped by the
  migration, and the board renders without it.
