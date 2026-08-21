# Checklist

- [x] view shortcuts are derived from the shared view list (VIEW_IDS in lib/views.ts, the current equivalent of the planned VIEW_LABELS) so the Ctrl+1…9 mapping cannot drift from the rendered tabs
- [x] shared/shortcuts.ts is the manual's binding table; the handler's imperative chain is documented as a remaining limitation, not silently claimed table-driven
- [x] build-manual.mjs emits a bundled TypeScript module
- [x] generated output is committed; the packaged build does not need /docs/
- [x] hand-written getting-started and troubleshooting chapters exist
- [x] the original curated-FRD approach is reconciled: DOC-007 replaced FRD-derived prose with hand-written user chapters; only the shortcuts chapter remains generated
- [x] the shortcuts chapter is generated from the binding table
- [x] Manual.tsx provides the sidebar, chapter body, search filter and matching-line hint
- [x] F1 opens the manual and Escape closes the topmost panel
- [x] Help ▸ Manual is present and sends the renderer menu command
- [x] Settings-tab ? links are withdrawn by GUI-074/GUI-081 and FRD-024 R4; no obsolete contextual affordance is being claimed
- [x] the manual test compares the shortcuts chapter with the binding table in both directions (11 focused tests pass)
- [x] chapter ids are unique and expected; contextual ? targets were withdrawn rather than left as dead links
- [x] npm run check:manual regenerates no diff (manual: up to date, 22 chapters)
- [x] the manual component and generated artifact contain no fetch(, XMLHttpRequest or http(s):// runtime-network tokens (0 matches each); content is bundled
- [x] the @kanmer/ui barrel exports its public UI surface

## Audit disposition

This is a reconciliation of the already-merged implementation, not a new source change. The historical PR remains the implementation record; later DOC-007 rewrote the authored chapters and added the generation guards. No GUI-016, provider, or other ticket scope was changed.

# Closeout checklist

Append to the ticket's checklist.md when closeout starts (set_ticket_doc doc: "checklist", append: true) so cleanup progress is visible on the board.

---

## Closeout — GUI-017

- [ ] PR merge verified (gh pr view --json state,mergedAt)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; git worktree remove .worktrees/gui-017
- [ ] git branch -d gui-017-in-app-manual (-D if squash/rebase-merged)
- [ ] git fetch --prune + git worktree prune
- [ ] take_ticket action: "release"

# Closeout checklist

Append to the ticket's checklist.md when closeout starts (set_ticket_doc doc: "checklist", append: true) so cleanup progress is visible on the board.

---

## Closeout — GUI-017

- [ ] PR merge verified (gh pr view --json state,mergedAt)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; git worktree remove .worktrees/gui-017
- [ ] git branch -d gui-017-in-app-manual (-D if squash/rebase-merged)
- [ ] git fetch --prune + git worktree prune
- [ ] take_ticket action: "release"
