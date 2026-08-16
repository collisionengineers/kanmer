# Checklist

- [x] portal-rendered, not clipped by the column
- [x] positioned at the cursor, flipping near edges, pinned when oversized
- [x] measured before paint
- [x] Escape, click-away, blur, resize and wheel all dismiss
- [x] arrows/Home/End skip disabled and wrap; Enter/Space activate
- [x] submenus: Right opens, Left closes, flip near the right edge
- [x] `role=menu`/`menuitem`, `aria-haspopup`/`expanded`/`disabled`
- [x] gate reasons as tooltips on disabled Move entries
- [x] every colour a theme token
- [x] native `showItemMenu` removed from main, preload and the IPC contract
- [x] 12 tests on the pure geometry and key handling
