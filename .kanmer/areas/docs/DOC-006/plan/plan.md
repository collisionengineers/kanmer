# Plan

Replace G2a's "Open design question" paragraph with the resolved answer, and add
the branch check to the rejected-alternatives list beside the timestamp rule it
was proposed to replace.

## What the replacement must say

The paragraph is read by whoever next wonders "why doesn't the gate catch
code-then-plan". It has to leave them with no reason to try either approach, so
it states **why each fails**, not just that it does:

- the timestamp rule has no timestamps to compare (no write time recorded;
  board commits are batched per sync; git carries no mtimes)
- the branch check works mechanically but misses the actual case, and the
  measured number (147 on a fresh branch) is worth keeping because it is what
  makes the naive form obviously wrong at a glance
- nothing mechanical proves causation

That third point is the one to end on. A reader who takes away only "gates check
sequence, review checks causation" has the right model.

## Scope

One paragraph replaced, one bullet added, nothing else. No G2c: there is no new
rule — the outcome is that G2a's question is closed, not that a rule was added.
The FRD's numbered rules describe enforced behaviour, and inventing a number for
"we decided not to" would imply something is enforced.

## Not touching

`AGENTS.md`, the tool descriptions and `tool-reference.md` all describe gate
behaviour, and none of it changes. A doc-only amendment that rippled into the
release rail would be a signal that the scope was wrong.

## Verification

Grep the FRD for "Open design question" — zero. Confirm the file still parses as
the FRD it was (the numbered rules G1–G5 intact, G2a/G2b unchanged apart from
the paragraph). `verify:agents-block` untouched but run anyway, since AGENTS.md
sits next door.
