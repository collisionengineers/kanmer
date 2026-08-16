# Where the change lands

| Path | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-docs/SKILL.md` | Decision table, granularity test, corrected paths, `impact` → `files`. |
| `plugins/kanmer/skills/kanmer-tickets/SKILL.md` | The other bare `impact` SKILL-001's grep missed. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/README.md:22-32` | The canonical table and granularity test, and the provenance line saying the test caught this project's own FRDs. |
| `docs/product/prd/`, `docs/functional/frd/`, `docs/architecture/adr/` | The real paths and the real filename shape — prefix included, ADRs four digits. |
| `packages/core/src/store.ts` `assertRefs` | Why a wrong path is a hard failure, not a cosmetic error. |
| `packages/core/src/docs.ts` `repoDocKindOf` | The globs that classify a linked doc; the skill must teach paths these match. |
