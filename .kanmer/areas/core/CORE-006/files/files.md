# Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/types.ts` | `priority` off the item schema; `DEFAULT_PRIORITIES` and board `priorities` retired (kept optional on read). |
| `packages/core/src/frontmatter.ts` | `priority` out of `KEY_ORDER`. |
| `packages/core/src/store.ts` | `defaultPriority` deleted; filters and validation drop it. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/store.test.ts` (the `due` case) | The exact precedent: passthrough keeps a hand-added key, no filter reads it, clean writes omit it. |
