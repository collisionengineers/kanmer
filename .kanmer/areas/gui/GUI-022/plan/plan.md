# 3.5 New IPC

- `openRepoDoc(projectId, relPath)` (`shell.openPath(join(root, rel))`), `getRepoDoc(projectId, relPath)` (read for the in-app view), `getGateStatus(projectId, id)` (backs a "Gates" affordance + card badge; core owns the eval). Pattern: `shared/ipc.ts` channel + `main/index.ts` handler + `preload/index.ts` wrapper. (These carry `projectId` in anticipation of Phase 5; single-project until then.)
