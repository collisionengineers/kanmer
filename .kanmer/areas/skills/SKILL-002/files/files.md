# Where the change lands

| Path | Change |
|---|---|
| `kanmer-research/assets/files-template.md` | Rewritten — Impact → Files, two tables. Closes the loose end SKILL-001 left. |
| `kanmer-research/assets/research-template.md` | Identity line. |
| `kanmer-research/assets/open-questions-template.md` | Identity line (vs scratch). |
| `kanmer-plan/assets/plan-template.md`, `checklist-template.md` | Identity lines contrasting the pair. |
| `kanmer-execute/assets/post-implementation-report-template.md` | Identity line (vs proof). |
| `kanmer-execute/assets/proof-template.md` | Identity line; point at the per-type variants. |
| `kanmer-execute/assets/proof-visual-template.md`, `proof-test-template.md` | **New** — per proof type (FRD-006). |
| `kanmer-execute/assets/pr-template.md` | Identity line (vs the report). |
| `kanmer-docs/assets/{prd,frd,adr}-template.md` | Identity lines, three-way contrast. |
| `kanmer-tickets/assets/ticket-template.md` | `profile` + `groups`; drop `priority`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/profiles.ts` `DOC_TYPES` | The seven legal types — a template must not imply an eighth. |
| `packages/core/src/gates.ts` (the visual-proof warning) | Why a visual proof template must tell the author to put images under `proof/`: the soft warning fires when none are found. |
| `docs/functional/frd/FRD-014-*.md` | R1 identity lines, R3 the two-section files template. |
