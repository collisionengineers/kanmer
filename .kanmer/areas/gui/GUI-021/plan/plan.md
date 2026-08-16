# 3.4 Traceability + removals on the ticket surface — S (request #16, #6)

- **Where:** `Editor.tsx:36,74,487-494` (remove the `due` date input + `Snapshot.due`), `Standup.tsx:171-174` (remove the "Overdue" section).
- Show **commits / PRs** (read-only; skill-populated) and **deployment** (editable — a dropdown of `n/a | not-deployed | <env-id>`) on the ticket popout, plus small deployment/PR badges on the card (`Board.tsx`); the deployment row is hidden entirely when the board has no `deployment` config. Also add the long-promised **`blocked` badge** (audit A2 — pledged by kanmer-upgrades Phase 7, only `taken` shipped; the derived blocked-by data is already wired).
