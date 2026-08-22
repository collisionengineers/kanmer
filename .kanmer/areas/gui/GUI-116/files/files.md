# GUI-116 files

- `apps/gui/src/main/index.ts`: production `openProject` caller; run provider-owned reconciliation after board-worktree reconciliation, persist native reconnect state, and clear one native requirement after a successful explicit Connect.
- `apps/gui/src/main/settings.ts`: persist the per-project native reconnect requirement across close/reopen.
- `apps/gui/src/main/kanmerGit.ts` and shared IPC types: carry the explicit native reconnect state in project sync status.
- `apps/gui/src/renderer/src/components/Settings.tsx`: render actionable reconnect guidance without claiming automatic native refresh.
- `apps/gui/src/main/index.sync.test.ts`, `apps/gui/src/main/connect.test.ts`, and relevant settings tests: deterministic production-caller coverage for closed reopen, provider-owned reconciliation, native warning persistence/clearing, failure surfacing, and unrelated-project isolation.
- `docs/functional/frd/FRD-020-board-git-worktree-sync.md`: document the retained native reconnect boundary if the existing wording does not cover it.
- `docs/functional/frd/FRD-012-connect.md`: document that native staged branch state is refreshed by explicit reconnect, not implicit project reopen, if needed.
- Existing plugin artifacts and unrelated provider behavior are out of scope unless a deterministic artifact check proves a generated change is required.
