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

## Where the run is

**Wave 0 (research) launched for 20 tickets**, one subagent each, read-only.
Each moves its ticket `backlog -> preparing` and writes the docs its profile
owes plus `open-questions`.

- **MCP-011 held out of wave 0 on purpose.** It is blocked by MCP-010 and its
  entire design is downstream of the discovery order MCP-010 settles.
  Researching it now would produce a guess. It is researched after MCP-010
  lands, not before.
- **GUI-068 parked** — see Awaiting operator.

Lanes below are a first cut by subsystem. They are re-derived from the `files`
documents once wave 0 returns, and corrected here if two lanes collide.

## Roster

| ticket   | profile | lane | state      | note |
|----------|---------|------|------------|------|
| MCP-010  | feature | A    | researching| root cause; blocks MCP-011; needs an ADR |
| MCP-011  | fix     | A    | held       | blocked by MCP-010; research deferred until it lands |
| MCP-012  | feature | A    | researching| server identity in get_status; overlaps CORE-023 on the get_status handler |
| MCP-009  | feature | A    | researching| provider parity audit; large; may split |
| MCP-007  | fix     | A    | researching| plugin:check refuses worktree bundle |
| GUI-079  | fix     | B    | researching| connect ownership boundaries; amends ADR-0007 |
| GUI-080  | fix     | B    | researching| skills install never prunes a retired skill |
| GUI-073  | fix     | B    | researching| Antigravity mislabelled register-only |
| GUI-065  | fix     | B    | researching| update status on welcome screen |
| GUI-066  | fix     | B    | researching| release.mjs verifies every asset |
| GUI-069  | fix     | C    | researching| Backlog first column; blocks GUI-070 |
| GUI-070  | fix     | C    | researching| blocked by GUI-069; deletes a view FRD-011 governs |
| GUI-071  | fix     | C    | researching| view tab counts; same tab machinery as 069/070 |
| GUI-072  | fix     | C    | researching| Settings checkbox rows; may need visual proof |
| GUI-074  | chore   | C    | researching| remove "?" manual link; may conflict with DOC-007 |
| MCP-005  | feature | D    | researching| ship server outside install dir; blocks MCP-008; needs an ADR |
| MCP-008  | feature | D    | researching| blocked by MCP-005; headless + .mcpb |
| MCP-006  | feature | D    | researching| update_group MCP tool |
| CORE-023 | feature | D    | researching| stale repo; overlaps MCP-012 on the get_status handler |
| SKILL-013| feature | E    | researching| hard rules into AGENTS.md + skill prose |
| DOC-007  | feature | E    | researching| rewrite in-app manual; large; may split |
| GUI-068  | chore   | —    | parked     | see below |

## Known file collisions to respect when lanes are finalised

- **MCP-012 and CORE-023** both change the `get_status` handler in
  `packages/mcp-server/src/index.ts`. Same lane, serial — they are currently in
  different lanes (A and D) and that must be corrected once their `files` docs
  confirm it.
- **GUI-069 / GUI-070 / GUI-071** all touch the renderer's tab-and-view
  machinery. Same lane, serial, in that order.
- **GUI-074 and DOC-007** both touch the in-app manual. GUI-074 removes the only
  nav link to it; DOC-007 rewrites its content. If GUI-074 makes the manual
  unreachable this is a real conflict, not a sequencing detail.

## Awaiting operator

- **GUI-068 — cannot reach `done` in this run.** It requires an update *from*
  0.3.2 *to* a release that does not exist yet, a forced refusal dialog
  screenshotted by a human, and respawn timing measured on a live install.
  No agent can produce that evidence. Reported, not silently dropped.
