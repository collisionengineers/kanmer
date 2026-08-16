# Checklist — GUI-074

- [x] Remove the `?` button, its comment, and the `SETTINGS_HELP` map, and the
      `onOpenManual` prop (declaration + destructure) from `Settings.tsx`
- [x] Remove the `onOpenManual` caller prop from `App.tsx`'s `<Settings ...>`
- [x] Remove the orphaned `.help-link` rule from `styles.css`
- [x] Delete the `describe("deep-link targets")` block from `manual.test.ts`
- [x] Amend FRD-024 R4: remove the Settings-tab `?` clause, state it was
      removed, reference GUI-081 for the unimplemented gate-block clause
- [x] Verification run: `npm test`, `npm run typecheck`, `npm run
      check:manual` all pass; Settings nav shows only named tabs; F1 and
      Help → Manual sanity-checked as untouched (this box produces proof.md)

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)

## Closeout — GUI-074

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/gui-074`
- [ ] `git branch -d gui-074-remove-manual-link` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
