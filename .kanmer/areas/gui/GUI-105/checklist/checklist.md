# Checklist — GUI-105

- [ ] Derive per-pipeline-type exact paths from docsInfo.documentPaths without a renderer filesystem scan.
- [ ] Exclude scratch, reference, and assets from the pipeline selector.
- [ ] Implement deterministic index-first/first-existing/empty-index selection.
- [ ] Render accessible nested relative paths under the active document-type tab.
- [ ] Guard exact-path switches against losing unsaved edits.
- [ ] Reconcile selected paths safely when the ticket or live inventory changes.
- [ ] Pass the selected exact path through DocEditor load, save, preview, checkbox, and conflict flows.
- [ ] Test named-only research and three documents under one Research tab.
- [ ] Test nested duplicate basenames, index preference, and empty-type creation.
- [ ] Test exact-path saving, dirty-switch confirmation, and live inventory refresh.
- [ ] Confirm scratch, reference, asset, checklist-progress, and conventional index behavior remain intact.
- [ ] Run GUI tests, root typecheck, and build with successful exit codes.
- [ ] Visually verify GUI-102's portable-connect research file and record proof inputs.
- [ ] Summarise the implementation and verification commands for the post-implementation report.

## Progress notes
