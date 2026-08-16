# Proof

Branch at `fcddf2d`.

- Chips render per group id on the card and are buttons, not spans, so they are
  keyboard-reachable.
- Clicking sets `filters.group`; the predicate in App drops any ticket not in
  it, and because that predicate feeds every view, switching to Standup or
  Archived keeps the lens.
- `Card` props remain primitive/stable - no object is constructed per render.
- 124 GUI tests, both typechecks, GUI build, boot smoke exit 0 (on a fresh
  user-data-dir; a first attempt exited 1 on the single-instance lock, which is
  the documented smoke-mode behaviour, not a regression).

**Not done:** "Add to group" in the card context menu. It needs a target list
and a write path, and I would rather add it with the real targets than ship a
disabled entry.
