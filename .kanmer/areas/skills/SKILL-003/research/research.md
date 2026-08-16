# kanmer-docs — research

## The stated job

Add the PRD/FRD/ADR decision table and the granularity test. Both already exist,
written in `docs/README.md` during Phase 0.1, so the real question the ticket
poses is **duplicate or point at it**.

## Duplicate, and here is why the obvious answer is wrong

Pointing at `docs/README.md` is the instinct — single source, no drift. It
fails for the case the skill exists to serve: the plugin ships to **other**
repos, where `docs/README.md` does not exist and the table would be a dangling
reference. A skill that only works in the repo that authored it is not a skill.

So the table is duplicated, with the same trade-off the AGENTS block already
makes in this codebase: shipped text must be self-contained, and drift is
managed rather than avoided. Unlike the AGENTS block there is no automated
identity check, and adding one is not this ticket. Stated in the report rather
than hidden.

## Two defects found by reading it against reality

**1. The document paths are wrong, and would be rejected.** The skill says PRDs
live at `docs/prd/NNNN-<slug>.md`. In this repo they are at
`docs/product/prd/PRD-001-<slug>.md`, FRDs at `docs/functional/frd/FRD-002-…`,
ADRs at `docs/architecture/adr/ADR-0009-…`.

Not cosmetic: `assertRefs` rejects a path that does not exist, so an agent
following this skill to link a governing doc gets an error. I hit exactly this
earlier in the session — `refs: ["docs/product/PRD-001-kanmer-v3.md"]` was
rejected and the real path had to be found by listing the tree.

Naming is also wrong twice over: the prefix is part of the filename
(`PRD-001-`, not bare `001-`), and ADRs are **four** digits where PRDs and FRDs
are three.

**2. A bare `impact` reference SKILL-001 missed.** Line 10 lists the pipeline as
"research/impact/plan/checklist/proof". My SKILL-001 exit grep searched for
`impact\.md`, so a mention without the extension slipped through — in
`kanmer-docs` and in `kanmer-tickets`. The grep was too narrow, and a narrow
grep reported clean.

## The granularity test earns its place

`docs/README.md` records that it caught the FRD authoring **in this project** —
it is not a rule imported from elsewhere. That provenance is worth carrying into
the skill, because a rule with a story attached is applied and a rule without
one is skipped.

## `repoDocs` globs must match

`board.docs.repoDocs` classifies a path's kind by glob. If the skill teaches
paths the board's globs do not match, a linked doc is classified as nothing.
The skill's paths and the board's globs have to agree, so both need checking
rather than just fixing the prose.
