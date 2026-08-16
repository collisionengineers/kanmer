# Plan

## Core

```ts
addReference(id, sourceAbsPath, name?): Promise<{ name: string }>
removeReference(id, name): Promise<void>
```

`addReference` copies the file into `<ticketDir>/reference/`, taking the
basename unless `name` is given, and **validates the resolved destination stays
inside that folder** — same rule as every other path in core, in the same place
as every other path in core.

On a name collision it suffixes `-2`, `-3`. Overwriting loses a file the user
may not have another copy of; refusing makes the common case (two files called
`screenshot.png`) annoying.

`removeReference` deletes, validating the name the same way. No archive: a
reference is an input, not a record.

## Main

One dialog handler (`pickReferences`, multi-select), plus `addReference`,
`openReference` (`shell.openPath` on the resolved path) and `removeReference`.
Main resolves nothing itself — it passes names to core and core answers with
paths.

## Renderer

An **Attachments** section under the document list, since `docsInfo.references`
is already fetched: each file with an open button and a remove button.

Drop zone over the editor panel: `onDragOver`/`onDrop`, reading
`e.dataTransfer.files[i].path` (Electron exposes the real path, unlike a
browser). Remove needs a confirm naming the file.

## Not gated, and say so

The section carries one line: these never satisfy a document gate. Otherwise
someone will drop a spec into `reference/` and wonder why Preparing will not
release the ticket. That is `GATE_EXEMPT_DIRS` working as designed, and the UI
should say it rather than let it be discovered.

## Verification

The ticket's own criterion, mechanised: add a reference through core, then read
the ticket back through the **built MCP server** over stdio and assert the file
is enumerated. That crosses the process boundary the ticket cares about.
