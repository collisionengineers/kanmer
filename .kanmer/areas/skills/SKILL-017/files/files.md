# Files — SKILL-017

## Modify

| Path | Exact responsibility |
|---|---|
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Replace contradictory/unbounded stopping language; define controller reconciliation after every result; enumerate mandatory stop predicates; distinguish worker end, ticket target, and run completion; define persisted stop hand-off; make serial fallback the same algorithm with `lane_limit: 1`; preserve independent review/verification boundaries and forbid force takeover/self-approval. |
| `scripts/verify-skills.mjs` | Add structural assertions for required stop/serial sections and forbidden contradictory phrases if this is the canonical validator. |
| `scripts/verify-skill-prose.mjs` | Extend SKILL-020's prose rail with invariants: no “continue until all done” without predicate, no universal parallel requirement, serial=`lane_limit: 1`, no self-review/force, stop at execution brief Stop condition, persist before stop. |
| `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md` | Align status/stop reason/resume instruction/ticket dispositions with SKILL-016. Modify only after SKILL-016 lands; do not fork the template. |
| `package.json` | Confirm `verify:skills` reaches the prose/structural checks; modify only if routing is absent. |

## Inspect / align

| Path | Reason |
|---|---|
| `plugins/kanmer/skills/kanmer-plan/SKILL.md` | Approval and brief Stop condition; auto must not advance beyond it without controller reconciliation. |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | No-merge, packet, worktree, and execution stop contract. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | Independent review/attestation/check handling and merge boundary. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Exact merge-SHA and proof outcomes. |
| `plugins/kanmer/skills/kanmer-research/SKILL.md` | Stop/escalation treatment for unanswered research questions. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Exact gates/taken/activity/group-doc tool semantics and `force` behavior. |
| `plugins/kanmer/skills/kanmer-auto/assets/` | Existing diagrams/examples must not retain contradictory stop/fallback prose. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Governing auto/role behavior. Update only where the approved delta is absent. |
| `.kanmer/groups/EPIC-009/context.md` | Compiled workflow and weak-agent/no-bypass scope. |
| `SKILL-016` plan/templates | Durable state paths/statuses/cadence are prerequisites and must remain one schema. |
| `SKILL-020` plan | Gates-first Wave 0 and lane cap. |
| `SKILL-021` plan | Packet, SHA record, exact-SHA verification behavior. |

## Exact sections required in `kanmer-auto/SKILL.md`

1. Orientation and durable-state resume.
2. Roster and gates-first readiness.
3. Lane assignment.
4. Result reconciliation.
5. Mandatory stop predicates.
6. Persisted stop/hand-off format.
7. Serial fallback (`lane_limit: 1`).
8. Role-independence boundaries.
9. Completion definition.
10. Failure/retry rules.

## Forbidden or corrected patterns

- “Continue until every ticket is done” without live target predicates and stop conditions.
- “If subagents are unavailable, do all roles yourself.”
- Automatic force takeover.
- Automatic retries of failed tests/commands.
- Starting another ticket before uncertain worker status is resolved.
- Treating worker final text as stage/proof completion.
- Self-approving implementation where independent review is required.
- Marking complete while tickets are waiting/blocked/short of target.

## Do not modify

- MCP tool surface, stage/profile/gate model, `taken`/force semantics, or GitHub protection.
- Execute/review/verify skills to weaken their boundaries.
- The durable state schema independently of SKILL-016.
- Plugin MCP bundle for skill-only changes.
- Add retries/sleeps/implicit waivers.
