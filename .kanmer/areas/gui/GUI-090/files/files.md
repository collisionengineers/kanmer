# Files — GUI-090

## Where the change lands

- `packages/core/src/staleness.ts` — retain `detectStaleness()`; export/refine the canonical staleness provider-path catalog (owned copied-skill destinations, current registration files, and explicit legacy registration coverage).
- `packages/core/src/index.ts` — already re-exports staleness; confirm any new catalog/type is available to GUI main without a deep import.
- `apps/gui/src/main/providers.ts` — consume the core-owned roster for the configuration paths/owned skill locations while retaining GUI-only commands, merges, labels, and dispatch details.
- `apps/gui/src/main/connect.ts` — expose or reuse the existing bundled-plugin/skills-root resolution so the staleness IPC uses the same dev/packaged layout source as Connect.
- `apps/gui/src/main/index.ts` — add a separate read-only staleness IPC handler using `sourceRoot`, the current store/board inputs, and the bundled skills root; do not add it to `snapshotOf()`.
- `apps/gui/src/shared/ipc.ts` and `apps/gui/src/preload/index.ts` — channel, shared result type, `KanmerApi` method, and preload bridge.
- `apps/gui/src/renderer/src/App.tsx` plus a focused component/lib and tests — fetch the report outside `refresh()`, render a focused banner/disclosure near the format banner, and make warning eligibility testable.

## Context files

- `packages/core/src/staleness.ts` — report semantics, existing duplicated lists, and the detector’s input contract.
- `packages/core/src/staleness.test.ts` — core regression coverage; update only if extracting/exporting roster data requires it.
- `apps/gui/src/main/providers.ts` — provider registration and install ownership.
- `apps/gui/src/main/connect.ts` — `pluginRoot()` and copied-skills reconciliation.
- `apps/gui/src/main/index.ts` — per-project source/board context and IPC handler conventions.
- `apps/gui/src/shared/ipc.ts`, `apps/gui/src/preload/index.ts` — typed renderer boundary.
- `apps/gui/src/renderer/src/App.tsx` — current format-banner location and hot refresh path.
- [ADR-0015](docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md) and [FRD-013](docs/functional/frd/FRD-013-setup-as-reconciliation.md).
- [[CORE-023]] and [[CORE-030]].

## Ripple effects

- Detection must inspect the source checkout, not the board worktree, in Git-managed projects.
- A report returned by GUI main must have identical rows and state semantics to MCP for the same repository/build.
- `compensated` is expected on healthy boards, so it belongs in detail/disclosure rather than an always-visible warning.
- The roster inversion must preserve legacy `.mcp.json` inspection and current provider behavior while preventing another copied-path divergence.
- CORE-030’s removal of `.claude/skills` is the ownership baseline; no GUI path may bring it back.

## Out of scope

- Reimplementing or changing core staleness detection policy.
- Automatic repair, mutation from a read path, or a new global “fix all” operation.
- Changing marketplace/copy-skills installation behavior beyond consuming the canonical roster.
- Board-format migration UI, which remains a separate established banner.
