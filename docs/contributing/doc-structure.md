# Document structure

**Descriptive mirror — never authoritative.** The board's `board.yml` is the
source of truth. This file is the generated `kanmer-docs` mirror for this
repository, materialized from the canonical asset after resolving this board's
document globs; the freshness check validates both the source asset and this
resolved mirror.

## The `/docs/` tree

The repository's governing documents live under this board's configured paths:

```
docs/
  product/                    vision and product context
  functional/frd/             functional requirements
  architecture/adr/           architecture decisions
  contributing/doc-structure.md  this generated mirror
```

This board classifies governing documents with these resolved `repoDocs` globs:

| Kind | Glob |
|---|---|
| `prd` | `docs/product/prd/**` |
| `frd` | `docs/functional/frd/**` |
| `adr` | `docs/architecture/adr/**` |

A ticket links a governing document through `refs`. Whether that link is
required at a stage boundary is profile-resolved; call `get_doc_gates` for the
ticket instead of relying on a fixed table.

## Ticket documents

Ticket pipeline documents live inside the ticket folder under
`.kanmer/areas/<area>/<ID>/`. Format 3 uses one folder per document type, and
the folder may contain more than one Markdown document:

| Type | Current path | Purpose |
|---|---|---|
| `research` | `research/*.md` | findings and sources |
| `files` | `files/*.md` | current v3 location for paths changed and implementation context |
| `open-questions` | `open-questions/*.md` | questions only the user can answer |
| `plan` | `plan/*.md` | approach and governing-document mapping |
| `checklist` | `checklist/*.md` | executable progress (`- [ ]` / `- [x]`) |
| `post-implementation-report` | `post-implementation-report/*.md` | reviewers' brief |
| `proof` | `proof/*.md` | evidence gathered on merged `main` |

Running notes are `scratch/<slug>.md`. Human-supplied inputs belong in
`reference/`; binary evidence belongs in `assets/`. Neither is a pipeline
document or a gate by itself.

## Workflow model

The board has six fixed stages:

`backlog → preparing → implementing → review → verifying → done`

Document requirements are resolved from the ticket's profile and board/area
configuration. A move crosses one gated boundary at a time; use
`get_doc_gates <id>` immediately before every move to see the effective
requirements and what is already satisfied. Creation is ungated, so historical
backfill can create a ticket directly in any stage.

The board's `profiles` and `defaultProfile` fields, plus any area overrides,
define the effective requirements. Format 3 currently uses the seven fixed
document types listed above; profile configuration selects which of those are
required at each boundary. Ask `get_doc_gates` for the effective requirements.
This mirror describes the live format-3 model, not an independent policy.

## Generation and freshness

The canonical `kanmer-docs` skill asset supplies this model. This file is the
generated mirror for this board, with its
resolved `repoDocs` globs. When this board's document model changes, rerun
`kanmer-setup` from this repository so it regenerates the mirror; do not edit
Kanmer's source asset path from a materialized repository. Run this
repository's configured documentation verification rail after regeneration;
the rail rejects retired format-2 wording and legacy loose-file paths.
