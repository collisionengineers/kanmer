# Plan

Add a channel rather than widening `getGateStatus`. The two callers want
genuinely different shapes: the drag tint wants "per stage, why not" and is
called on every drag start; the panel wants the whole report and is called when
a ticket is open. Overloading one channel would make the hot path carry data it
discards.

The panel renders **only** what the report says. No filtering, no ordering
opinions, no inferred "next step" — an editorial layer here is a second
implementation of the rules by another name.

Unmet requirements are buttons that open the relevant document tab. The panel's
job is to make the next action one click away, not to describe the next action.

Warnings render below the boundaries in warn colour, never as blockers, because
that is what FRD-006 R4 makes them.

A profile with no gated boundaries gets a sentence rather than an empty panel:
chore and spike tickets are common, and an empty box reads as broken.
