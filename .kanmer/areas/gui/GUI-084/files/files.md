# Files — GUI-084

| Path | Status / role |
|---|---|
| `apps/gui/src/main/index.ts` | Existing notification creation already receives the owning ticket id through `classifyKanmerPath`; only a Windows-specific custom XML option would change it. |
| `apps/gui/src/shared/kanmerPath.ts` | Existing doc-name-agnostic ticket attribution; no change currently needed. |
| `apps/gui/src/renderer/src/lib/kanmerPath.test.ts` | Existing coverage for document and scratch attribution. |
| `docs/functional/frd/FRD-018-live-sync-and-notifications.md` | Requires native OS notifications while unfocused; an in-app replacement needs an FRD decision. |
| `apps/gui/src/main/*test*` | Would need new Windows template/click tests only if the Windows-only route is chosen. |
