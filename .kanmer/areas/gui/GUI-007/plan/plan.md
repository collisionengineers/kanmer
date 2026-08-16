# Plan

## `lib/profileDraft.ts`

Pure functions, no React:

- `parseRequirementLike(raw)` — the same `@` → `:` → `/` split order as core.
  Different order, different acceptance; that is the whole risk.
- `validateRequirement(raw, { docTypes, proofTypes, environments })` → error
  string or null.
- `validateProfiles(profiles, opts)` → `Record<"profile.boundary", string[]>`,
  so the UI can put each error next to the field that caused it.
- `applyProfileEdit(board, profile, boundary, raw)` → a cloned board.

Everything takes the vocabulary as an argument rather than importing it, so the
tests state the vocabulary explicitly and a change in core's list shows up as a
failing test rather than as agreement by coincidence.

## The editor

Per profile, per boundary: a text input holding the comma-separated
requirements, validated on change, error shown inline. Text rather than a picker
because requirements are a small grammar (`proof:visual@staging`), and a picker
that cannot express the grammar would be a downgrade from editing `board.yml`.

Area default-profile: a select per area, options from the profile list.

Proof types: a comma-separated list, since it is a flat vocabulary.

**Save is explicit and disabled while any error stands.** No autosave — this
re-gates tickets across the whole board.

## Show the blast radius before saving

The part with no equivalent today. Before saving, count tickets whose profile is
being edited and say so: "3 profiles changed — affects 46 tickets." Core will
reject an invalid board; nothing warns about a valid one that re-blocks half the
board.

## AGENTS.md §7

Add the pairing to the existing list of deliberate duplications. The list is the
only thing that makes them maintainable — an unlisted duplication is just drift
waiting to happen.

## Verification

Vitest on the mirror, including the cases that distinguish split order:
`proof:visual@staging`, a path containing `@`, an unknown boundary, a suffix on
a non-proof type. Then typecheck, build, boot smoke.
