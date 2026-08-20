# Research — CORE-029

`AGENTS.md` §4 is hand-authored prose outside the managed block and still states the format-2 seven-stage/configurable-gate model. Current core code instead defines six fixed stages in `packages/core/src/stages.ts`; `store.ts` explicitly records that format 3 has no `assertFinalStageGates` equivalent.

`scripts/verify-skill-prose.mjs` check 2 currently inventories only `plugins/kanmer/skills`, so it cannot catch stage-shaped `researching`/`planning` text in AGENTS.md. The checker’s patterns are already appropriately narrow; include AGENTS.md in the same audited text set rather than broaden its matching behavior.

No user decision or governing-document change is needed; `docs_todo` remains true for this maintenance correction.
