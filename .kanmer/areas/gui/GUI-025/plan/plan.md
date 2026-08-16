# 4.1 Tabbed, fixed-size shell — M (request #9)

- **Where:** `Settings.tsx:101-215`, `styles.css`.
- New `.modal.settings` with **explicit width + height** (≈`min(900px, 94vw)` × `min(640px, 90vh)` so small screens still fit, mirroring the per-variant sizing of `.modal.confirm`/`.modal.migrate` at `styles.css:696-698,1063-1065`) + a left rail / right pane. Tabs reuse the existing `.tab`/`.tab.active` classes (already used at `App.tsx:440-454`, `Editor.tsx:381-403`). Tabs: **Board**, **Documents**, **Appearance**, **Connect** (Connect body is Phase 6). Switching tabs never resizes the dialog.
