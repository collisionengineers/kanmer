# Research — GUI-090

## Question

How should the Electron GUI surface core’s itemised repository-staleness report without duplicating detection, creating a permanent warning, or retaining a second provider-path roster?

## Findings

- [[CORE-023]] shipped `detectStaleness()` and the public `RepoStaleness` shape: `{ upToDate, stale: [{ artefact, state, detail, fix }] }`. It is content-hash detection only; it never repairs the repo.
- ADR-0015 defines the key UI rule: `upToDate` is false only when a row is `behind`. `compensated`, `unstamped`, and `unknown` are informative but must not become a standing warning. The existing board-format banner is deliberately outside this report.
- The GUI opens a source checkout and board worktree separately. `ProjectContext.sourceRoot` is the repository to inspect, while `ctx.store` is rooted at the board worktree with the source repo supplied to core. A GUI call must preserve that distinction.
- `snapshotOf()` and the renderer’s `refresh()` are hot board-refresh paths. Staleness walks files and must be exposed by a separate read-only IPC handler, invoked independently of board refresh.
- The GUI can call the shared core detector directly from main. It must provide core’s existing inputs plus the GUI’s bundled skills directory, derived from `connect.ts`’s `pluginRoot()` so development and packaged layouts use the same answer as Connect.
- The IPC boundary is conventional and complete: add one channel/result type in `shared/ipc.ts`, a narrow main handler, and one preload wrapper. Do not widen `OpenProjectResult` or make staleness part of the watcher refresh.
- The renderer already has the format/migration banner region in `App.tsx`. A small dedicated report/banner component or pure view-model helper is the testable place to decide whether a banner appears. It should render the core `detail` and `fix` strings verbatim; rewriting them would reintroduce a second diagnostic vocabulary.
- [[CORE-030]] is actively implementing the immediate ownership correction: remove unowned `.claude/skills` from core’s copied-skills destinations while retaining `.opencode/skills`, `.agents/skills`, and `.grok/skills`. Its report explicitly reserves the provider/core roster inversion for this ticket. GUI-090 execution must build on that correction rather than reintroduce Claude into the UI’s interpretation.
- Core still holds two duplicated path lists: skill destinations and registration files. Since core cannot import Electron main, the durable inversion is a core-owned, exported path roster (including legacy `.mcp.json` registration coverage) that `providers.ts` consumes for its current provider configuration. Provider-specific commands and merge functions remain GUI-owned.
- HZN-005 and HZN-006 have no `context.md`; the only binding context is the ticket/ADR scope. GUI-090 remains in HZN-005; CORE-030 is in HZN-006.

## Dependencies

- [[CORE-023]] is complete and supplies the detector and report model.
- [[CORE-030]] is in Implementing. It removes the false marketplace-only Claude skill destination but deliberately does not perform the cross-package roster inversion. GUI-090 is not blocked on its PR procedurally, but its implementation must incorporate/rebase on that finalized core roster and must not duplicate or conflict with it.
- [ADR-0015](docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md) and [FRD-013](docs/functional/frd/FRD-013-setup-as-reconciliation.md) govern detection-only, actionable reporting.

## Implications

Add a lazily requested GUI report surface that warns only for `behind` findings while allowing a disclosure to show the complete itemised report. Export a core-owned provider-path catalog, update GUI providers to consume it, and cover parity, compensation/no-banner behavior, cold-path IPC, and the post-CORE-030 ownership roster.

## Open questions

None.
