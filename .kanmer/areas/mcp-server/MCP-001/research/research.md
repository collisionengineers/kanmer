# The v3 tool surface — research

The agent-facing contract has three layers that can disagree: what the server
enforces, what the tool descriptions say, and what the skills say. ADR-0009
orders them — enforcement first, descriptions second, skills last — because
skills are on-demand, permission-gated, install-time copies of prose.

Profiles make this urgent rather than tidy. A skill saying "write research and
impact before leaving Researching" was merely stale under v2; under v3 it is
*per-ticket wrong*, since a chore owes a plan and a spike owes research only.
Prose cannot encode a rule that varies by ticket. A call can.

So the surface has to make the right thing easy: `get_doc_gates` returns the
whole answer — every boundary, what is satisfied, warnings, and reachability —
so no caller has to assemble it, and its description says outright that
requirements vary by profile.

The counting: 24 tools today, 29 at end state. Five group tools in; nothing
removed, because the column tools survive with a narrowed `kind`.
