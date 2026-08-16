# Kanmer governance docs

The durable documentation set: why the product exists, what each feature does, and why it is
built the way it is. Tickets link here through their `refs` field, and leaving Backlog requires
such a link (or `docs_todo`) — so this tree is load-bearing, not decoration.

Structure follows Kanmer's own `docs-template`. Status lifecycle: `draft → approved → superseded`,
declared in each file's frontmatter.

## Layout

```
docs/
  product/vision.md              the product's why + six principles
  product/prd/PRD-001…           one per initiative (a coherent goal spanning features)
  architecture/adr/ADR-0001…     one decision each: context / decision / alternatives / consequences
  functional/frd/FRD-001…        one feature each, with acceptance criteria
  contributing/doc-structure.md  generated mirror of the board's doc config — never authoritative
  plans/                         implementation roadmaps (working documents, not governance)
```

## Which document am I writing?

| | Answers | Rule |
|---|---|---|
| **PRD** | why the product needs this | one per initiative |
| **FRD** | what ONE feature does | one crisp acceptance list, one "done" |
| **ADR** | why it is built this way | one decision; superseded, never edited |

**The granularity test:** one crisp acceptance list and one "done" — if a document needs two,
split it. (This test exists because it caught the FRD authoring in this very project; see
FRD-014 R2 and the R8b correction in the shaping record.)

FRDs are **durable end-state specs of the whole product**, absorbing shipped behaviour — not
change requests. Cross-cutting rules that span every feature (living documents, the
read-everything duty) are requirements *inside* FRDs plus the AGENTS-block layer, never FRDs of
their own.

## The set

**Product** — [vision](product/vision.md) · [PRD-001 Kanmer v3](product/prd/PRD-001-kanmer-v3.md)

**Architecture** — ADR-0001 group membership on the ticket · 0002 fixed six stages ·
0003 requirement profiles · 0004 folder containment defines doc type · 0005 proof, not deployment ·
0006 priority removed · 0007 codex project config · 0008 single format-3 migration ·
0009 skills are not the contract · 0010 setup is reconciliation.
See [`architecture/adr/`](architecture/adr/).

**Functional** — [`functional/frd/`](functional/frd/), in two groups:

- *v3 features:* 001 groups · 002 requirement profiles · 003 ticket documents ·
  004 reference files · 005 deep research · 006 typed proof · 007 fixed six-stage board ·
  008 priority removal · 009 interrogative workflow · 010 task-scoped dispatch ·
  011 backlog list view · 012 connect · 013 setup as reconciliation · 014 doc-type guidance.
- *Backfill of shipped behaviour:* 015 ticket & board core · 016 take & worktree model ·
  017 activity log · 018 live sync & notifications · 019 GUI shell · 020 board git worktree sync ·
  021 auto-update · 022 MCP server surface · 023 agent skills system. Plus 024 in-app manual.

## Reading order

1. [vision](product/vision.md), then the PRD — why and what.
2. [plans/kanmer-v3/README.md](plans/kanmer-v3/README.md) — how it lands, in what order.
3. Per feature: its FRD, then the ADRs it cites, then the phase items that build it.

## Invariants

- **No project-specific names or instructions** anywhere under `docs/` outside `plans/*/shaping.md`
  (which is a historical record and says so in its first line).
- Every FRD passes the granularity test.
- Backfill FRDs (015–023) carry `file:line` anchors in their footers and only reach `approved`
  once those have been checked against the code.
