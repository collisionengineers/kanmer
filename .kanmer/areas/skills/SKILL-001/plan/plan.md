# Plan

## Scope line

SKILL-001 is the **sweep**: names, paths, vocabulary, deletions,
cross-references. It blocks SKILL-002…007, so it stops where those begin.

Explicitly not here: templates (002), the kanmer-docs decision table (003),
setup reconciliation (004), the AGENTS block (005). `kanmer-setup` therefore
gets its stage list and priority references corrected and nothing else, even
though it carries the most residue — its rewrite is 004/005.

## kanmer-review's documents → scratch

The 4-doc set cannot be written; `set_ticket_doc` rejects all four ids.
Rejected the two alternatives: folding into `post-implementation-report` makes
the author's document hold the reviewer's verdict, and adding review types to
`DOC_TYPES` is a core change against a folder list FRD-003 fixed deliberately.

Scratch is what is left, and it is a fit rather than a fallback: never gated,
explicitly the notepad, and `append_scratch` takes a slug so `scratch/review.md`
is a natural home. The cost is that a review no longer gates anything — but it
never did; `enter-review` gates the *report*, not the review.

## kanmer-auto

Two independent breakages. Wave partitioning reads `impact.md` file tables →
read `files/` instead. And it is profile-blind, so it would march a `spike`
through the full pipeline → it must read each ticket's profile from
`get_doc_gates` and follow only the boundaries that ticket actually has.

## The `move_item` description

ADR-0009 ranks tool descriptions above skills, so leaving it advertising the old
multi-stage freedom would have the authoritative layer contradict the corrected
one. CORE-011 changed the behaviour; the description is part of that change and
was missed.

`plugin:check` compares tool names and bundle bytes only, so it cannot catch a
stale description — `tool-reference.md` has to be updated by hand and checked by
eye. Worth stating because a green `plugin:check` here means less than it looks.

## Verification

The exit criterion is a grep, so it is run rather than asserted:

```sh
grep -rnE "researching|\bplanning\b|impact\.md|priorit|pr-changes-summary|kanmer-import" plugins/kanmer/skills/*/SKILL.md
```

Zero hits outside deliberate prose. Plus: `ls skills | wc -l` is 12, README says
12, and `verify:agents-block` still passes (proving the sweep did not disturb
SKILL-005's territory).

`docs_todo` and `link_doc` are **excluded from the grep on purpose** — both are
live, and a sweep that removes them would silently break the governing-doc gate
in seven skills.
