# MCP-044 open questions

## Resolved choices

- [x] What is the source of truth for the value? The saved GUI `AppSettings.kanmerBranch`; it defaults to `kanmer-board` and is passed into Connect. Hosted Actions may mirror the same value, but is not local process inheritance.
- [x] Does Codex lose portability? No. Keep the fixed rootless launcher command and add only the project-scoped `KANMER_BOARD_BRANCH` environment entry; no machine-specific path, cwd, root or bundle path is serialized.
- [x] How are existing registrations migrated? Only on the existing explicit/repeated Connect operation, which already replaces Kanmer's owned entry idempotently; no unrelated or global file rewrite is introduced.
- [x] Should plugin descriptors or the installer launcher be changed? No. They remain outside the project-scoped Connect seam; manually/plugin-launched local runtimes must export the documented variable when they need a non-default convention.

## Parked (explicitly deferred)

- [x] Live GitHub branch-protection retargeting and repository-variable mutation remain administrator-owned and are not proven by local registration tests (ADR-0016 / CORE-043 external boundary).
- [x] Automatic migration of already-running host processes is deferred: reconnect refreshes the registration, and a process restart is required for a host that has already spawned its MCP child.
