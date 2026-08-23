# Document structure

**Descriptive mirror — never authoritative.** The board's `board.yml` is the
source of truth. This file is the canonical `kanmer-docs` asset copied into a
repo's `docs/contributing/doc-structure.md`; the mirror is checked for byte
equality so a prose-only update cannot leave the shipped template stale.

## The `/docs/` tree

The repository's governing documents live under the configured paths:

```
docs/
  product/                    vision and product context
  functional/frd/             functional requirements
  architecture/adr/           architecture decisions
  contributing/doc-structure.md  this generated mirror
```

This board classifies governing documents with these `repoDocs` globs:

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
define the effective requirements. The shipped default document types are the
seven types listed above; the board may configure a different set. This mirror
describes the live format-3 defaults, not an independent policy.

## Generation and freshness

`plugins/kanmer/skills/kanmer-docs/assets/doc-structure.md` is the canonical
skill asset. `docs/contributing/doc-structure.md` is its repository mirror.
Run `npm run verify:docs` to validate the manual and assert that the mirror is
byte-identical to this asset; the check also rejects the retired format-2
wording and legacy loose-file paths. Update the asset first when the board model changes, then
regenerate the repository mirror through `kanmer-docs`.
