# Where the change lands

## Files to change

| Path | Why |
|---|---|
| `packages/core/src/profiles.ts` | **New.** Requirement grammar, the shipped table, the P6 resolution chain, validation. |
| `packages/core/src/gates.ts` | **New.** `evaluateGateReport` — the one answer every surface reads. |
| `packages/core/src/types.ts` | Board `profiles`/`defaultProfile`; area `defaultProfile`; item `profile`/`requires`. |
| `packages/core/src/store.ts` | `gateReport`, `getDocGates`, `assertProfileAgainstBoard`; `assertDocGate` rewritten onto `firstBlocking`. |
| `packages/core/src/frontmatter.ts` | `profile`/`requires` into `KEY_ORDER`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/docs.ts:139-166` | The threshold arithmetic to preserve. |
| `packages/core/src/docs.ts:55-73` | The existing pure resolution chain — profiles slot in as a new link, same shape. |
