# Where the change lands

| Path | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-import/` | **Deleted** (13 → 12). |
| `.../kanmer-research/SKILL.md` | Stages; `impact.md` → `files/`; gate prose → `get_doc_gates`. |
| `.../kanmer-plan/SKILL.md` | Same, plus the description line. |
| `.../kanmer-review/SKILL.md` | 4-doc set → scratch; drop the `kanmer-import` delegation. |
| `.../kanmer-auto/SKILL.md` | Wave partitioning off `files/`; profile-aware. |
| `.../kanmer-tickets/SKILL.md` | Priority ids; the skills table (12 rows). |
| `.../kanmer-groom/SKILL.md` | Priority triage; description line. |
| `.../kanmer-report/SKILL.md` | Stage names. |
| `.../kanmer-docs/SKILL.md` | Stage reference only. |
| `.../kanmer-execute/SKILL.md`, `kanmer-verify`, `kanmer-closeout` | Cross-refs; already clean otherwise. |
| `.../kanmer-setup/SKILL.md` | Stage list and priority only — reconciliation is SKILL-004, the AGENTS block SKILL-005. |
| `packages/mcp-server/src/index.ts` | `move_item` description: the one-gated-boundary rule. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Follows the description change (release rail). |
| `README.md` | Skills table → 12. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/profiles.ts` `DOC_TYPES` | The seven legal document ids — the authority for what a skill may name. |
| `packages/core/src/migrate.ts` `DOC_MOVES` | `impact.md` → `files/impact.md`, so "impact" survives as a filename inside `files/`, not as a type. |
| `docs/architecture/adr/ADR-0009-...md` | Why the tool description outranks the skill, and so must be fixed in the same sweep. |
| `scripts/check-plugin-sync.mjs:39-45` | Compares tool **names** and bundle bytes only — a changed description is invisible to it, so `plugin:check` passing proves nothing here. |
| `scripts/agents-block.mjs` | Holds the block body duplicated in `kanmer-setup`; `verify-agents-block.mjs` asserts they match. Do not touch either — SKILL-005. |
