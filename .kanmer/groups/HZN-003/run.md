# Auto run — HZN-003

target: **closeout** (every ticket to `done`)
started: 2026-08-16
operator rule: complete every ticket; the only stop is an operator-only question.

Group has 27 tickets, 5 already `done` (GUI-067, GUI-078, SKILL-011, SKILL-012,
SKILL-014). Roster below is the 22 that are open.

## Resume procedure

Before scoping anything, read this file. If it exists and any row is not `done`,
adopt this table rather than re-deriving a roster — re-scoping loses the lane
partition and the operator answers recorded at the bottom.

## Roster

| ticket   | profile | lane | state  | note |
|----------|---------|------|--------|------|
| MCP-010  | feature | A    | todo   | root cause; blocks MCP-011; needs an ADR |
| MCP-011  | fix     | A    | todo   | blocked by MCP-010 |
| MCP-012  | feature | A    | todo   | server identity in get_status |
| MCP-009  | feature | A    | todo   | provider parity audit; large |
| MCP-007  | fix     | A    | todo   | plugin:check refuses worktree bundle |
| GUI-079  | fix     | B    | todo   | connect ownership boundaries |
| GUI-080  | fix     | B    | todo   | skills install never prunes |
| GUI-073  | fix     | B    | todo   | Antigravity mislabelled register-only |
| GUI-065  | fix     | B    | todo   | update status on welcome screen |
| GUI-066  | fix     | B    | todo   | release.mjs verifies every asset |
| GUI-069  | fix     | C    | todo   | Backlog first column; blocks GUI-070 |
| GUI-070  | fix     | C    | todo   | blocked by GUI-069 |
| GUI-071  | fix     | C    | todo   | view tab counts |
| GUI-072  | fix     | C    | todo   | Settings checkbox rows |
| GUI-074  | chore   | C    | todo   | remove "?" manual link |
| MCP-005  | feature | D    | todo   | ship server outside install dir; blocks MCP-008 |
| MCP-008  | feature | D    | todo   | blocked by MCP-005; headless + .mcpb |
| MCP-006  | feature | D    | todo   | update_group MCP tool |
| CORE-023 | feature | D    | todo   | detect stale repo Kanmer |
| SKILL-013| feature | E    | todo   | hard rules into AGENTS.md + skill prose |
| DOC-007  | feature | E    | todo   | rewrite in-app manual; large |
| GUI-068  | chore   | —    | parked | needs a real 0.3.3 release cut + a human at the keyboard + screenshots; no agent can produce `proof:visual` of a dialog nobody has shown |

Lanes are a first cut by subsystem; confirmed against each ticket's `files`
document after wave 0 and corrected here if two lanes collide.

## Awaiting operator

- GUI-068: cannot reach `done` in this run. It requires an update *from* 0.3.2
  *to* a release that does not exist yet, a forced refusal dialog screenshot, and
  respawn timing measured on a live install. Reported, not silently dropped.
