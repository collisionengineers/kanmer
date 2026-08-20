# Post-implementation report — GUI-090

## Summary

The Electron GUI now obtains the same itemised repository-staleness report as MCP through a separate, source-checkout-aware IPC read. It presents actionable `behind` findings in a disclosure banner while a compensated-only report stays silent. The staleness provider-path roster is now core-owned and consumed by the GUI provider registry, preserving legacy registration coverage and CORE-030’s exclusion of unowned Claude skill mirrors.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/staleness.ts` | Added/exported `STALENESS_PROVIDER_PATHS`; derived copied-skill and registration-file lists from it. | Makes core’s detector roster the single source of truth, including legacy `.mcp.json` coverage. |
| `apps/gui/src/main/providers.ts` | Replaced provider config/owned skill path literals with the core catalog. | Prevents GUI Connect and detector path lists from drifting. |
| `apps/gui/src/main/providers.test.ts` | Added catalog-to-provider mapping assertions and Claude-mirror regression coverage. | Proves every owned GUI path is detected by core without reviving `.claude/skills`. |
| `apps/gui/src/main/connect.ts` | Added `bundledSkillsRoot()` and reused it for copied-skill reconciliation. | Gives staleness IPC the same development/packaged bundle resolution as Connect. |
| `apps/gui/src/main/repoStaleness.ts` | Added the cold-read core adapter. | Keeps staleness outside board snapshot/watcher refresh and preserves the source-repo path. |
| `apps/gui/src/main/repoStaleness.test.ts` | Added source-checkout vs board-worktree parity coverage. | Proves GUI-path evaluation matches direct core output and reads the source checkout. |
| `apps/gui/src/main/index.ts` | Registered `getRepoStaleness` IPC handler. | Exposes one narrow, read-only main-process operation to the renderer. |
| `apps/gui/src/shared/ipc.ts` and `apps/gui/src/preload/index.ts` | Added typed channel/API/preload bridge for `RepoStaleness`. | Keeps the renderer boundary explicit and type-safe. |
| `apps/gui/src/renderer/src/App.tsx` | Loads staleness only when the active project changes and renders a detailed warning disclosure only when `upToDate` is false. | Shows human-actionable findings without a permanent compensated warning. |
| `apps/gui/src/renderer/src/lib/repoStaleness.ts` and test | Added pure attention policy and compensated/behind coverage. | Makes the banner rule directly testable. |

## Governing docs

- [ADR-0015](docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md) is met: the GUI consumes core’s itemised, content-based report; only `behind` changes `upToDate` and triggers attention; all detail/fix text is rendered without rewriting; the detector remains read-only.
- [FRD-013](docs/functional/frd/FRD-013-setup-as-reconciliation.md) is met: no automatic repair was added. The UI only reports core’s existing actionable guidance.
- [[CORE-030]] is incorporated from merged main (`8940928`): copied-skill ownership remains limited to `.opencode/skills`, `.agents/skills`, and `.grok/skills`; no unowned Claude mirror is inspected.

## Risks / follow-ups

- The root workspace `npm run typecheck` remains blocked by pre-existing unrelated `@kanmer/ui` code: `packages/ui/src/demo.tsx:622` returns `TicketDocsInfo` without required `documentPaths`. Core, MCP server, and GUI typechecks pass; this change does not touch `packages/ui`.
- The report is deliberately a cold read rather than watcher-driven state. A user sees its current value when opening/selecting a project; it does not continually rescan files after every board edit.
- The UI has no generic repair button because report fixes vary and ADR-0015/FRD-013 require detection rather than automatic mutation.

## Verification hand-off

On merged `main`, run:

- `npm test -w @kanmer/core` — expected 250 tests pass.
- `npm test -w @kanmer/gui -- --reporter=dot` — expected 288 tests pass.
- `npm run typecheck -w @kanmer/core` and `npm run typecheck -w @kanmer/gui` — expected pass.
- `npm run build -w @kanmer/gui` — expected Electron main, preload, and renderer builds succeed.
- `git diff --check` — expected clean.
- Open a board whose only report row is `compensated`: no staleness banner. Introduce a known `behind` artefact in a test project: a banner appears and its disclosure shows artefact, state, detail, and fix.
- `npm run typecheck` is expected to retain the unrelated `@kanmer/ui` `documentPaths` failure until that package is repaired.
