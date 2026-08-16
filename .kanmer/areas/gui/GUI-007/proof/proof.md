# Proof

PR [#21](https://github.com/collisionengineers/kanmer/pull/21), merged
(`7fdaa10`). Verified on the merged base.

## The mirror agrees with core

The load-bearing claim of a duplication. Checked against core's real
`parseRequirement` and `validateProfileMap`, over 18 requirement strings,
against a **freshly rebuilt** core:

```
18 cases
parse: identical to core
accept/reject: identical to core
```

Cases include `proof:visual@staging`, `research/notes@staging` (the one that
distinguishes split orders), `plan:visual` (suffix on a non-proof type),
`proof:audio` (undeclared proof type), `proof@qa` (undeclared environment) and
`impact` (a type that no longer exists).

## Suite

- 27 new unit tests in `profileDraft.test.ts`; GUI **136 → 163**
- `typecheck -w @kanmer/gui` clean, `build -w @kanmer/gui` clean
- boot smoke exit 0

The unit tests state the vocabulary **literally** rather than importing it, so
a change to core's document types fails a test instead of agreeing by
construction. That is deliberate and is the only automated defence the mirror
has.

## Not proven — and one of these is a real gap

**The parity check is not automated.** It proved the mirror correct today, by
hand, twice. Nothing re-runs it. Core could change the split order tomorrow and
the suite would not notice: it tests the mirror against a literal vocabulary,
not against core.

A permanent parity test cannot live in a renderer test file — a runtime core
import there is exactly what AGENTS.md §7 forbids. It would have to sit in
core's own suite or a node-side test directory. **I did not add it.** It is the
weakest point in a duplication this ticket makes larger, and it is now recorded
in AGENTS.md §7 as pairing 3 so at least the obligation is visible.

**Nobody has used the editor.** No one has typed an invalid requirement and
watched the field go red, or saved a profile change and confirmed tickets
re-gate. There is no renderer component test harness in this repo.

**The blast-radius count is untested against a real edit.** `ticketsAffected`
has unit tests over a synthetic board; it has never run against the live
102-ticket board with a genuine profile change.
