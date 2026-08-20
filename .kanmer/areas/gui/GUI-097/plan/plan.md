# Plan — GUI-097: Approval / Execution / Review / Evidence editor modes

## Objective

Add an ephemeral four-mode editor presentation that chooses the initial surface for each audience while keeping every existing tab visible, available, and backed by the same files.

## Starting state

- Editor always initializes to Ticket.
- GUI-096 supplies Scratch and group context.
- App selection carries only item ID and dispatch opens no audience-specific editor context.

## Governing docs

- **FRD-019:** local mode enum and starting-tab behavior; DOC-011 owns the formal delta.
- **EPIC-009 / MASTERPLAN S-12:** four exact mappings, Approval default, Execution dispatch entry, dim-never-hide, no fourth view.

## Required changes

1. Wait for GUI-096 to merge; rebase and inspect its final tab union/Scratch implementation.
2. Export `EditorMode = "approval" | "execution" | "review" | "evidence"` and a pure `startingTabForMode` mapping exactly:
   - approval → ticket
   - execution → plan
   - review → scratch
   - evidence → proof.
3. Add mode metadata labels/descriptions in one array; do not scatter strings.
4. Add required `mode` or defaulted `mode="approval"` Editor prop.
5. Initialize local tab from `startingTabForMode(mode)` on component creation.
6. Track the last applied `{item.id, mode}`. Reapply only when item ID changes or caller intentionally changes mode; do not reapply on `item.updated`, docs info, gates, or change signal.
7. Route mode changes through `tryTab` so dirty document text triggers the existing discard confirmation. Apply the new mode only after confirmation succeeds; cancelling retains prior mode/tab.
8. Add compact accessible mode control in editor header (`aria-label="Editor mode"`) with four options. Selected mode communicates audience, not workflow status.
9. Give every tab a `mode-primary` or `mode-secondary` class based on mapping. Secondary tabs remain rendered, focusable, clickable, and carry no disabled/hidden attributes.
10. Add CSS that reduces visual emphasis without lowering contrast below readable/focus standards; active user-selected tab remains visually active even when not the mode primary.
11. Ensure Approval shows Ticket body plus GUI-096 context pane; Review selects Scratch container; missing scratch/proof/plan uses existing empty state.
12. In App, replace `selectedId` opening behavior with a helper such as `openEditor(id, mode = "approval")` and ephemeral `editorMode` state.
13. All existing ordinary paths—card click/Open, wiki navigation, activity/dispatch drawer ticket link, create-and-select, session restore—call Approval/default.
14. Dispatch context actions call `openEditor(item.id,"execution")` before/alongside `dispatchAgent`; do not dispatch twice or change option eligibility.
15. Preserve dirty-editor navigation guard: pending selection must retain requested mode and apply it only after discard confirmation.
16. When closing editor/project or switching selected ticket, reset mode to Approval for the next ordinary open.
17. Keep persisted tab/session schema unchanged where possible. If saved state contains selected ID only, restore selected ID plus local Approval.
18. Add/extend tests:
   - pure mapping returns four exact tabs;
   - initial Editor render selects correct tab per mode;
   - absent plan/scratch/proof still selects correct empty surface;
   - all Ticket/Scratch/pipeline tabs remain in DOM and enabled;
   - non-primary class/dimming is applied, not hiding;
   - explicit mode switch selects target;
   - dirty switch asks confirmation and cancel/confirm behave correctly;
   - item refresh does not reset a manually selected tab;
   - new item/mode request does reset to mapped tab;
   - App ordinary open passes Approval and dispatch passes Execution;
   - session restore defaults Approval.
19. Run GUI tests/typecheck and root verification.
20. Capture screenshots of all modes on one representative ticket, showing all tabs present.
21. Confirm no IPC/core/MCP/schema/gate/stage/view/dispatch-eligibility/package/lock change.
22. Open PR with `Kanmer: GUI-097` and keep `docs_todo` until DOC-011 links FRD-019.

## Expected files

- `apps/gui/src/renderer/src/components/Editor.tsx`
- `apps/gui/src/renderer/src/App.tsx`
- `apps/gui/src/renderer/src/components/Editor.test.tsx`
- `apps/gui/src/renderer/src/styles.css`
- session helper/test only if required by existing selected-ID typing

## Do not modify

Core/MCP/IPC, ticket/board persistence, stages/gates, view roster, doc types, dispatch feasibility/provider logic, plugin/manual/package/lock files.

## Acceptance checks

- Exact mode mapping and Approval default are deterministic.
- Dispatch can open Execution without changing workflow semantics.
- Mode is local, applies only at open/explicit change, and never fights user tab choice.
- Every tab remains visible, focusable, and clickable; only emphasis changes.
- Dirty-state protection and empty states work in every mode.
- Tests and screenshots cover all four modes; existing editor behavior remains green.

## Commands

```bash
npm test --workspace @kanmer/gui
npm run typecheck --workspace @kanmer/gui
npm run verify
git diff --check
git status --short
```

## Failure and deviation rules

- Do not infer/persist mode from stage, hide/disable tabs, reset on refresh, or add a view/API/schema.
- Do not overwrite GUI-096 Scratch/context behavior or bypass dirty guards.
- A request for automatic stage-based mode switching is follow-up scope.
- Do not merge or start another ticket.

## Stop condition

Stop when all four entry modes select the exact starting surfaces, ordinary opens default Approval, dispatch can pass Execution, every other tab remains visibly usable, mode changes respect dirty text, GUI/root verification and screenshots pass, and the PR is ready for independent review. Do not merge.
