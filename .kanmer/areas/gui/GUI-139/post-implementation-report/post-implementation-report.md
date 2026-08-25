# Post-implementation report — GUI-139

Implemented the bounded persistence fix in `apps/gui/src/main/openaiTunnel.ts` and added a register → persist → restart regression in `openaiTunnel.test.ts`. The reader now accepts the exact disabled/incomplete profile produced by `register`, while profiles with partially populated runnable identity remain invalid. Save, start, initialize, and doctor completeness checks are unchanged.

Attempts: an initial `npm run build:core` from the GUI workspace failed because that workspace has no such script; the focused 13-test suite still passed. The first root typecheck used an inherited linked dependency tree and exposed stale package resolution plus the new narrowing error. After `npm ci`, the narrowing was corrected, root core build passed, focused tests passed 13/13, all-workspace typecheck passed, and `git diff --check` passed. Commit: `8b61a6e8`. No dependency, secret, provider resource, or unrelated file changed.
