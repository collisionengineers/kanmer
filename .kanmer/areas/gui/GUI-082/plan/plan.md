# GUI-082 plan — stylesheet selector audit

## Governing documents

- `docs/functional/frd/FRD-019-gui-shell.md` — preserve the renderer's global themed shell surfaces.
- [[GUI-072]] — its proven generic `.check` rule makes the ticket-owned duplicate cleanup safe.

## Steps

1. Re-run the selector inventory against the current branch and confirm the audit boundary: dynamic drag/drop and dispatch-state classes are live; `.check-row` has exactly one TicketCreate call site.
2. In `styles.css`, remove only confirmed unproduced legacy selector blocks: priority badges, stale list/chip styles, retired resize/settings sections, and retired document/profile editor sections.
3. Consolidate the checkbox rows: change TicketCreate from `.check-row` to `.check`, move its existing 6px top margin and 12px type size to `.modal.ticket-create .check`, and delete the duplicate `.check-row` declarations.
4. Extend `lib/stylesCheckRule.test.ts` with focused text assertions for audited deletion, preserved dynamic selectors, and the shared checkbox rule plus TicketCreate-specific additions. Keep its explicit limitation: it is not a layout/browser test.
5. Run the focused test, all GUI tests, GUI typecheck, and GUI build. Re-run the source audit and inspect the diff to ensure no theme token or dynamic selector contract changed.
6. Record report evidence, open a scoped PR, review it independently if a reviewer is available (otherwise perform and record self-review), merge only after a clean review, verify merged main, write proof, and close out the worktree/branch.

## Risks and guardrails

- A literal-only selector scan can misclassify template-generated classes. The audit explicitly checks `drop-${dropEdge}` and typed `DispatchStatus.state` before deletion.
- CSS has no browser-test dependency. Text assertions protect the audit decisions; build/type/test checks protect integration. No visual behavior is intentionally changed.
- Preserve TicketCreate's current margin/type through its specific shared-class selector; do not make it inherit the unspaced generic Settings presentation.
