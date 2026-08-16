# Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/profiles.ts` | `DEFAULT_PROOF_TYPES`; the `:type` / `@env` parse; validation against declared environments. |
| `packages/core/src/gates.ts` | The soft-warning computation, inside the shared report so every surface sees it. |
| `packages/core/src/types.ts` | Board `proofTypes`. |
| `packages/core/src/board.ts` | `resolveProofTypes`, `resolveEnvironments`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/store.ts` `assertDeploymentAgainstBoard` | The existing environment vocabulary `@env` reuses — proof must not invent a second list. |
