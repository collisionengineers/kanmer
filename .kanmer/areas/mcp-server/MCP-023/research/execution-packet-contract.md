# Research — MCP-023: bounded execution-packet contract

## Questions

1. What exact data does a weak implementer need in one read?
2. How should readiness follow profiles without recreating a universal document pipeline?
3. How can document indexing compose with MCP-019 rather than create a second document API?

## Findings

### Existing sources

- `get_item`, `get_ticket_doc`, `get_group_doc`, `get_doc_gates`, and `get_status` currently expose the required facts through separate calls in `packages/mcp-server/src/index.ts`.
- `KanmerStore` already provides `getDocWithVersion`, `getTicketDocsInfo`, `groupsForItem`, `getGroupDoc`, and `getDocGates`. It lacks one public method that enumerates every type-relative document path/version.
- Format 3 stores documents recursively by containment. A bare `plan` maps to `plan/plan.md`; extras may be `research/provider.md`, `scratch/review.md`, etc. Sources: `packages/core/src/docpaths.ts` and `store.ts`.
- MCP-019 is intended to add multi-document retrieval to `get_ticket_doc`. Both features need the same batch read/path enumeration. The shared implementation should be a core/store helper, not two independent MCP handler loops.

### Packet content

A ready response must contain:

- MCP-022 project identity/fingerprint.
- Ticket fields: id/title/status/profile/area/groups/refs/body plus occupancy (`taken_at`, assignee, branch, worktree).
- Every group’s id/title and full `context.md` content (nullable when absent). “Summary” means a compact group record, not an LLM-generated or truncated paraphrase; weak agents must receive the authoritative context.
- Index reads for `plan`, `checklist`, and `files`, each with `exists`, `content`, and exact content-version token. All three keys are returned even when a profile does not require the document.
- An `extraDocs` listing for every other Markdown document under ticket folders, including type-relative path and version but not content. This makes additional research/questions/reference-to-doc paths discoverable without flooding the packet.
- The full core `GateReport` unchanged.
- `stopCondition` parsed from the plan’s ATX `Stop condition` section.
- `commandsHint`, parsed from an ATX `Commands` or `Verification commands` section when present, otherwise a safe fixed instruction.

### Readiness semantics

- Profile gates remain the authority. The packet must not demand research/files/checklist for a chore whose resolved profile requires only plan.
- A spike is always refused before any gate assessment because research is its deliverable; it is not an implementation packet.
- The required refusal order is load-bearing:
  1. missing item / non-ticket / legacy layout;
  2. spike;
  3. missing non-question requirements at `leave-preparing`;
  4. unresolved questions;
  5. occupancy by another actor.
- Because `questions-resolved` may be part of `leave-preparing`, stage 3 must build `missing` from unsatisfied requirements other than `questions-resolved`; otherwise the dedicated question refusal is unreachable.
- A refusal is a normal read result, not an MCP protocol/tool error: `{ready:false, code:"GATE_BLOCKED", reason, missing}`. It gives a caller actionable data without representing a failed server operation.
- Occupancy is compared to `actorName` from MCP request/client identity, matching `take_ticket`’s default assignee. A taken ticket with blank/unknown or different assignee is treated as another actor. Same-actor occupancy is allowed. Occupancy refusal uses `missing: []`.
- This tool never takes, moves, initializes, creates a branch/worktree, writes a document, or changes activity.

### Section parsing

- Parse only ATX headings (`#` through `######`) with case-insensitive exact title after trimming optional closing hashes.
- Capture content until the next heading of equal or higher level; nested headings remain part of the section.
- Use exact fallback when no non-empty stop section exists: `Stop at the checklist; do not merge; do not start another ticket.`
- `commandsHint` fallback: `Use only the commands named in the plan/checklist, record exact exit codes, and stop on a failure.`

### Integration and artifacts

- Add one read-only tool row above `## Field semantics` in `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`.
- Tool count rises by one; DOC-011 will record the FRD-022 count/update and link governing refs.
- MCP source change requires plugin rebuild/check from a normal main checkout.

## Decisions

- Add reusable batch/list methods in core/store for both MCP-019 and this tool.
- Return authoritative text, not model-generated summaries.
- Keep refusal precedence deterministic and independently smoke-tested.
- Keep all reads non-mutating, including on a fresh/default root.

## Remaining unknowns

None. MCP-022 must land first so the packet can return the shared project identity and code vocabulary. DOC-011 remains the governing-doc follow-up.
