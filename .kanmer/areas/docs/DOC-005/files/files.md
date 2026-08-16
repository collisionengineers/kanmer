# Where the change lands

| Path | Change |
|---|---|
| `AGENTS.md` | The operating rule, **outside** the managed block. |
| `docs/README.md` | The same rule with reasoning and the honest evidence note. |
| `scripts/release-notes.mjs` | **New** — tickets Done since the last tag (the stretch). |
| `package.json` | `release:notes`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `scripts/agents-block.mjs`, `verify-agents-block.mjs` | The managed block is byte-checked; the rule must live outside the markers or `verify:agents-block` fails. |
| `packages/core/src/types.ts` `stageEntered` | Committed per-stage timestamps — what makes "Done since the last tag" answerable from the board. |
| `scripts/release.mjs` | The existing release path the notes script complements. |
| `docs/README.md` | Already holds the doc decision table; the contributor-facing half belongs beside it. |
