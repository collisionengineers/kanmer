# The ideal repo `/docs/` template

The professional documentation structure `kanmer-setup` greenfield onboarding materializes (request #14), and the source of truth the per-area doc-hierarchy config points at. Companion to [`plan.md`](plan.md). This tree lives in the **repo's own `/docs/`** (version-controlled, human-readable) — separate from `.kanmer/` (the board) and from `docs/plans/` (this roadmap).

## Tree

```
docs/
  README.md                         # index: the map of this tree + how docs relate to Kanmer tickets
  contributing/
    doc-structure.md                # human-readable mirror of `board.docs` (generated from board.yml — never authoritative)
    conventions.md                  # naming, numbering (PRD-###, FRD-###, ADR-####), status lifecycle
  product/
    vision.md                       # the annotated project brief (onboarding Phase 1 output)
    roadmap.md
    open-questions.md               # repo-level unresolved product questions
    prd/
      PRD-000-template.md
      PRD-001-<slug>.md
  functional/
    frd/
      FRD-000-template.md
      FRD-001-<slug>.md
  architecture/
    overview.md                     # system context / C4 L1–L2
    data-model.md
    adr/
      ADR-0000-template.md
      ADR-0001-<slug>.md
  api/
    reference.md
  operations/
    deployment.md
    runbooks/
  glossary.md
```

## Conventions

- **Numbering:** `PRD-###`, `FRD-###`, `ADR-####` (ADR 4-digit by convention).
- **Frontmatter:** every governance doc carries `status: draft | approved | superseded` and a `supersedes:` / `superseded_by:` chain.
- **Hierarchy:** PRD → its FRDs → their ADRs (each doc cross-links up). This mirrors the Kanmer per-area doc hierarchy and is what `board.docs.repoDocs` globs match (`docs/prd/**` → kind `prd`, etc., Phase 1 §1.1).
- **Ticket linkage:** a Kanmer ticket references the governing doc via frontmatter `refs: [docs/functional/frd/FRD-003-upload-retry.md]`, maintained by `link_doc`. The **Backlog→Researching** gate (standard, on by default; `kanmer-setup` can disable it) checks `refs` is non-empty **or** `docs_todo: true` (request #13).
- **`doc-structure.md`** describes which doc types are mandatory per area and which stage gate each satisfies — a **generated, human-readable mirror** of the `board.docs` config. `board.yml` is the single source of truth; `kanmer-docs` regenerates this file when the config changes so it can never drift ahead of it.

## Onboarding mapping (brief → docs)

| Brief span | Destination |
|---|---|
| Product goal / capability cluster | `docs/product/prd/PRD-00N-<slug>.md` |
| Concrete user-facing feature | `docs/functional/frd/FRD-00N-<slug>.md` |
| Architectural / technical decision | `docs/architecture/adr/ADR-000N-<slug>.md` |
| Unresolved span | `docs/product/open-questions.md` (surfaced to the user) |
| The whole annotated brief | `docs/product/vision.md` |
