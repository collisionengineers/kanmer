# 6.3 GUI wiring

- **Handoff to Phase 4's Connect tab:** buttons render from a main-supplied `listProviders()` (no hardcoded codex/claude), so adding a 6th host is a data change. `ConnectSection` (`Settings.tsx:217-268`) already has the busy/result/copy-fallback UI to reuse.
