# 4.5 Fix column-stranding on save — S (audit A3/E19)

- The GUI whole-board save can currently drop a column that items still reference — the one protection `remove_column` has (`store.ts:219-249`) that the `setBoard` IPC path (`main/index.ts:407-410`) lacks; a documented live hazard, now fixed rather than merely not-worsened. `validateDraft` blocks removing a stage/area still in use (listing the occupying ticket ids, matching `remove_column`'s message), and core's `setBoard` gains the same check server-side so no GUI path can strand items.
