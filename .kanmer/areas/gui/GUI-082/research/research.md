# GUI-082 research — stylesheet selector audit

## Scope and governing constraint

The ticket is governed by `docs/functional/frd/FRD-019-gui-shell.md`: the renderer uses one global token-based stylesheet, so this work must preserve the documented board, editor, settings, and themed renderer surfaces. [[GUI-072]] is related prior checkbox work; it intentionally deferred unifying `.check` and `.check-row` until the newly added generic `.check` rule was proven. GUI-082's ticket explicitly owns that deferred consolidation.

HZN-006 has no `context.md` to add batch constraints.

## Method and findings

I enumerated all 240 class tokens in `styles.css` and searched all renderer `.ts`/`.tsx` files. The initial literal scan found 16 names with no source occurrence. I then checked template-generated classes and typed state values before deciding whether each was dead.

Retained dynamic/live selector families:
- `.card.drop-before` and `.card.drop-after`: `Board.tsx` produces `drop-${dropEdge}`, where `dropEdge` is `"before" | "after"`.
- `.chip.dispatch-state.timed-out`: `App.tsx` applies `d.state`; `DispatchStatus.state` explicitly includes `"timed-out"`.
- `.check` is live in Settings. The single former `.check-row` call is TicketCreate.

Confirmed dead CSS rule families (no renderer class producer or typed dynamic source remains):
- priority badges: `.pri`, `.pri-high`, `.pri-urgent`;
- list and chip remnants: `.list-updated`, `.list-quickadd`, `.chip.overdue`;
- retired editor/settings controls: `.editor-resize` (and hover), `.settings-grid`, `.section-head`;
- retired document/profile editor controls: `.doc-type-row` (including nested `.col-name`), `.doc-requires`, `.gate-row`, `.env-editor`, `.env-add`.

The priority CSS is stale after the format-3 renderer removal of priority display/control paths; the only remaining renderer references are filter compatibility/default comments, not DOM classes.

## Checkbox consolidation

`.check-row` duplicates the generic row layout and intrinsic checkbox-width reset from `.check`. Its only additional declarations are `margin-top: 6px` and `font-size: 12px`, which belong to the TicketCreate context. Replace its sole TicketCreate class with `.check`, move only those two declarations under `.modal.ticket-create .check`, then delete `.check-row` and its input rule. This removes the duplicate without changing that existing correct call site's visual spacing or type.

## Safe implementation shape

Delete only the confirmed dead selector blocks from `styles.css`; consolidate the one TicketCreate checkbox class as above. Do not alter component markup beyond its class name, global theme tokens, or live dynamic selector families. Extend the existing dependency-free stylesheet test with narrow assertions for the removed selectors, retained dynamic families, and TicketCreate's scoped `.check` spacing/type. This is a text-level regression guard, not a browser/layout assertion.

## Verification

Run the focused stylesheet test, all GUI Vitest tests, GUI typecheck and GUI build. Re-run the source selector audit after the change and record that every removed class lacks a static or dynamic producer while retained dynamic selectors still have their producers.
