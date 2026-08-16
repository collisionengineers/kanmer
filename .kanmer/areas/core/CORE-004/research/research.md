# Folder documents — research

v2 checked fixed filenames, which capped each type at one document and made
typing a *naming convention*. A convention is something an agent can drift on,
and the observed drift was exactly the confusion FRD-014 exists to fix: research
written into `impact.md`, impact written into `research.md`.

Containment cannot be drifted on. A file is under `research/` or it is not.

That also unlocks the things one-file-per-type made impossible: multi-topic
research with a summary (FRD-005's deep mode), several proofs for several
claims, and `reference/` — human-supplied inputs, which have no natural place at
all in a fixed-filename scheme.

The rename `impact` → `files` is part of the same fix: the word "impact" kept
being read as "consequences of the change" rather than "where the change lands".

## Shared context

Phase 2 was implemented as one coherent change — the six items touch the same
three files (`types.ts`, `store.ts`, `board.ts`) and their schemas depend on
each other, so splitting the *code* would have meant six broken intermediate
states. They are separate tickets because they are separate decisions, each with
its own ADR and its own way of being wrong. The commit is `cb39080`.
