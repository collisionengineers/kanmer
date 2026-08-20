# Checklist — GUI-096

## Core data

- [ ] Add sorted gate-exempt `scratch: string[]` to `TicketDocsInfo`.
- [ ] Populate it through existing core `listScratch` in `getTicketDocsInfo`.
- [ ] Preserve docs/counts/checklist/references and legacy null behavior.
- [ ] Test empty/sorted scratch lists, exclusions, no-write read, and no gate satisfaction.

## Scratch tab

- [ ] Add a top-level Scratch tab outside `docTypes`.
- [ ] Show note count/existence without gate/readiness styling.
- [ ] Prefer selected existing slug, then `review`, then first sorted slug.
- [ ] Render existing slugs and an explicit gate-exempt empty state.
- [ ] Add new-note slug input/button.
- [ ] Reject blank, non-lowercase-kebab, slash/backslash, dot/traversal, and duplicate slugs before calls.
- [ ] Select valid `scratch/<slug>` without creating an empty file.
- [ ] Reuse `DocEditor` for read/edit/preview/versioned save/conflict behavior.
- [ ] Add `onSaved` callback and refresh docs info after successful scratch save.
- [ ] Preserve dirty-tab confirmation when switching notes/tabs.
- [ ] Do not add scratch delete, rename, ordering, doc type, or gate behavior.

## Group context

- [ ] Fetch only `item.groups[0]` through existing `getGroupDoc(id,"context.md")`.
- [ ] Reload/cancel stale fetches on item, first-group, or change-signal changes.
- [ ] Render read-only Markdown pane immediately above Body.
- [ ] Reuse escaped markdown/wiki-link navigation.
- [ ] Show explicit loading, missing, and error states without blocking body editing.
- [ ] Show no pane for ungrouped tickets and never substitute another group.
- [ ] Do not add editing or multi-group aggregation.

## Tests and proof

- [ ] Add jsdom Editor tests with complete mock client.
- [ ] Prove Scratch is separate from pipeline tabs and ticket-only.
- [ ] Prove sorted list/review preference/select/read/save/version/refresh.
- [ ] Prove valid new-note flow and invalid/duplicate/traversal no-write behavior.
- [ ] Prove conflict/dirty text remains protected.
- [ ] Prove scratch does not alter gates/readiness.
- [ ] Prove first-group content/missing/error/ungrouped/reload/wiki navigation.
- [ ] Add minimal responsive/accessible CSS; no unrelated redesign.
- [ ] Run core and GUI tests/typechecks plus `npm run verify`.
- [ ] Confirm existing Editor is the production caller.
- [ ] Confirm no IPC/preload/client method, gate/profile/doc type, fourth view, MCP/plugin/manual/package/lock change.
- [ ] Open PR with `Kanmer: GUI-096` and attach Scratch/context screenshots.
- [ ] Keep `docs_todo` until DOC-011 links FRD deltas.
- [ ] Stop at review readiness; do not merge or begin GUI-097.

## Progress notes

Append exact paths/versions used, validation cases, context-state screenshots, and test exit codes here.
