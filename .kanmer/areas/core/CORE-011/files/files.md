# Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/gates.ts` | `gatedBoundariesCrossed` + the multi-gate check the error is built from. |
| `packages/core/src/store.ts` `moveItem` | Reject the move; stamp `stageEntered` on success. |
| `packages/core/src/types.ts` | `stageEntered?: Record<string, string>` on the item schema + `KEY_ORDER`. |
| `packages/core/src/gates.test.ts` | The profile matrix: which moves stay legal. |
| `packages/core/src/store.test.ts` | Rejection message, and the stamp surviving a round-trip. |
| `docs/functional/frd/FRD-002-requirement-profiles.md` | G2 amendment. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `gates.ts:142` `boundariesCrossed` | Already computes exactly the set to count. Threshold arithmetic: `leave-X` → `idx+1`, `enter-Y` → `idx`. |
| `gates.ts:159` `firstBlocking` | Where `move_item`'s existing error comes from; the new refusal sits beside it, not inside it — a multi-gate move can have every gate satisfied. |
| `profiles.ts` `DEFAULT_PROFILES` | The four shipped profiles, and why counting *stages* would break `chore`. |
| `store.ts` `assertMoveAllowed` | Every rejection runs before `computeOrder`, so a refused move writes nothing. |
| `store.ts` (the `due` removal precedent) | How a field is added/removed across schema, `KEY_ORDER` and passthrough. |
| `kanmerGit.ts:68` | Why the activity log cannot be the history source: it is gitignored. |
