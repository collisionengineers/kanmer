# Proof

Branch at `86594dc`.

- `getGates` returns the core `GateReport` unmodified; the panel maps it
  one-to-one to rows.
- Rows re-read on `changeSignal` (any disk change), on `item.status`, on
  `item.profile` and after a save — so an agent writing `plan/plan.md` in the
  background flips that requirement without a reload.
- Warnings render distinctly and do not gate anything.
- A no-requirements profile renders the explanatory line instead of an empty
  panel.
- GUI typecheck, build, 124 GUI tests, boot smoke exit 0.

**Partly deferred.** The drag half of 4.5 — dimming a gated column and showing
the missing types on hover — already works from Phase 2, since `getGateStatus`
was rewired onto the core resolver then and `Board.tsx` puts the reasons in the
column's `title`. What is *not* done is the richer hover treatment and the
"rejected drop → toast" the item describes: a refused drop currently surfaces
through the existing error banner, which does name the boundary and the missing
document, but it is a banner rather than a toast. Recorded rather than quietly
counted as complete.

The "?" deep-link stub for the manual is not built either; it belongs with
GUI-017, which is what it would link to.
