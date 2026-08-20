# Checklist — GUI-096

## Core data

- [x] Add sorted gate-exempt `scratch: string[]` to `TicketDocsInfo`.
- [x] Populate it through existing core `listScratch` in `getTicketDocsInfo`.
- [x] Preserve docs/counts/checklist/references and legacy null behavior.
- [x] Test empty/sorted scratch lists, exclusions, no-write read, and no gate satisfaction.

## Scratch tab

- [x] Add a top-level Scratch tab outside `docTypes`.
- [x] Show note count/existence without gate/readiness styling.
- [x] Prefer selected existing slug, then `review`, then first sorted slug.
- [x] Render existing slugs and an explicit gate-exempt empty state.
- [x] Add new-note slug input/button.
- [x] Reject blank, non-lowercase-kebab, slash/backslash, dot/traversal, and duplicate slugs before calls.
- [x] Select valid `scratch/<slug>` without creating an empty file.
- [x] Reuse `DocEditor` for read/edit/preview/versioned save/conflict behavior.
- [x] Add `onSaved` callback and refresh docs info after successful scratch save.
- [x] Preserve dirty-tab confirmation when switching notes/tabs.
- [x] Do not add scratch delete, rename, ordering, doc type, or gate behavior.

## Group context

- [x] Fetch only `item.groups[0]` through existing `getGroupDoc(id,"context.md")`.
- [x] Reload/cancel stale fetches on item, first-group, or change-signal changes.
- [x] Render read-only Markdown pane immediately above Body.
- [x] Reuse escaped markdown/wiki-link navigation.
- [x] Show explicit loading, missing, and error states without blocking body editing.
- [x] Show no pane for ungrouped tickets and never substitute another group.
- [x] Do not add editing or multi-group aggregation.

## Tests and proof

- [x] Add jsdom Editor tests with complete mock client.
- [x] Prove Scratch is separate from pipeline tabs and ticket-only.
- [x] Prove sorted list/review preference/select/read/save/version/refresh.
- [ ] Prove valid new-note flow and invalid/duplicate/traversal no-write behavior.
- [ ] Prove conflict/dirty text remains protected.
- [x] Prove scratch does not alter gates/readiness.
- [ ] Prove first-group content/missing/error/ungrouped/reload/wiki navigation.
- [x] Add minimal responsive/accessible CSS; no unrelated redesign.
- [ ] Run core and GUI tests/typechecks plus `npm run verify`.
- [x] Confirm existing Editor is the production caller.
- [x] Confirm no IPC/preload/client method, gate/profile/doc type, fourth view, MCP/plugin/manual/package/lock change.
- [ ] Open PR with `Kanmer: GUI-096` and attach Scratch/context screenshots.
- [x] Keep `docs_todo` until DOC-011 links FRD deltas.
- [x] Stop at review readiness; do not merge or begin GUI-097.

## Progress notes

- 2026-08-20: Added core `TicketDocsInfo.scratch` via `listScratch`, a non-gated Scratch editor tab, and first-group context pane. Focused core docs tests: 50/50; focused Editor tests: 4/4; full GUI suite: 30 files / 300 tests; core and GUI typechecks plus GUI production build and `git diff --check` passed.
- `npm run verify` was attempted but this repository has no `verify` script (CORE-031 owns the shared rail). Visual screenshots remain review-visible work; Windows interactive capture is unavailable in this session.
