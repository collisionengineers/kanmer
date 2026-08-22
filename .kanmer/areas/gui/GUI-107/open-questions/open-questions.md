# Open questions — GUI-107

All implementation-shaping questions are resolved below. The only unavailable evidence is parked explicitly.

- [x] Which model should the form submit? Use the existing requires: Record<string, string[]> field on CreateItemInput/UpdateItemPatch; do not add IPC or core fields.
- [x] Which vocabulary should validation use? Use the resolved doc model (doc types, boundaries, proof types) and board-declared deployment environments; reuse the existing renderer parser/validator mirror.
- [x] When should the editor be visible? Only when the selected profile is custom; non-custom submissions omit requires while the local draft may remain retained if the user switches back.
- [x] What belongs to GUI-007? Nothing: Settings profile editing, board profile vocabulary, and core gate semantics remain unchanged.

## Parked (explicitly deferred)

- [ ] Live Electron visual/manual proof is unavailable in this controlled run; deterministic component tests and callback/model assertions will be recorded, and a real-window screenshot/interaction check is deferred to independent verification.
