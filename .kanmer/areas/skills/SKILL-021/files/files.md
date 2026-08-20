# Files — SKILL-021

## Modify

| Path | Exact responsibility |
|---|---|
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | Make orientation/status followed by `get_execution_packet` the first ticket-data path; stop on refusal; explain capability sniffing before `expected_project`; use packet stop condition/commands; preserve exact per-ticket worktree/take/checklist/report/PR flow; state execute never merges or starts another ticket. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | Replace append-only prose review with versioned whole-file `scratch/review` attestation; capture `headRefOid`, plan version, ticket timestamp; gather GitHub checks/comments/reviews/unresolved threads; disposition every finding; re-check head/checks before authorized merge; stop on stale/red/pending/open findings; preserve one-stage move to Verifying after merge. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Replace mutable-main verification with detached exact merged-SHA worktree; stop when unmerged; read/write versioned proof record, retain all attempts, require top-level PASS before Done; never mutate main or board worktree; clean/report temporary worktree. |
| `scripts/verify-skill-prose.mjs` | Modify only if needed to add narrow positive/negative rails for the new exact contracts: execute mentions packet and never-merge; verify uses detached merge SHA and does not instruct pull/update main; review does not use `append_scratch` for attestation. Do not restate record/profile schemas. |

## Dependency sources to inspect and consume

| Path / ticket | Why |
|---|---|
| MCP-023 `plan`, `research`, and eventual `get_execution_packet` tool/reference | Defines ready/refused response, project field, stop condition, commands hint, and same-actor occupancy. Skills must consume, not reconstruct, readiness. |
| MCP-024 `research`, `plan`, and canonical tool reference | Defines exact review/proof frontmatter, whole-file replacement, plan hash, attempt retention, and advisory gate semantics. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Canonical MCP paths/record schemas after MCP-023/MCP-024. Link to it from prose rather than creating another asset/spec. |
| `packages/mcp-server/src/index.ts` | Final tool capability names and `get_status.compat.expectedProject` spelling after dependencies land. Inspect before editing skill prose. |
| `docs/functional/frd/FRD-006-typed-proof.md` | DOC-011 will update exact-SHA proof semantics; do not edit here. |
| `docs/functional/frd/FRD-010-task-scoped-dispatch.md` | Packet as dispatch enablement; DOC-011 owns delta. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Skills derive from tools/gates; keep prose procedural, not a second workflow definition. |
| `.kanmer/groups/EPIC-009/context.md` | Bounded weak-agent execution, SHA-bound review/proof, no leases/new stages. |
| `MASTERPLAN.md` S-09 / Appendix A | Exact call/Git choreography and stopping contract. |

## GitHub data fields the review/verify prose must name

- Review head: `gh pr view <pr> --json headRefOid`
- Review state/checks: `gh pr view <pr> --json state,reviewDecision,statusCheckRollup,headRefOid`
- PR diff: `gh pr diff <pr>`
- Reviews/comments: `gh pr view <pr> --json reviews,comments`; unresolved review threads may require `gh api graphql` because standard fields do not expose thread resolution reliably.
- Merge commit: `gh pr view <pr> --json state,mergeCommit`

The skill must say to use the available GitHub query that returns unresolved threads and to record the exact command/result; it must not claim `comments` alone proves thread resolution.

## Ripple effects

- SKILL-020 makes plan/auto gate-derived; execute now receives the compiled packet produced from that preparation.
- CORE-025 later reads review frontmatter; spelling, whole-file replacement, current head, and plan hash are compatibility boundaries.
- CORE-035 walks all new phase paths end-to-end.
- Existing old-server compatibility requires omitting `expected_project` unless `get_status.compat.expectedProject` advertises it.
- Skill installation copies source trees; no plugin MCP bundle rebuild is needed.

## Do not modify

- MCP/core/GUI code, packet/record schemas, profiles, board config, or tool reference.
- Review’s four old `pr-*` assets; SKILL-015 explicitly owns their later deletion.
- Execute report/PR templates unless a directly contradictory instruction makes the skill unusable; prefer correcting SKILL.md only.
- Add automatic merge, main checkout updates, leases, new stages, role servers, or content gates.
