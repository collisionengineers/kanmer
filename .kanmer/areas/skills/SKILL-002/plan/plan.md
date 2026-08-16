# Plan

## The identity line

One italic line immediately under the heading, in a fixed shape:

> *The X. Not the Y — <the distinction in a clause>.*

Fixed shape so the exit check is a grep rather than a reading. Immediately
under the heading so it is the first thing read, and cannot drift down the file
as sections are added.

## Pairs

research↔files, plan↔checklist, report↔proof, open-questions↔scratch,
pr↔report, and PRD/FRD/ADR three ways. Each is a documented conflation, not a
guess — the pairs come from the failure PRD-001 problem 4 names.

## The files template

Two tables. **Where the change lands** (path, why) and **Context files** (path,
what it tells the implementer). The second is the one that earns its keep: it is
the difference between "here is a diff preview" and "here is what will trip you
up".

Renaming this file was SKILL-001's; rewriting its contents is here, which is why
it still says "Impact" today. Closing that deliberately rather than pretending
it was finished.

## Proof types

Base `proof-template.md` keeps the general shape and points at the variants.
`proof-visual-template.md` says to put images under `proof/` — core emits a soft
warning when a `proof:visual` requirement finds no image files, so a template
that omits it produces warnings by construction. `proof-test-template.md` insists
on pasted real output.

Soft warnings stay soft; the template just stops causing them needlessly.

## Verification

The ticket names it: grep every shipped template for the identity line.

```sh
for f in plugins/kanmer/skills/*/assets/*template*.md; do
  sed -n '3p' "$f" | grep -q '^\*.*Not ' || echo "MISSING: $f"
done
```

Zero output. Line 3 because line 1 is the heading and line 2 is blank.
