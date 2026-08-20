# Plan — GUI-096: Scratch tab and first-group context pane

## Objective

Expose gate-exempt scratch notes and the first group’s shared context inside the existing ticket editor using current document/group operations and no new IPC channel, gated document type, or application view.

## Starting state

- Pipeline document tabs are driven by `docTypes`; scratch is absent and must stay outside that list.
- `DocEditor` already provides versioned read/edit/preview/save/conflict behavior for any valid type-relative path.
- Core can list scratch slugs, but the GUI’s existing `getDocsInfo` response does not include them.
- `getGroupDoc` already reaches `context.md`; Editor does not call it.

## Governing docs

- **FRD-003/FRD-019:** Scratch remains gate-exempt and the editor gains a Scratch surface/context pane. DOC-011 owns the formal deltas; keep `docs_todo` until linked.
- **EPIC-009:** implements audience-separated editor access without a fourth view or new gated type.
- **MASTERPLAN S-11:** reuse existing list/read/group operations, first group only, no new IPC.

## Required changes

1. Extend `TicketDocsInfoV3Extras` with `scratch: string[]`; document sorted slugs and gate-exempt semantics.
2. In `getTicketDocsInfo`, call/reuse `listScratch(id)` and return `scratch` alongside existing fields. For legacy items continue returning null.
3. Add core regression tests:
   - no scratch → `[]`;
   - several `scratch/<slug>.md` notes → sorted slug list;
   - nested/invalid non-scratch docs excluded;
   - scratch presence does not satisfy any gate;
   - read does not change board bytes/activity.
4. In `Editor.tsx`, introduce a local tab union distinguishing `scratch` from pipeline docs. Do not append scratch to `docTypes`.
5. Render a `Scratch` tab for ticket items whenever docs info is available. Show a note count/dot derived from `docsInfo.scratch`; do not show a gate/readiness indicator.
6. Add selected-slug state. On item/docs-info change:
   - retain selection if it still exists;
   - otherwise prefer `review`;
   - otherwise first sorted slug;
   - otherwise no selection.
7. Add a compact scratch sidebar/header listing existing slugs as buttons and an empty-state explanation that scratch is working material and never satisfies gates.
8. Add “New note” affordance with controlled slug input. Normalize trim/lowercase only when presenting recommendation; do not silently transform an entered invalid value on write.
9. Validate slug before selection/create: non-empty lowercase-kebab, no `/`, `\`, `.`, `..`, traversal, or duplicate. Surface inline error and make no call on invalid input.
10. On valid new slug, select it as `scratch/<slug>` and let `DocEditor` show its existing create state. Do not create an empty file merely by selecting.
11. Reuse `DocEditor` with `doc={"scratch/" + slug}`. Add optional `onSaved` callback invoked after a successful save; pipeline callers omit it.
12. On scratch save, call `refreshDocsInfo()` so a newly created slug appears. Preserve expected-version conflict behavior and dirty-tab discard guard.
13. Ensure changing selected scratch note while dirty triggers the existing confirmation path rather than discarding text. Generalize pending tab/path state only as required.
14. Do not add delete/rename/reorder operations.
15. Add group context state keyed by first group ID. On ticket/group/change signal:
   - if no group, clear state;
   - else fetch `getGroupDoc(firstGroup,"context.md")`;
   - distinguish loading, content, missing, and error; ignore stale async results after item/group changes.
16. On Ticket tab, render a `Shared context — <group id>` pane immediately above the Body field.
17. For content, render through existing `renderMarkdown(form/knownIds)` and reuse preview link navigation handler. Keep raw HTML escaped by the existing renderer.
18. For null content, render “No context.md is available for <group>” and a non-editing hint to open the group; do not create context or read another group.
19. For fetch error, show a bounded error banner; ticket body editing remains usable.
20. Do not include second/subsequent group contexts.
21. Add semantic classes/ARIA labels and minimal CSS matching existing tabs/panels/markdown. Verify narrow editor widths do not make controls unusable; stack selector as needed.
22. Add `Editor.test.tsx` with a complete mock client and representative ticket/board/items.
23. Test Scratch tab is separate from configured pipeline docs and absent for non-ticket items.
24. Test existing scratch list, `review` preference, selection, exact `getDoc("scratch/review")`, edit/save exact `setDoc` path/options, docs-info refresh, and conflict UI.
25. Test valid new slug reaches create flow; invalid/duplicate/traversal slugs issue no write.
26. Test scratch note existence leaves readiness/gate calls/result unchanged.
27. Test first-group fetch path, rendered heading/content/wiki navigation, missing state, fetch error, ungrouped state, and reload when first group changes.
28. Run GUI tests/typecheck and core tests/typecheck. Run full root verification required by current rail.
29. Inspect production caller: `Editor` is mounted by the existing ticket editor path; no registered-but-unreachable component is introduced.
30. Confirm no IPC channel/preload/client method, gate/profile/doc type, fourth view, scratch delete, multi-group aggregation, package, lockfile, plugin, or generated manual changed.
31. Open PR with `Kanmer: GUI-096`; include screenshots of Scratch with existing/new note and grouped/ungrouped ticket context states.

## Expected files

Modify:
- `packages/core/src/types.ts`
- `packages/core/src/store.ts`
- `packages/core/src/docs.test.ts` or `store.test.ts`
- `apps/gui/src/renderer/src/components/Editor.tsx`
- `apps/gui/src/renderer/src/styles.css`

Add:
- `apps/gui/src/renderer/src/components/Editor.test.tsx`

## Do not modify

- `apps/gui/src/shared/ipc.ts`, preload files, or renderer client API except type fallout that requires no new method.
- Core gates/profiles/doc types, App views/navigation, GroupView editing, MCP/plugin/manual/package files.

## Acceptance checks

- Existing `getDocsInfo` returns sorted scratch slugs; no new IPC channel exists.
- Scratch tab lists, creates, reads, edits, and version-saves notes through existing operations.
- Scratch remains outside pipeline tabs/gates and does not affect readiness.
- Dirty/conflict behavior protects user text.
- First group’s context renders read-only above Body; missing/error/ungrouped states are explicit and safe.
- Only first group is used; no new view or gated type.
- Production caller is existing Editor; GUI/core tests and verification rail pass.

## Commands

```bash
npm test --workspace @kanmer/core
npm test --workspace @kanmer/gui
npm run typecheck --workspace @kanmer/core
npm run typecheck --workspace @kanmer/gui
npm run verify
git diff --check
git status --short
```

## Failure and deviation rules

- Do not add a new IPC channel to solve listing; extend the existing docs-info response.
- Do not make scratch a `DocType`, gate, or readiness row.
- Do not write/create files on tab selection, discard dirty text, edit group context, or aggregate groups.
- Any need for delete/rename or new navigation is a follow-up ticket.
- Do not merge or begin GUI-097.

## Stop condition

Stop when existing and newly created scratch notes are safely editable through the Scratch tab, first-group context renders above Body with complete states, no new IPC/gate/view exists, tests and verification pass, screenshots are attached, and the PR is ready for independent review. Do not merge or start GUI-097.
