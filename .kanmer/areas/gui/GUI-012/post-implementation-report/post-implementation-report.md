# Post-implementation report

Card right-click is rendered, themed, and keyboard-operable. The native path is
gone rather than left dormant.

**For review, two things.**

"Add to group ▸" is **not** in the menu yet. FRD-019 R6 lists it, and the plan
said to include it disabled until Phase 5 wires the targets. I left it out
instead: a permanently disabled entry with no explanation is worse than an
absent one, and GUI-013 adds it with real targets. Flagging because it is a
deliberate deviation from the item's own description.

Submenu placement reuses `menuPosition` via `submenuPosition`, which means a
submenu near the bottom edge flips *vertically* too. That is right for a long
"Move to" list and slightly unusual next to native menus, which usually only
shift. Worth a look in use.

**Not done here:** the Ctrl+K palette still builds its own verb list. It is not
a context menu, so it is out of scope, but the two now describe overlapping
actions in two places.
