# 3.7 Project-switch dirty-guard fix — S (audit A1)

- **Where:** `App.tsx:75-91` (`openProject` calls `setSelectedId(null)` directly at `:83`, bypassing `trySelect`).
- Route project switching through the same dirty-guard/discard-modal path as selection changes, so Ctrl+O / Open Recent / the header project button can no longer silently discard an unsaved edit. This is a **live single-project data-loss bug today** — fixed here rather than waiting for Phase 5's tab guard (which then generalizes it).
