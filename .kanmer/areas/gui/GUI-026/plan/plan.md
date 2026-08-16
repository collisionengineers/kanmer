# 4.2 Un-squish the Board tab — S (request #9)

- Replace `.settings-grid` (2-col) with `.settings-cols` (`display:flex; flex-direction:column`) so each `ColumnEditor` (stages/areas/priorities/id-prefixes) is **full-width** — the squeeze disappears with no change to `ColumnEditor` internals.
