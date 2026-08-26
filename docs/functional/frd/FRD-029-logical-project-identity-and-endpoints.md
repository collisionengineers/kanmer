---
status: draft
---

# FRD-029 — Logical project identity and named endpoints

**Implements:** PRD-002 requirement 2.

## Behaviour

Each board stores a stable logical `project_id` and, when distinct, `board_id`.
Kanmer records a separate local location fingerprint containing repository path,
board path, machine identity, board branch and remote origin. The same logical
project checked out at different paths or on different machines retains its
logical identity while its local fingerprint differs.

Every MCP response identifies the logical project. Every mutation carries the
expected logical project identity and a revision or equivalent compare-and-swap
token. A wrong endpoint refuses with `WRONG_PROJECT`; a stale write refuses with
`REVISION_CONFLICT`. A request cannot select an arbitrary project path.

One MCP process remains bound to one project. A registry may name several
project-bound endpoints and report their source/board locations, policy, health,
sync status, controllers and workspaces. Cross-project registry operations are
observational until an operator explicitly scopes a mutation to one named
project. The GUI presents the same selected-project boundary rather than a
second global board.

## Acceptance criteria

1. Copied checkouts of one board retain `project_id` and differ only in their
   local location fingerprint.
2. Every response and mutation exposes or verifies logical project identity;
   an incorrect expected identity is refused before mutation.
3. Stale mutation tokens return `REVISION_CONFLICT` without overwriting the
   current board state.
4. Two named project fixtures can be observed through their own endpoints, and
   an attempted cross-project mutation is refused structurally.
5. No endpoint accepts an arbitrary path supplied by an MCP request.

## Edge cases

- A legacy board receives a one-time identity migration with an auditable
  fallback; it does not retain two permanent identity models.
- A missing or changed remote origin is reported as location evidence and does
  not silently reassign the logical project.
