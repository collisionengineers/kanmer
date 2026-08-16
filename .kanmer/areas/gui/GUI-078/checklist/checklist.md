# Checklist — GUI-078

*The checklist. Not the plan — every line is **independently tickable**; the reasoning lives in the plan.*

- [ ] `demoBoard`: drop `statuses` + `priorities`, add `profiles` + `defaultProfile`
- [ ] `demoItems`: drop `priority`, remap v2 stages to the fixed six, add `profile`
- [ ] `DEMO_DOC_TYPES`: `impact` → `files`, match the v3 type shape
- [ ] The six `board.statuses` call sites → `STAGES` from core
- [ ] `addColumn`: delete the unreachable `statuses` / `priorities` branches
- [ ] `migrate`: return `{ v2, backfill, v3 }`
- [ ] `getFormat`: `3`
- [ ] `getDocsInfo`: add `counts` (derived, not stubbed) and `references`
- [ ] `getDocModel`: full `DocModel`, imported from core
- [ ] `getGateStatus`: empty map + a comment saying why the demo evaluates nothing
- [ ] Sweep for surviving v2 vocabulary the compiler cannot see
- [ ] Verification run: tsc zero errors, no `as any`, `build:ui` emits, `index.d.ts` carries the new shapes (this box produces proof.md)
- [ ] Push, open the PR, record commits/prs

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)
