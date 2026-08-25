# Files

## Change scope

| Path | Change | Risk |
|---|---|---|
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Define retryable versus terminal failed verification and the explicit retirement handoff. | Must never let FAIL enter Done or archive without a named disposition. |
| `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | Add cleanup/recordkeeping path for an archived Verifying failure. | Must preserve proof/evidence and safely handle merged branches. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Give failed verification a deterministic operator-disposition/resume path. | Auto must not independently waive or retire failures. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Add the canonical managed AGENTS rule. | This is the source used by setup; drift would reintroduce the old contract. |
| `AGENTS.md` | Refresh the managed block with the new convention. | Managed text must remain byte-identical to setup's canonical body. |
| `docs/functional/frd/FRD-007-fixed-six-stage-board.md` | Clarify terminal failure uses archive, not a seventh stage or Done. | Preserve fixed-stage semantics. |
| `docs/functional/frd/FRD-015-ticket-and-board-core.md` | Clarify archive is also terminal non-success retirement with preserved status/evidence. | Do not redefine archive as successful completion. |
| `scripts/verify-skill-prose.mjs` | Add regression assertions for the terminal-failure contract. | Tests must check semantics, not incidental wording. |

## Context files

| Path | Why read |
|---|---|
| `packages/core/src/types.ts` | Confirms `archived` already exists and no schema addition is required. |
| `packages/core/src/links.ts` | Archived tickets cease blocking dependants, matching retirement semantics. |
| `apps/gui/src/renderer/src/lib/views.ts` | Archived tickets leave the live board and remain discoverable in Archived. |
| `docs/architecture/adr/ADR-0002-fixed-six-stages.md` | Prohibits adding a seventh failure column. |
| `plugins/kanmer/skills/kanmer-tickets/SKILL.md` | Existing archive-don't-delete convention. |

## Deliberately out of scope

No new stage, ticket field, database/schema change, GUI component, automatic age-based archival, release logic, or mutation of CORE-103 before this workflow fix is merged and verified.
