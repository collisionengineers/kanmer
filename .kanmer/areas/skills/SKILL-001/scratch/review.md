# Review — SKILL-001

**Author-reviewed.** Not independent.

## Changes

13 files. `kanmer-import` deleted; `impact-template.md` renamed (content
untouched — SKILL-002); research/plan/review/auto substantively rewritten;
tickets/groom/execute/setup edited narrowly; `move_item`'s description,
`tool-reference.md` and README follow.

## Comments

- **blocking, fixed in branch** — `kanmer-research` referenced
  `assets/files-template.md` before the file existed. Renaming was the minimum
  to keep the reference resolvable without taking SKILL-002's work.
- **non-blocking** — `kanmer-setup` still carries v2 stage names at lines
  112/114, inside the AGENTS managed block. Correct to leave: byte-identity with
  `scripts/agents-block.mjs` is asserted by `verify-agents-block.mjs`, so both
  must change together, and that pair is SKILL-005 in full.
- **non-blocking** — `kanmer-tickets`'s description says "researching a ticket".
  Verb, not stage. Left.
- **non-blocking, filed** — `plugin:check` cannot see tool descriptions. Not new
  and not this ticket's to fix, but it means the green check here is weaker than
  it looks; called out in the report and PR body.

## Disposition

Nothing deferred silently. The three items SKILL-001 explicitly does not cover
(templates, setup reconciliation, AGENTS block) are the tickets it blocks, so
they are already on the board.

## Checked

Report against diff: 13 files listed, 13 changed, rationales match. Governing
docs: ADR-0009 is why the tool description moved with the skills; FRD-023 R1–R3
satisfied. The near-miss on `docs_todo`/`link_doc` was verified against
`create_item`'s schema and `get_doc_gates` output rather than assumed.

**Verdict: pass.** Merged into `v3-phase-minus-1-prework`; the line is now
pushed and under PR #15.
