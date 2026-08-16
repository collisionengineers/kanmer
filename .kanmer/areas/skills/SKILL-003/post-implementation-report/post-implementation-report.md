# Post-implementation report

PR [#19](https://github.com/collisionengineers/kanmer/pull/19). Two files.

## File changes

| Path | Change |
|---|---|
| `kanmer-docs/SKILL.md` | Decision table, granularity test, paths-are-configured section, `impact` → pipeline names. |
| `kanmer-tickets/SKILL.md` | The other bare `impact`. |

## Against the governing docs

**FRD-014 R2** — the decision table and granularity test are in the skill, with
the test's provenance. **R4** — the doc-structure mirror is retained and still
described as descriptive-not-authoritative.

## I corrected my own research mid-ticket

The research first recorded "the paths are wrong". They are not — they are
`DEFAULT_REPO_DOCS`, correct for a fresh repo. The defect is hardcoding a
configurable value without telling the agent to check it. The research document
was rewritten before implementing, because the wrong diagnosis produced the
wrong fix: correcting the constants would have broken every repo using the
defaults.

That is also the explanation for a failure earlier in this session. A `refs`
entry pointing at `docs/product/PRD-001-kanmer-v3.md` was rejected and I
recorded it as my own mistake. It was the skill teaching a path this board does
not use.

## For review

**The duplicated table has no automated check.** `docs/README.md` and the skill
must match; today they do, verified by diff. The AGENTS block solved the same
problem with a byte-identity assertion in `verify-agents-block.mjs`. I judged a
three-row table not worth a second verify script. A reviewer may reasonably
disagree — the inconsistency is that this codebase already decided duplication
needs a check, and this duplication does not get one.

**SKILL-001's exit grep was too narrow** and reported clean while two `impact`
references survived. Fixed here, but nothing prevents the next narrow grep. The
broader problem — that "zero hits" is only as strong as the pattern — has no
fix in this ticket.

## What kanmer-verify should run

Diff the table in `docs/README.md` against the skill's copy — identical; the
widened residue grep (`\bimpact\b|researching|kanmer-import`) returning only the
verb; `verify:agents-block`.
