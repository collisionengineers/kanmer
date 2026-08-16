## Scheduler decision — 2026-08-16, HZN-003 auto run

**Answers open question 2 ("Does MCP-012 wait for MCP-010, or ship independently?").
This is the orchestrator's call, as the research doc itself notes. Resolved: MCP-012
WAITS. Sequence MCP-010 first, in the same lane.**

Reasoning, so the planner does not re-open it:

- MCP-010 and MCP-012 both edit `packages/mcp-server/src/root.ts` and
  `packages/mcp-server/src/index.ts`. Concurrent lanes would conflict.
- MCP-010's own body says the resolver must "return the discovered root *and* how
  it was found, so `get_status` can say so". The two tickets are adjacent by
  design, not by accident — MCP-012 is the consumer of the thing MCP-010 produces.
- CORE-023 also edits the `get_status` handler in `index.ts`. It joins the same
  serial lane, last.

**Lane A order is therefore: MCP-010 → MCP-012 → CORE-023 → MCP-007 → MCP-009.**

MCP-012's planner should tick open question 2 citing this note, and plan against
whatever root provenance MCP-010's resolver actually exposes — not against the
fallback. The fallback (report only what today's resolver knows) is not needed:
MCP-010 is ahead of MCP-012 in the same lane and is not slipping past it.

**Open question 1 (may `release.mjs` rebuild the MCP bundle in the release commit?)
is NOT resolved by this note.** It is operator-only — it widens the rule that a
release commit contains only the version bump, and contradicts the deliberate
comment at `release.mjs:151-152`. It has been escalated to the operator and is
still outstanding. Do not proceed past `leave-preparing` on an assumed answer.
