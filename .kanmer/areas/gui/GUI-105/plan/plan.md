# Plan — GUI-105: Show every ticket document path in the GUI

## Approach

Consume `TicketDocsInfo.documentPaths` in the existing editor and mirror the scratch selector pattern inside each pipeline-document tab. Keep document type as the workflow tab, but select and edit an exact path within it. This directly satisfies FRD-003 without a new filesystem scan, store method, IPC channel, or duplicate inventory.

## Governing docs

- **Meets FRD-003 T2/T6** — pass recursive type-relative paths unchanged to the existing document read/write API while preserving bare-type index compatibility.
- **Meets FRD-003 T7 and acceptance 5** — group every discovered path beneath its type tab and show multiple research files.
- **Meets FRD-003 T9/T10** — make the complete Markdown inventory visible so users can inspect and maintain living documents.
- FRD-003 is not modified.

## Steps

1. Derive a stable, sorted map from top-level pipeline type to exact paths using `docsInfo.documentPaths`; exclude scratch, reference, and assets from the pipeline selector because they retain dedicated surfaces.
2. Add selected-path state per active type. Prefer `<type>/<type>.md` when present, otherwise the first sorted existing path, and use the conventional index path for an empty type so current creation behavior remains.
3. Render a compact accessible path list within the active type tab, showing relative nested names without flattening collisions.
4. Extend the dirty-navigation guard so switching exact paths cannot discard edits; reset or retain selections correctly when the ticket or live inventory changes.
5. Pass the exact selected path into `DocEditor` for load, save, preview, checkbox updates, and version-conflict handling.
6. Add interaction tests for named-only research, three files under one type, nested duplicate basenames, index preference, empty-type creation, exact-path saving, dirty-switch confirmation, live refresh, and unchanged scratch/reference behavior.
7. Run GUI tests, root typecheck, and the normal build; visually verify the GUI-102 named research example.

## Verification

Automated tests assert the requested path supplied to `getDoc`/`setDoc` and the visible selector state. Manual proof opens a ticket containing only `research/portable-connect-integration.md`, edits it, reloads, and confirms MCP/core inventory equality.

## Risks / open questions

- Long/deep paths can crowd the modal; use the existing compact chip/list styling with full path in accessible text/title.
- Inventory changes during an edit must not replace dirty content; defer selection reconciliation until the edit is saved or cancelled.
- No open questions.
