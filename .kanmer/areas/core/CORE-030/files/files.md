# Files and impact — CORE-030

| Path | Role | Planned change |
| --- | --- | --- |
| `packages/core/src/staleness.ts` | Defines `SKILL_DESTINATIONS` and creates staleness rows | Remove the unowned `.claude/skills` entry and update the ownership comment to name only destinations written by copy-skills providers. |
| `packages/core/src/staleness.test.ts` | Regression coverage for repository staleness | Move positive copied-skill fixtures to an owned destination; add negative coverage proving a handmade Claude mirror, including foreign skills, yields no skills/stamp rows. |
| `apps/gui/src/main/providers.ts` | Authoritative evidence for provider installation modes | Read-only context: confirms Claude is marketplace-only and identifies the real copied destinations. |
| `apps/gui/src/main/connect.ts` | Authoritative evidence for reconcile/stamp behavior | Read-only context: confirms marketplace install never reconciles `.claude/skills`. |
| [[GUI-090]] | Provider-to-core destination-list inversion | Explicitly out of scope; retain as follow-up ownership work. |
| `docs/functional/frd/FRD-013-setup-as-reconciliation.md` | Governing setup/reconciliation contract | No document edit planned; the change makes detection-only staleness results actionable for the destinations it reports. |

## Ripple and risk

The public `get_status.repo.stale` shape does not change. A repository that previously showed false Claude skills/stamp rows will stop showing them; real copied-skill destinations keep their existing content-hash and stamp checks. The remaining destination list is still duplicated until [[GUI-090]] lands, so the implementation must keep its comment accurate and avoid silently expanding into GUI work.

## Out of scope

- Writing, migrating, deleting, or stamping `.claude/skills`.
- Changing Claude/Codex marketplace installation.
- Refactoring GUI providers to consume the core roster.
- Altering the general policy that staleness only detects and points users to reconciliation.
