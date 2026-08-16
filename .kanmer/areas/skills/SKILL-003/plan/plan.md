# Plan

## The table, duplicated deliberately

Carried in the skill rather than referenced, because the plugin ships to repos
with no `docs/README.md`. Word-identical to the canonical copy so a diff between
them is visible, and the skill says which copy is canonical in a repo that has
one.

No automated identity check. The AGENTS block has one and this does not, which
is an inconsistency worth naming rather than papering over — a three-row table
did not seem worth a new verify script, but that is a judgement a reviewer may
reverse.

## The granularity test keeps its provenance

"One crisp acceptance list and one 'done' — if a document needs two, split it",
*and* the note that it caught this project's own FRD authoring. A rule with a
story is applied; a bare rule is skipped.

## Correct the paths

`docs/product/prd/PRD-NNN-<slug>.md`, `docs/functional/frd/FRD-NNN-<slug>.md`,
`docs/architecture/adr/ADR-NNNN-<slug>.md`. Prefix in the filename, ADRs four
digits.

Checked against `repoDocKindOf`'s globs, not just against the directory listing
— a path the skill teaches that the board's globs do not classify is a linked
doc of no kind.

## Fix the `impact` references SKILL-001 missed

Two, both bare. Also widen the exit grep for future sweeps: matching `impact\.md`
let a mention without the extension through, and reported clean.
