# Open questions — MCP-023

All dispatch-readiness decisions are resolved.

- [x] **Does the packet take or move a ticket?** — No. It is read-only and writes nothing.
- [x] **Which documents are mandatory?** — Only the requirements resolved by the ticket’s profile/gates. A chore with plan only can be ready.
- [x] **Can a spike receive an execution packet?** — No. Spike refusal dominates because research is the deliverable.
- [x] **What is the refusal order?** — Non-ticket/legacy → spike → missing non-question leave-preparing requirements → unresolved questions → occupied by another actor.
- [x] **How are unresolved questions kept distinct from missing docs?** — Exclude `questions-resolved` from the stage-3 missing list; evaluate it in stage 4.
- [x] **Is refusal an MCP error?** — No. Return normal data with `ready:false`, `code:"GATE_BLOCKED"`, reason, and missing list.
- [x] **How is occupancy ownership determined?** — Compare the ticket’s assignee/taken state with the same MCP client actor identity used by `take_ticket`. Blank/unknown or different owner refuses; same actor is allowed.
- [x] **Are group contexts summarized by an LLM?** — No. Return compact records containing the authoritative full `context.md` text.
- [x] **Which document contents are inlined?** — Plan, checklist, and files index docs only; extras are path/version listings.
- [x] **How is the stop condition parsed?** — Exact case-insensitive ATX heading, content until equal/higher heading; use the fixed safe fallback when absent/empty.
- [x] **How does this relate to MCP-019?** — Both use one reusable store batch/list helper. Whichever ticket lands first supplies it; neither creates a second document API.
- [x] **Does tool-reference/tool count change?** — Yes, one read-tool row/count; plugin bundle rebuilt. DOC-011 records governing deltas.

## Parked (explicitly deferred)

No questions are parked.
