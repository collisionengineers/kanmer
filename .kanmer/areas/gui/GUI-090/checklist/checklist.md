# Checklist — GUI-090

- [ ] Confirm [[CORE-030]]’s finalized owned copied-skill roster and preserve its removal of unowned `.claude/skills`.
- [ ] Export a core-owned staleness path catalog for copied-skill and registration inspection, including legacy registration coverage.
- [ ] Refactor core detector and GUI provider configuration to consume that catalog without changing provider commands or merge logic.
- [ ] Reuse Connect’s bundled skills-root resolution for a separate read-only staleness IPC handler.
- [ ] Evaluate staleness against the source checkout and keep it outside `snapshotOf()` and watcher-driven `refresh()`.
- [ ] Add the typed IPC channel, `KanmerApi` method, and preload bridge for `RepoStaleness`.
- [ ] Add a renderer banner/disclosure that renders core row detail/fix verbatim and warns only for `behind` findings.
- [ ] Test core/provider roster mapping and the marketplace-only Claude regression.
- [ ] Test GUI IPC parity with core/MCP semantics and source-root selection.
- [ ] Test compensated-only/no-banner and itemised mixed-report presentation behavior.
- [ ] Run focused core and GUI tests, workspace typechecks, a representative GUI-vs-MCP comparison, and `git diff --check`; record evidence in the implementation report.
