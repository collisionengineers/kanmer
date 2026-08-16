# Checklist — GUI-072

Derived from plan.md, one box per step.

- [ ] Add the bare `.check` rule to `styles.css` after the `input:focus` block — `display:flex; align-items:center; gap:8px; cursor:pointer` + `.check input { width:auto }`, layout declarations only (no `font-size`, no `color`, no `margin`)
- [ ] Grep `FilterBar.tsx` for `check` to confirm it is dead, then delete `.filterbar .check` and `.filterbar .check input` (styles.css:602-612)
- [ ] Confirm no `.tsx` file is modified — CSS-only route (file-disjoint from GUI-070/074/080)
- [ ] Add `apps/gui/src/renderer/src/lib/stylesCheckRule.test.ts` — zero-dependency, parses `styles.css`, asserts bare `.check` + `.check input{width:auto}` exist and `.filterbar .check` is gone, labelled in its `describe` and header comment as a **rule-presence assertion, not a layout assertion**
- [ ] Rail green: `npm test`, `npm run typecheck`, `npm run build:ui`
- [ ] Render BEFORE PNGs (merge-base `styles.css`) for all four `.check` sites + `.check-row`, in dark, light, and compact density, via the gitignored `.ds-sync/` playwright
- [ ] Render AFTER PNGs under the same three conditions
- [ ] **Open every PNG with the `Read` tool** — actually look at the images; measuring geometry does not satisfy the operator's proof condition
- [ ] Numeric assertions captured: checkbox width ≤ ~20px at all four sites, label `display:flex`, checkbox vertical centre aligned with label text, label box single-line, label-text click still toggles `checked`, `.check-row` unchanged before vs. after
- [ ] Post-implementation report written; PR opened
- [ ] Review (author = reviewer, stated in the first line); merge with `gh pr merge`
- [ ] `move_item GUI-072 verifying`; write `proof.md` from merged main — including a description of what the before/after images SHOW in words that could only come from looking, plus the honest limit (Chromium layout from `styles.css`; not the packaged app at the user's DPI or under OS accessibility scaling)
- [ ] `move_item GUI-072 done`; closeout from the MAIN checkout (worktree removed, branch deleted, ticket released)

## Progress notes
