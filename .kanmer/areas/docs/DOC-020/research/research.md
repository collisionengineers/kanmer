# Research — ADR-0020 lifecycle status

## Question

Does ADR-0020 use a governance lifecycle value recognized by this repository?

## Findings

1. `docs/README.md` defines the status lifecycle as `draft → approved → superseded`.
2. `docs/architecture/adr/ADR-0020-project-declared-source-trust.md` uses `proposed` in both its frontmatter and rendered status line.
3. The neighbouring ADRs use `draft` for their unapproved state. FRD-027, linked to this ticket, already uses `draft`.

## Implication

Replace only the two `proposed` occurrences in ADR-0020 with `draft`. The decision text, date, scope, and source-declaration implementation remain unchanged.
