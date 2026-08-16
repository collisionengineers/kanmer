# kanmer-docs — research

## The stated job

Add the PRD/FRD/ADR decision table and the granularity test. Both already exist
in `docs/README.md` from Phase 0.1, so the real question is **duplicate or point
at it**.

## Duplicate, because the obvious answer breaks portability

Pointing at `docs/README.md` is the instinct — single source, no drift. It fails
for the case the skill exists to serve: the plugin ships to **other** repos,
where that file does not exist and the reference dangles. A skill that only
works in the repo that authored it is not a skill.

So it is duplicated, with the same trade-off the AGENTS block already makes
here: shipped text must be self-contained, and drift is managed rather than
avoided. Unlike the AGENTS block there is no automated identity check, and
adding one is not this ticket.

## The path defect — and a correction to my first reading

My first pass recorded "the skill's paths are wrong". That was wrong, and the
correction matters because it changes the fix.

The skill says PRDs live at `docs/prd/NNNN-<slug>.md`. That **is** correct — it
is `DEFAULT_REPO_DOCS` (`docs/prd/**`, `docs/frd/**`, `docs/adr/**`), the
shipped default a fresh repo gets.

This repo overrides it:

```yaml
repoDocs:
  prd: docs/product/prd/**
  frd: docs/functional/frd/**
  adr: docs/architecture/adr/**
```

So the real defect is not a wrong path. It is that the skill **hardcodes a path
that is configurable**, and never tells the agent to check. In any repo that
customises `repoDocs` — this one — an agent following the skill writes a
governing doc to a path the board's globs do not classify, or links one that
`assertRefs` rejects because it does not exist.

I hit exactly that earlier in this session: `refs: ["docs/product/PRD-001-…"]`
was rejected and the correct path had to be found by listing the tree. At the
time I read it as my own mistake. It was the skill's.

The fix is a pointer, not a correction: `get_doc_gates` with no id returns the
board's document model **including the governing-doc path globs**. The skill
should say to read them, and show the shipped defaults as an example rather than
as the truth.

## Filenames

Also worth stating, since the skill's `NNNN-<slug>.md` is misleading in both
directions: the kind prefix is part of the filename (`PRD-001-…`, not `001-…`),
and this repo's ADRs are four digits where PRDs and FRDs are three. That is a
convention, not something the globs enforce — so the skill should describe it as
one and tell the agent to match what is already there.

## A bare `impact` SKILL-001 missed

Line 10 lists the pipeline as "research/impact/plan/checklist/proof". My
SKILL-001 exit grep matched `impact\.md`, so a mention without the extension
slipped through — here and in `kanmer-tickets`. The grep was too narrow and
reported clean, which is the more useful lesson: an exit criterion is only as
good as its pattern.

## The granularity test earns its place

`docs/README.md` records that it caught the FRD authoring **in this project**.
That provenance is worth carrying into the skill — a rule with a story attached
gets applied, a bare rule gets skipped.
