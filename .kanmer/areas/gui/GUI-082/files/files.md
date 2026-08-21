# GUI-082 files — selector audit

| Path | Change | Reason |
| --- | --- | --- |
| `apps/gui/src/renderer/src/styles.css` | Delete only confirmed dead selector blocks. | Removes stale styling without changing the renderer structure or token theme. |
| `apps/gui/src/renderer/src/lib/stylesCheckRule.test.ts` | Add a narrow textual regression assertion for this audited deletion and the live dynamic/checkbox families. | Makes the audit repeatable in the existing zero-dependency test environment. |
| `apps/gui/src/renderer/src/components/Board.tsx` | Read only. | Produces dynamic `drop-before`/`drop-after`; no change. |
| `apps/gui/src/renderer/src/App.tsx` | Read only. | Produces dynamic dispatch state classes; no change. |
| `apps/gui/src/shared/ipc.ts` | Read only. | Declares the `timed-out` dispatch state; no change. |
| `apps/gui/src/renderer/src/components/Settings.tsx` and `TicketCreate.tsx` | Read only. | Keep distinct live `.check` and `.check-row` call sites. |
