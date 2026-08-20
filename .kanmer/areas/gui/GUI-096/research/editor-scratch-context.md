# Research — GUI-096: Scratch tab and group-context pane

## Questions

1. How can the editor list/edit gate-exempt scratch files without adding an IPC channel or document type?
2. Where can first-group `context.md` be loaded/rendered with existing APIs?
3. Which editor states/tests must protect version conflicts, missing context, and ticket switching?

## Findings

### Existing editor/document surface

- `Editor.tsx` currently models tabs as `"ticket" | TicketDoc`, loads pipeline tab definitions through `client.getDocTypes`, and uses one generic `DocEditor` backed by existing `getDoc`/`setDoc` with content-version conflict handling.
- `TicketDoc` is a string, and core’s `docPathIn` already accepts legal type-relative paths such as `scratch/review`; scratch is gate-exempt and does not need a new doc type.
- Core already has `KanmerStore.listScratch(id)` and `getDoc(id, "scratch/<slug>")`.
- The GUI has no `listScratch` IPC/client method. However `getDocsInfo` already returns one extensible `TicketDocsInfo` object through an existing channel, and core’s `getTicketDocsInfo` already computes recursive type counts/references. Adding a `scratch: string[]` field populated by `listScratch` uses the existing `getDocsInfo` IPC and satisfies “no new IPC”.
- Existing `DocEditor` can read/write a chosen `scratch/<slug>` path and already handles optimistic concurrency, edit/preview, dirty-state tab switching, and external refresh.

### Scratch UI shape

- Add one top-level **Scratch** tab beside Ticket/pipeline docs. Scratch is not inserted into `docTypes`, because that would imply it is a pipeline/gated type.
- The tab should contain:
  - existing sorted scratch slugs from `docsInfo.scratch`;
  - a selected slug, defaulting to `review` when it exists, otherwise the first slug, otherwise none;
  - explicit “New scratch note” input/button validating the same slug rules core accepts (`lowercase-kebab`/safe relative single slug; no slash traversal);
  - existing notes opened in `DocEditor` using `scratch/<slug>`;
  - empty state explaining scratch is working/advisory and never satisfies gates.
- Creation can select a validated path and let `DocEditor`’s existing Create flow write it. After a save, `refreshDocsInfo` must run so the new slug appears. `DocEditor` therefore needs an optional `onSaved` callback rather than duplicating a second editor.
- Do not add deletion in this ticket; it is not requested and would require a destructive surface.

### Group context

- `ProjectClient.getGroupDoc(id, path)` already maps to existing `kanmer:getGroupDoc`; no IPC change is needed.
- `item.groups[0]` is the defined source. Load `context.md` whenever item ID, first group, item update/change signal changes.
- Render a read-only pane above the Body editor on the Ticket tab using existing `renderMarkdown`, with group ID in heading and wiki-link navigation through the editor’s existing preview click handler.
- If first group exists but context is absent, render a compact explicit “No context.md” state rather than silently showing nothing; this tells approvers/implementers shared context is missing without inventing a gate.
- Only the first group is rendered by this ticket, exactly as seeded. Do not aggregate multiple group contracts or add group editing.

### Tests

- Add a jsdom React test for Editor using `ClientContext.Provider` and a complete mock ProjectClient.
- Prove:
  - Scratch tab appears only for tickets, outside pipeline `docTypes`.
  - existing slugs list/sort/select; `review` preferred;
  - selected note is read through `getDoc("scratch/<slug>")` and saved through `setDoc` with expected version;
  - new validated slug can be created and refreshes info;
  - invalid/duplicate/traversal slug refuses locally;
  - gate/readiness state is unchanged by scratch content;
  - first group context is fetched/rendered above Body, supports markdown/wiki navigation, and reloads on item/group change;
  - missing context produces explicit empty state; ungrouped ticket produces no pane.
- Core test should assert `getTicketDocsInfo().scratch` returns sorted slugs and remains gate-exempt.

## Decisions

- Extend the existing `TicketDocsInfo` response with scratch slugs; add no new IPC channel/method.
- Reuse `DocEditor` and versioned get/set operations for scratch notes.
- Render first-group context read-only above Body.
- Keep scratch and context informational; no new gates/views/document types.

## Remaining unknowns

None. DOC-011 will formalize the FRD-019/FRD-003 deltas; keep `docs_todo` until that reference is linked.
