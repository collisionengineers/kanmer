---
name: kanmer-docs
description: Author and link the repo's governing documents (PRD/FRD/ADR) under /docs/. Use to create or update a product/functional/architecture doc, to satisfy the "every ticket links or creates a governing doc" rule, or to lay down the /docs/ structure. DO NOT USE for per-ticket pipeline docs (research/plan/proof — those live in the ticket folder).
---

# Kanmer docs — governing-document governance

The repo's own `/docs/` tree holds the durable product/architecture record;
tickets reference it by path via `refs` (`link_doc`). Per-ticket pipeline
documents (research, files, plan, checklist, proof) live *inside* the ticket
folder — not this skill's job.

## Which document am I writing?

| | Answers | Rule |
|---|---|---|
| **PRD** | why the product needs this | one per initiative |
| **FRD** | what ONE feature does | one crisp acceptance list, one "done" |
| **ADR** | why it is built this way | one decision; superseded, never edited |

**The granularity test:** one crisp acceptance list and one "done" — if a
document needs two, split it.

That test is not imported from anywhere: it was written after it caught the FRD
authoring in Kanmer's own repo. Apply it to the document in front of you before
deciding it is fine.

FRDs are **durable end-state specs**, absorbing shipped behaviour — not change
requests. A cross-cutting rule that spans every feature is a requirement
*inside* the FRDs it affects, not an FRD of its own.

(In a repo that has `docs/README.md`, that file is the canonical copy of this
table and this skill's copy must match it. The duplication is deliberate — the
plugin ships to repos with no such file — and is not checked automatically.)

## Where the documents live — ask, do not assume

**Paths are configured per board, so read them rather than hardcoding them.**
`get_doc_gates` with no `id` returns the board's document model, including the
governing-doc path globs. Use those.

The shipped defaults are `docs/prd/**`, `docs/frd/**`, `docs/adr/**` — but a
repo may set anything, and this one does:

```yaml
repoDocs:
  prd: docs/product/prd/**
  frd: docs/functional/frd/**
  adr: docs/architecture/adr/**
```

Writing to the default path on a board that overrides it produces a document the
globs classify as nothing, and `refs` pointing at a path that does not exist is
rejected outright — `assertRefs` requires the file to be there.

For the filename, **match what is already in the directory**. The conventional
shape is `<KIND>-<number>-<slug>.md` with the kind prefix included
(`PRD-001-…`, `FRD-014-…`, `ADR-0009-…`), zero-padded and monotonic per kind
— but the width varies by repo, so copy the neighbours rather than the example.

Also here: `docs/contributing/doc-structure.md`, the descriptive mirror of the
board's document model — never authoritative; `board.yml` is the source of
truth, and this file is regenerated from it.

## The link-or-create rule (gate: leaving Backlog)
Before a ticket leaves Backlog it must either:
- **link** an existing governing doc — `link_doc <id> <path>` using the real path from the board's globs; or
- **create** the doc first (author it here via the `prd`/`frd`/`adr` templates), then link it; or
- set **`docs_todo`** when the doc is genuinely still to be written (imports, spikes) — a tracked debt that `kanmer-groom` surfaces.

## Authoring rules
A **plan** must state how it meets each linked PRD/FRD/ADR — or, with explicit
user authorization, how it *modifies* one, or why a *new* ADR is created for a
design decision. `kanmer-plan` writes that "Governing docs" section; `kanmer-review`
checks it holds. Gates only check a doc's existence; this content rule is human-
and skill-enforced.

## Bulk (greenfield)
`kanmer-setup` calls this skill to split a product brief into PRDs → FRDs → ADRs
and materialise the `/docs/` tree + `doc-structure.md` before seeding the backlog.
