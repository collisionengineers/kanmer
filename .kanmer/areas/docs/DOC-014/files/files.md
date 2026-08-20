# Files — DOC-014

## Where the change lands

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-docs/assets/agents-template.md` | New canonical, reusable user-owned AGENTS.md skeleton. It will contain the five required sections, classification guidance, TODO markers, a commands table, and deterministic-first verification checklist. |
| `plugins/kanmer/skills/kanmer-docs/SKILL.md` | Add the authoritative instruction for using the asset: create from it only when a project lacks AGENTS.md; otherwise report required-section gaps and preserve human prose. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Context-only. SKILL-024 will later integrate the template into setup; DOC-014 must not duplicate its managed block or change setup behaviour. |
| `scripts/agents-block.mjs` and `scripts/agents-block-body.mjs` | Context-only ownership boundary: managed markers and Kanmer block stay untouched. |
| `scripts/verify-skill-prose.test.mjs` or a focused static test, if a template-asset contract is already covered there | Verification surface for required headings and the docs-skill reference, without testing user-specific prose. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `plugins/kanmer/skills/kanmer-docs/assets/prd-template.md`, `frd-template.md`, `adr-template.md` | Asset naming, plain Markdown template style, and the expected plugin-owned location. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Exact managed-block boundary and current missing-file stub behaviour the new template must complement. |
| `scripts/agents-block.mjs` | The writer preserves all user-owned prose outside markers; never have the template redefine that code contract. |
| `scripts/agents-block-body.mjs` | The managed Kanmer instructions are a single source and must not be copied into the new asset. |
| `SKILL-024` | Downstream skeleton-reconciliation contract and required five headings. |
| `EPIC-012 context.md` | Batch-level ownership outcome and disposable-repo integration definition of done. |

## Ripple effects

- SKILL-024 can instantiate the new asset and test no-file/partial/complete behaviour without inventing its own template.
- kanmer-docs gains an explicit reference to the asset, making the expected structure discoverable to an agent authoring a project guide.
- A template-only change needs static lint/structure verification and plugin-skill consistency review; it should not change the managed-block writer, shipped MCP bundle, or board data.

## Out of scope

- Implementing skeleton reconciliation in kanmer-setup (SKILL-024).
- Adding conduct canon to the managed block (SKILL-023).
- Editing project-specific AGENTS.md prose or modifying the managed block/writer.
- Repairing the broader stale format-2 `docs/contributing/doc-structure.md` mirror.
