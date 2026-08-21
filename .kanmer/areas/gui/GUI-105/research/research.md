# Research — GUI-105: GUI document-path parity

## Question

Why do named/nested ticket documents disappear in the GUI, and what is the smallest change that gives the editor parity with the core/MCP inventory?

## Findings

- FRD-003 defines unlimited recursive documents per type and explicitly requires the editor to list multiple documents under one type tab.
- Core's `getTicketDocsInfo` already returns a sorted `documentPaths` inventory from the same recursive pass that produces counts. MCP-029 exposes that inventory to agents.
- The GUI main process already returns the complete `TicketDocsInfo` through existing `getDocsInfo` IPC; no new store method or IPC channel is required.
- `Editor.tsx` uses `docsInfo.docs`, `references`, and `scratch`, but ignores `docsInfo.documentPaths`. Its tab state is only a top-level document type and passes the bare type to `DocEditor`.
- A bare type such as `research` resolves to `research/research.md`. Therefore a ticket containing only `research/portable-connect-integration.md` displays an existence dot but opens an empty index document.
- Scratch already provides the relevant interaction precedent: list concrete names, retain a selected path, guard dirty tab/path changes, and pass the exact path to the same `DocEditor`.
- Reference files have a separate open-in-default-app surface and assets are embedded evidence; neither should be folded into editable pipeline-document lists.

## Implications

Use the existing `documentPaths` field to add a per-type path selector inside each pipeline tab. Keep the type tab as the workflow identity, select the conventional index when present and otherwise the first sorted path, and pass the exact selected path to `DocEditor`. No core, MCP, or new IPC implementation is required.

## Open questions

None.
