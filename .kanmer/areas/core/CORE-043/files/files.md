# CORE-043 files map

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Add the protected default branch constant and fail-closed refusal before `branch -m` when renaming `kanmer-board`; keep custom-branch push-before-delete behavior. | Prevents a protected board from becoming live under an unprotected name. |
| `apps/gui/src/main/index.ts` | Apply branch migration before persisting a changed branch for open contexts, retaining the prior setting when the bounded refusal fires. | Avoids stale expected-branch configuration after a refused migration. |
| `apps/gui/src/main/kanmerGit.test.ts` | Add real-Git no-mutation refusal coverage and retain history/remote coverage using a custom source branch that represents protection already retargeted. | Tests the safety boundary without weakening existing assertions. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | Explain the protected-default precondition beside the rename control. | Makes the required operator handoff visible. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Replace the stale “rename is automatic” target with the protected-branch precondition and bounded supported flow. | Keeps governing requirements aligned with the implementation. |
| `docs/manual/board-sync.md`, `docs/manual/settings.md` | Document the retarget-first sequence and refusal behavior. | Prevents users from assuming Kanmer can edit GitHub protection. |
| generated manual artifact | Regenerate with `npm run build:manual`. | Keeps the shipped manual in sync with authored chapters. |

No package, dependency, GitHub API, workflow, or CORE-046 change is planned.
