# Plan

**Portal.** A menu opened from a card inside an `overflow: auto` column would
be clipped by it, so the menu renders into `document.body`.

**Flip, don't slide.** Near an edge the menu flips across the anchor. Sliding
would put the pointer on top of a menu item, and the mouse-up from the press
that opened the menu could then activate it. A menu too large to fit either way
is pinned with padding rather than allowed off-screen.

**Measure before paint.** `useLayoutEffect` positions off-screen first, measures,
then places — so the menu never visibly jumps.

**Gates on open.** One `get_doc_gates` call for the ticket being acted on, when
the menu opens. Holding gates for every card would be N calls for information
almost none of them need, and stale by the time it is shown.

**Keyboard.** Arrows skip disabled entries and wrap; Home/End go to the first
and last enabled; Enter/Space activate; Right opens a submenu and Left closes
it. "Skip disabled and wrap" is the piece with real edge cases — all-disabled,
single-enabled — so it is a pure function with tests rather than inline state
juggling.

**Dismissal on `mousedown`, not `click`**, matching native menus and avoiding
the opening press being caught by the closing handler.
