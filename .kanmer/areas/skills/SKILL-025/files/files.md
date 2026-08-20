# Files — SKILL-025

## Where the change lands

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-plan/SKILL.md` | Add the planner-facing selection rule: after shared plan/checklist input is understood, copy zero or more matching optional overlays into the brief; never infer or enforce a work type. |
| `plugins/kanmer/skills/kanmer-plan/assets/brief-fix.md` | Reproduction, root cause, regression boundary, and a negative test prompt. |
| `plugins/kanmer/skills/kanmer-plan/assets/brief-ui-ux.md` | State coverage, keyboard/accessibility, responsive constraints, visual proof, and no-unrelated-redesign boundary. |
| `plugins/kanmer/skills/kanmer-plan/assets/brief-docs.md` | Audience, source of truth, changed claims, executed examples, and version sensitivity. |
| `plugins/kanmer/skills/kanmer-plan/assets/brief-cloud-infra.md` | Tenant/subscription/environment, least privilege, IaC diff, plan/dry-run, cost, rollback, and no-secrets prompts. |
| `plugins/kanmer/skills/kanmer-plan/assets/brief-data-migration.md` | Up/down, backfill, runtime-role permission test, grants in the diff, and rollback/data-loss prompts. |
| `scripts/verify-skill-prose.mjs` | Add a small file/presence assertion for the five assets and the optional/manual selector wording, keeping verification dependency-free. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `MASTERPLAN.md` S-30 | Exact five overlays, their required coverage, rationale, and the “templates, never engines” constraint. |
| `plugins/kanmer/skills/kanmer-plan/assets/plan-template.md` | The shared base brief remains authoritative; overlays supplement rather than replace it. |
| `plugins/kanmer/skills/kanmer-plan/assets/checklist-template.md` | The executable checklist stays separate from planning prompts. |
| `scripts/verify-skill-prose.mjs` | Existing portable pattern for auditable skill-tree checks. |
| `EPIC-012` context | This is a scoped part of AGENTS ownership/domain coverage; integration proof stays with SKILL-026. |

## Ripple effects

- Installed planner skills receive the new assets when the normal plugin bundle is rebuilt by the implementation/release workflow.
- A ticket may use multiple overlays (for example, a data migration in cloud infrastructure) or none when the shared brief is enough.
- `kanmer-plan` prose must continue to defer gates to `get_doc_gates`; overlays are not per-profile requirements.

## Out of scope

- Automatic work-type classification, frontmatter fields, profile changes, new gates, or a template execution engine.
- Editing other skills, AGENTS.md, MCP tools, core types, or the plugin bundle in this ticket.
- End-to-end integration proof, owned by SKILL-026.
