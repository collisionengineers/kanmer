# Files

- `apps/gui/src/main/kanmerGit.ts` — model a retryable failed reconciliation and expose a retry operation.
- `apps/gui/src/main/index.ts` — wire retry/status handling through the project context.
- `apps/gui/src/shared/ipc.ts` and preload/renderer status surfaces — preserve the distinction and retry action where required.
- Relevant GUI tests — prove failure visibility, retry, and idempotence.
