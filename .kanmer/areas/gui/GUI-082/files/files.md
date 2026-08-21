# GUI-082 files — selector audit

| Path | Change | Reason |
| --- | --- | --- |
| `apps/gui/src/renderer/src/styles.css` | Delete confirmed dead selector blocks; replace the duplicate `.check-row` rule with TicketCreate-scoped `.check` spacing/type. | Removes stale styling and consolidates one checkbox-row idiom without changing visible layout. |
| `apps/gui/src/renderer/src/components/TicketCreate.tsx` | Change its sole `.check-row` label to `.check`. | Uses the shared live checkbox-row rule. |
| `apps/gui/src/renderer/src/lib/stylesCheckRule.test.ts` | Update/add narrow textual assertions for the shared checkbox rule, TicketCreate-specific additions, removed selectors, and live dynamic families. | Makes the audit repeatable in the existing zero-dependency test environment. |
| `apps/gui/src/renderer/src/components/Board.tsx` | Read only. | Produces dynamic `drop-before`/`drop-after`; no change. |
| `apps/gui/src/renderer/src/App.tsx` | Read only. | Produces dynamic dispatch state classes; no change. |
| `apps/gui/src/shared/ipc.ts` | Read only. | Declares the `timed-out` dispatch state; no change. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | Read only. | Keeps live generic `.check` call sites. |
