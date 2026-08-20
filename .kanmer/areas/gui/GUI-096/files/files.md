# Files — GUI-096

## Modify

| Path | Exact change |
|---|---|
| `packages/core/src/types.ts` | Add `scratch: string[]` to `TicketDocsInfoV3Extras`, documented as sorted gate-exempt scratch slugs. This extends the existing response; no new type/document/gate. |
| `packages/core/src/store.ts` | Populate `getTicketDocsInfo(id).scratch` using existing `listScratch(id)`/the same internal listing. Preserve counts/docs/checklist/references and no-write behavior. |
| `packages/core/src/docs.test.ts` or `store.test.ts` | Assert sorted scratch slugs appear in docs info, nested pipeline counts remain correct, and scratch still never satisfies gates. |
| `apps/gui/src/renderer/src/components/Editor.tsx` | Add Scratch top-level tab/state, slug list/new-note control, reuse `DocEditor` for `scratch/<slug>`, refresh docs info after save, and load/render first-group `context.md` above Body with missing/ungrouped states. Do not add IPC or a fourth app view. |
| `apps/gui/src/renderer/src/components/Editor.test.tsx` | New jsdom tests for scratch list/read/write/create/validation/conflict wiring and first-group context load/render/reload/missing/ungrouped behavior. |
| `apps/gui/src/renderer/src/styles.css` | Minimal styles for scratch selector/empty state and group-context pane using existing editor/tab/markdown tokens. No unrelated redesign. |

## Existing surfaces to reuse unchanged

| Path | Why |
|---|---|
| `apps/gui/src/shared/ipc.ts` | Existing `getDocsInfo`, `getDoc`, `setDoc`, `getGroupDoc` channels. Type propagation picks up `TicketDocsInfo.scratch`; add no channel. |
| `apps/gui/src/preload/index.ts` and `.d.ts` | Existing methods already expose the required operations. No method addition. |
| `apps/gui/src/renderer/src/lib/client.ts` | Existing `getDocsInfo/getDoc/setDoc/getGroupDoc`; no new client method. |
| `packages/core/src/store.ts#listScratch` | Source of existing slugs; do not duplicate filesystem traversal in renderer/main. |
| `packages/core/src/docpaths.ts` | Validates `scratch/<slug>` paths and containment. |
| `apps/gui/src/renderer/src/lib/markdown.ts` | Existing escaped markdown/wiki-link rendering for context pane. |
| `apps/gui/src/renderer/src/components/GroupView.tsx` | Existing read/edit treatment of group `context.md`; use as loading/error/render precedent, not a second editor. |
| DOC-011 / FRD-019 / FRD-003 | Governing docs follow-up; keep `docs_todo` until linked. |

## Component state additions

- `tab`: widen to `"ticket" | "scratch" | TicketDoc` without treating scratch as `docTypes`.
- `scratchSlug`: selected existing/new slug.
- `newScratchSlug` and validation error.
- `groupContext`: loading/content/missing/error keyed by `item.groups?.[0]`.
- `DocEditor.onSaved?`: refresh docs info after creating/updating scratch; keep pipeline use unchanged.

## Do not modify

- Main/preload IPC channel registry or add `listScratch` IPC.
- Gate/profile/doc-type configuration.
- Board/Standup/Archived views, App navigation, group membership, group editing, scratch deletion, or multiple-group aggregation.
- Plugin bundle, MCP server, manual/generated docs, package dependencies, or lockfile.
