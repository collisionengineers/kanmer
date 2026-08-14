# DocEditor interactive checkboxes hardcoded to "checklist" — configurable progress doc silently degrades to read-only

- **Severity:** nit (quality)
- **PR:** #7 (Phase 3: GUI containers — `progressDoc` derived in `fc5d93d`)
- **File:** `apps/gui/src/renderer/src/components/Editor.tsx:341-343` (literal check at :872)
- **Source bug ids:** bug_012

## Follow-up verdict — validated

The data flow is split exactly as reported. `Editor` resolves the progress id
from the current ticket's resolved `docTypes` and uses it for the tab counter,
but `DocEditor` receives no progress identity and gates its interactive rendering
on `doc === "checklist"`. Core already computes progress from the configured flag,
so a renamed or per-area progress document exhibits inconsistent UI behavior.

## Summary

DocEditor's interactive-checkbox branch still guards on the literal `doc === "checklist"` (Editor.tsx:872) even though the Editor now derives the progress doc from `docTypes.find((d) => d.progress)?.id` (Editor.tsx:341) and uses it correctly for the tab-dot counter. A board or per-area override that renames the progress doc (e.g. `{ id: 'tasks', progress: true }`) gets the correct n/m tab counter but no clickable checkboxes — the doc silently degrades to a plain markdown preview.

## Detail

Phase 1 D5 promises the document model is "fully user-customizable" — the progress doc is identified per board/area by the `progress: true` flag on a doc type. The store honours this: `getTicketDocsInfo` at store.ts:936-937 does `const progressType = types.find((t) => t.progress)` and parses checklist progress from whatever doc carries that flag. The Editor's tab-dot counter matches — Editor.tsx:341 computes `const progressDoc = docTypes.find((d) => d.progress)?.id` and the tab render at ~:385 shows the counter only when `d.id === progressDoc`. So half the round trip is done.

The sibling `DocEditor` function further down the same file still guards its interactive checkbox rendering on a fixed literal at Editor.tsx:872: `if (doc === "checklist")`. `DocEditor` receives `doc: TicketDoc` (a plain string post-Phase-1) but has no visibility into which doc id is the progress doc for this board/area. The CSS class `checklist-view` on Editor.tsx:877 has the same fixed-literal shape.

### Step-by-step proof

Configure a board whose progress doc is anything other than `checklist`:

```yaml
# board.yml — a 'tasks' doc replaces 'checklist' as the progress doc
docs:
  default:
    types:
      - { id: research, name: Research }
      - { id: plan, name: Plan, requires: [research] }
      - { id: tasks, name: Tasks, requires: [plan], progress: true }
```

1. Open a ticket in the GUI and write some `- [ ]` items to `tasks.md` via `set_ticket_doc`.
2. The Tasks tab correctly shows the n/m counter (store + tab-dot path are data-driven).
3. Click the Tasks tab. Because `doc === "tasks"` fails the literal check at Editor.tsx:872, the code falls through to the plain markdown-preview branch. No clickable checkboxes; `toggleCheckbox` is never wired up; `checklist-view` never applied.

### Impact

The default configuration is unaffected (the shipped `checklist` doc has `progress: true` and matches the literal). But any board that customizes the doc set — Phase 1's headline feature — loses interactive checkbox editing on its progress doc; users can only see rendered markdown or edit raw text. Phase 1 D5's "fully customizable" contract is half-honored.

## Fix

Thread `progressDoc` from `Editor` (already computed at Editor.tsx:341) into `DocEditor` as a prop, and change the branch at Editor.tsx:872 to `if (doc === progressDoc)`. Rename the CSS class `checklist-view` → `progress-view` at Editor.tsx:877 (and its stylesheet) for the same reason.

## Resolution plan

1. Add `progressDoc: TicketDoc | undefined` to `DocEditor` and pass the already
   resolved value from `Editor` at every render site.
2. Replace the literal branch with `doc === progressDoc`. Keep the existing plain
   Markdown preview when no document is marked progress.
3. Rename only the semantic container class to `progress-view`; checklist item
   classes may remain because they describe Markdown checkbox rows rather than a
   configured document id. Update CSS selectors together.
4. Extract `isProgressDocument(doc, docTypes)` into the renderer's DOM-free lib
   if needed for unit coverage. Test the default `checklist`, renamed `tasks`,
   per-area override, no progress flag and multiple-flag schema rejection.
5. Manually verify toggling a checkbox writes through optimistic document-version
   handling and the tab counter refreshes for the same configured document.

```diff
-<DocEditor id={item.id} doc={tab} ... />
+<DocEditor id={item.id} doc={tab} progressDoc={progressDoc} ... />
...
-if (doc === "checklist") {
+if (doc === progressDoc) {
```

Acceptance: any valid configured progress doc has the same counter, interactive
checkboxes, conflict behavior and persistence as the default checklist.
