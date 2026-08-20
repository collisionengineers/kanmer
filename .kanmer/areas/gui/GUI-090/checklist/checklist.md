# Checklist — GUI-090

- [x] Confirm [[CORE-030]]’s finalized owned copied-skill roster and preserve its removal of unowned `.claude/skills`.
- [x] Export a core-owned staleness path catalog for copied-skill and registration inspection, including legacy registration coverage.
- [x] Refactor core detector and GUI provider configuration to consume that catalog without changing provider commands or merge logic.
- [x] Reuse Connect’s bundled skills-root resolution for a separate read-only staleness IPC handler.
- [x] Evaluate staleness against the source checkout and keep it outside `snapshotOf()` and watcher-driven `refresh()`.
- [x] Add the typed IPC channel, `KanmerApi` method, and preload bridge for `RepoStaleness`.
- [x] Add a renderer banner/disclosure that renders core row detail/fix verbatim and warns only for `behind` findings.
- [x] Test core/provider roster mapping and the marketplace-only Claude regression.
- [x] Test GUI IPC parity with core/MCP semantics and source-root selection.
- [x] Test compensated-only/no-banner and itemised mixed-report presentation behavior.
- [ ] Run focused core and GUI tests, workspace typechecks, a representative GUI-vs-MCP comparison, and `git diff --check`; record evidence in the implementation report.

## Progress notes

- Built on merged [[CORE-030]] (`8940928`): `.claude/skills` remains outside the owned copied-skill roster.
- Added a cold `getRepoStaleness` IPC read rooted at the source checkout; watcher refresh and `snapshotOf()` remain untouched.
- Added core-catalog/provider mapping and renderer attention-policy coverage. Focused core and GUI checks are passing; final full-workspace verification remains.
