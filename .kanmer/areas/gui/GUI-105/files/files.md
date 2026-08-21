# Files — GUI-105

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/renderer/src/components/Editor.tsx` | Derive per-type paths, maintain the selected exact path, render the selector, preserve dirty guards, and send the selected path to `DocEditor`. |
| `apps/gui/src/renderer/src/components/Editor.test.tsx` | Prove named-only and nested documents are visible/selectable/editable and preserve existing index/scratch behavior. |
| `apps/gui/src/renderer/src/styles.css` | Style the compact per-type document selector using existing chip/list patterns. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/docpaths.ts` | Defines exact path normalization, recursive inventory ordering, and bare-type index compatibility. |
| `packages/core/src/store.ts` | Supplies `TicketDocsInfo.documentPaths`; the GUI must consume, not recreate, this inventory. |
| `apps/gui/src/shared/ipc.ts` | Confirms `getDocsInfo` already carries the required type without a new IPC surface. |
| `packages/core/src/docs.test.ts` | Establishes sorting, nested-path, and gate semantics that GUI tests should mirror. |
| `docs/functional/frd/FRD-003-ticket-documents.md` | Governs per-type lists and the three-research-doc acceptance criterion. |
| `apps/gui/src/renderer/src/components/Editor.tsx` scratch panel | Existing exact-path selection and unsaved-edit guard behavior to reuse. |

## Ripple effects

The editor modal state and accessibility labels change; GUI snapshots/interactions must cover switching exact paths and live inventory refresh. MCP/core behavior and reference/asset handling remain unchanged.

## Out of scope

Creating/renaming/deleting arbitrary pipeline files, editing binary assets, changing type vocabulary, changing gates, or adding another filesystem inventory.
