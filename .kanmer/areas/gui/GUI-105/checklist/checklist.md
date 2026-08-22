# Checklist — GUI-105

- [x] Derive per-pipeline-type exact paths from docsInfo.documentPaths without a renderer filesystem scan.
- [x] Exclude scratch, reference, and assets from the pipeline selector.
- [x] Implement deterministic index-first/first-existing/empty-index selection.
- [x] Render accessible nested relative paths under the active document-type tab.
- [x] Guard exact-path switches against losing unsaved edits.
- [x] Reconcile selected paths safely when the ticket or live inventory changes.
- [x] Pass the selected exact path through DocEditor load, save, preview, checkbox, and conflict flows.
- [x] Test named-only research and three documents under one Research tab.
- [x] Test nested duplicate basenames, index preference, and empty-type creation.
- [x] Test exact-path saving, dirty-switch confirmation, and live inventory refresh.
- [x] Confirm scratch, reference, asset, checklist-progress, and conventional index behavior remain intact.
- [x] Run GUI tests, root typecheck, and build with successful exit codes.
- [ ] Visually verify GUI-102's portable-connect research file and record proof inputs. Manual visual proof is unavailable in this execution and remains for independent review/manual validation.
- [x] Summarise the implementation and verification commands for the post-implementation report.

## Progress notes

- 2026-08-21 — Implemented exact document-path inventory selection in the GUI Editor. Core's authoritative TicketDocsInfo.documentPaths remains the only inventory source; selectors group only configured pipeline document types and retain exact paths through load/save/preview/conflict flows.
- 2026-08-21 — Commit d64000dd1d84138a54ff952ed1c80f18d23c8055 on gui-105-document-path-inventory.
- 2026-08-21 — Manual GUI-102 portable-connect visual verification is not available from this headless execution; no visual proof is claimed.

## Done-incomplete audit disposition — 2026-08-22

This audit compared the complete ticket packet, HZN-007 context, FRD-003 reference, current document gates, merged-main proof, checklist, and activity. The ticket remains `Done` with no recorded worktree or branch.

- The only unchecked checklist line is manual visual verification of GUI-102's portable-connect research file. That evidence requires an authorized interactive GUI session unavailable in this headless lane and remains explicitly `INCONCLUSIVE`, not PASS.
- Automated/focused GUI evidence and merged-main proof cover the implemented document-path inventory behavior. No product failure was demonstrated, so no remediation ticket is justified; GUI-096 and MCP-029 remain the related context links.

No source files, checklist checkboxes, or board stage were changed by this audit.
