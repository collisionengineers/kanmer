# Research — SKILL-020: make planning and automation gates-first

## Questions

1. Which current sentences force a universal pipeline despite `get_doc_gates` being authoritative?
2. What replacement routing preserves quality without restating per-profile requirements?
3. Which automated prose check can prevent regression without becoming another workflow source of truth?

## Findings

### `kanmer-plan`

- The skill opens correctly: `get_doc_gates <id>` is the only authority and profiles can require different documents.
- Workflow step 1 then contradicts that rule by unconditionally fetching `research` and `files` and instructing: “If either is missing or visibly stale, do the kanmer-research job first … whether or not this ticket's profile happens to gate on them.”
- The introductory sentence also says every plan is written from research and files “never before them”, creating the same universal prerequisite.
- The correct routing is:
  1. read ticket and `get_doc_gates` first;
  2. read research/files only when the resolved `leave-preparing` requirements name them, or when a concrete material uncertainty/file-location hole makes them necessary;
  3. never create documents merely for ceremony.
- “Material hole” must be bounded: missing evidence that would make an implementation step speculative, an unresolved architecture/product choice, or uncertainty about exact affected files/contracts. It does not mean “research may be useful”.
- The current closing hand-off always says hand off to `kanmer-execute`. The adopted workflow requires the default human-facing output to be a short approval paragraph when the plan is user-visible/contested, then execution only after approval. The skill should not dump the whole plan into chat.

### `kanmer-auto`

- Section 1 already says gates are per-ticket and `get_doc_gates` is the routing table.
- Section 2 contradicts it with “Wave 0 — research everything in parallel” and one research subagent per ticket.
- The replacement Wave 0 must call `get_doc_gates` for every roster ticket, classify the next required phase/doc per ticket, and dispatch only that phase. Examples are forbidden because profile-document mappings are board-configurable and the existing verifier correctly rejects restatements.
- A ticket with no preparation document required should not receive speculative research; it advances to its next applicable stage/skill.
- Existing safety remains correct and must survive: drop archived/blocked/other-taken tickets; one gated boundary per move; dependency ordering; overlap-based lanes; cap about three; never use `.worktrees/kanmer`; questions park a lane; exact phase skills perform mechanics.

### Verification rail

- `scripts/verify-skill-prose.mjs` already scans every skill and checks FRD-023 R1, structural invariants, references, roster, and hard rules.
- Add narrow literal/semantic regression checks rather than another profile table:
  - `kanmer-plan` must not contain the known unconditional phrase/claim that research and files are required regardless of gates.
  - `kanmer-auto` must not contain the heading/claim “research everything in parallel”.
  - Both must still mention `get_doc_gates` and the required safety invariants.
- The rail should report file and forbidden phrase clearly. It should not prescribe which documents a profile requires.

### Packaging

- This is a skill-only change plus the repository verifier. Skills are source assets already installed/copied by setup; no MCP tool surface changes.
- The plugin’s bundled MCP file must not be rebuilt. `npm run verify:skills` is the authoritative acceptance command.

## Decisions

- Rewrite only the contradictory routing paragraphs, retaining the rest of each skill’s safety/choreography.
- Make the planner’s input acquisition conditional on gates or a named material hole.
- Make auto Wave 0 a per-ticket gate-routing wave, not a research wave.
- Add targeted regression assertions to `verify-skill-prose.mjs` without encoding profile requirements.

## Remaining unknowns

None. The exact prohibited behaviour and replacement contract are fixed by MASTERPLAN S-08.
