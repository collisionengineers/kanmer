# Parked — not building this

Decided 2026-08-16, after research, before planning.

## Why

The rule would not have caught the failure that motivated it. Working GUI-005
this session: ticket moved to Preparing, research written, then code edited **in
the main checkout**, then files/plan/checklist written, then the worktree and
branch created. Code before plan — and the branch did not exist at the time, so
the check never fires.

It catches only an agent that commits to the *ticket branch* before planning. It
misses work in the main checkout, uncommitted work, a stub plan written early,
and a real plan written first and then ignored.

Against that: the first subprocess in `@kanmer/core` (which is bundled into the
shipped MCP server), two git spawns per GUI drag, a behaviour change to
`take_ticket`, an exemption rule for the rework loop, and a new ADR.

CORE-011 already prevents the collapsed `backlog → done` move, which was the
real problem and which it does solve.

## What the research is still worth

It answers FRD-002 G2a properly, so neither approach gets re-proposed:

- **The timestamp rule cannot work.** `setDoc` records no time; `syncBoard`
  commits the whole board in one commit per sync, so documents written between
  syncs share a stamp; mtimes do not survive a clone.
- **The branch rule can work but is aimed wrong.** The correct formulation is
  commits unique to the branch (`rev-list --count <branch> --not <other refs>`),
  base-free and measured across seven scenarios — the ticket's original
  `rev-list --count <branch>` returns 147 on a fresh branch and would refuse
  every move. It still misses the case above.
- **No gate can prove causation, only sequence.** A plan written first and then
  ignored passes anything mechanical. Review catches that or nothing does.

## Left open

`docs/functional/frd/FRD-002-requirement-profiles.md:29` still presents the
timestamp comparison as the open design question. That is now known-wrong and
will mislead whoever reads it next. Not amended — flagged to the user.
