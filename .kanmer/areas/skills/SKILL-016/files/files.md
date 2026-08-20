# Files — SKILL-016

## Modify

| Path | Exact responsibility |
|---|---|
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Add the durable-state lifecycle: require one target group; read status/group/current run before dispatch; create run id and state before work; update after assignments/results and before stops; reconcile live board state on resume; refuse wrong project/other active controller; retain history; define completed/paused/blocked/aborted semantics. Preserve lane cap and board-worktree invariants. |
| `scripts/verify-skills.mjs` | Add structural assertions for the new required durable-state headings/paths/template references if this is the canonical skill validator. Do not duplicate an existing prose validator. |
| `scripts/verify-skill-prose.mjs` | If SKILL-020 introduces this canonical prose rail, add assertions that `kanmer-auto` names `automation/current.md`, `automation/runs/<run-id>.md`, writes before first dispatch/before stop, and reconciles on resume. |
| `package.json` | Inspect `verify:skills` routing; modify only if the canonical validator is not reached. |

## Add

| Path | Purpose |
|---|---|
| `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md` | Canonical schema-v1 group-document template with YAML frontmatter, selection contract, invariants, ticket ledger, event log, and resume instruction. Use placeholders/instructions that the skill can fill directly. |
| `plugins/kanmer/skills/kanmer-auto/assets/current-run-template.md` | Small pointer template naming run id/path, group/project/controller/status/updated time and exact resume instruction. Add only if keeping the pointer shape inline in `SKILL.md` would risk drift. |

## Inspect / reuse

| Path | Reason |
|---|---|
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Exact `get_status`, `get_group`, `get_group_doc`, `set_group_doc`, `list_items`, `get_item`, `get_links`, `get_doc_gates`, `get_activity`, `take_ticket` contracts. Do not invent filesystem writes. |
| `plugins/kanmer/skills/kanmer-plan/SKILL.md` | Group context and approval behavior; auto run state must link plans, not duplicate them. |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | Ticket take/worktree/no-merge/stop boundaries workers must obey. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | Review hand-off and merge boundary. Auto does not bypass it. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Proof/verification outcomes that can block a run. |
| `plugins/kanmer/skills/kanmer-auto/assets/` | Existing templates/examples. Extend the canonical set; do not retain duplicate state formats. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Governing behavior; add/link the durable-state delta if not already specified by DOC-011. |
| `.kanmer/groups/EPIC-009/context.md` | Compiled-workflow no-merge/weak-agent packet boundaries. |
| `SKILL-017` docs | Stopping and serial-fallback contract consumes this state format; whichever lands second must align. |
| `SKILL-020` docs | Gates-first Wave 0 must run before the durable roster/next-action ledger is written. |

## Exact operational paths

- Target group: supplied `EPIC-*` or `HZN-*` id.
- Pointer: group doc `automation/current.md`.
- Full record: group doc `automation/runs/<run-id>.md`.
- No local `.json`, temp, chat-only, ticket-first, or repository-root run file.

## Required schema-v1 fields

`kind`, `schema`, `run_id`, `group`, `project_fingerprint`, `controller`, `status`, `created_at`, `updated_at`, `lane_limit`, `stop_reason`.

Required body headings: Selection contract; Run invariants; Ticket ledger; Event log; Resume instruction.

## Do not modify

- MCP tool surface or add a run entity/tool.
- Ticket pipeline document types/gates.
- `taken` semantics or force takeover.
- Git branches/worktrees directly from the controller beyond existing skill contracts.
- Review skill to merge automatically.
- Plugin MCP bundle for a skill-only change.
- Historical run documents once a new run starts.
- Store state outside Kanmer group docs.
