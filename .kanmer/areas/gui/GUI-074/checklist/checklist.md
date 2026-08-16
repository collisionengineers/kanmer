# Checklist — GUI-074

- [ ] Remove the `?` button, its comment, and the `SETTINGS_HELP` map, and the
      `onOpenManual` prop (declaration + destructure) from `Settings.tsx`
- [ ] Remove the `onOpenManual` caller prop from `App.tsx`'s `<Settings ...>`
- [ ] Remove the orphaned `.help-link` rule from `styles.css`
- [ ] Delete the `describe("deep-link targets")` block from `manual.test.ts`
- [ ] Amend FRD-024 R4: remove the Settings-tab `?` clause, state it was
      removed, reference GUI-081 for the unimplemented gate-block clause
- [ ] Verification run: `npm test`, `npm run typecheck`, `npm run
      check:manual` all pass; Settings nav shows only named tabs; F1 and
      Help → Manual sanity-checked as untouched (this box produces proof.md)

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)
