# Post-implementation report

PR [#21](https://github.com/collisionengineers/kanmer/pull/21).

## File changes

| Path | Change |
|---|---|
| `renderer/src/lib/profileDraft.ts` | **New** — the validation mirror and draft edits. |
| `renderer/src/lib/profileDraft.test.ts` | **New** — 27 tests. |
| `renderer/src/components/Settings.tsx` | `ProfilesTab` rewritten as an editor. |
| `renderer/src/styles.css` | Inline field errors. |
| `AGENTS.md` §7 | The three duplications as a numbered list. |

## Against the governing docs

**FRD-002 S2** — profiles and area defaults are editable, validated against the
vocabulary. **FRD-006 R1** — the proof-type vocabulary is editable, and a
requirement's `:type` is checked against it live.

## Decisions worth stating

**Free text, not pickers.** The ticket says "per-boundary type pickers". A
picker cannot express `proof:visual@staging`, so it would be a downgrade from
`board.yml`. Text with inline validation keeps the grammar and still catches
mistakes. This is a deliberate departure from the ticket's wording.

**Empty list deletes the boundary** rather than storing `[]`, so `custom: {}`
and `custom: { "leave-backlog": [] }` cannot differ on disk while behaving
identically — CORE-011's gated-boundary count treats them the same.

**The blast-radius count** has no equivalent in the ticket or the FRD. It exists
because core rejects an invalid board but says nothing about a valid one that
re-gates 46 tickets, and that is the mistake this screen makes easy.

## For review — the real weakness

**The parity check is not automated.** I verified the mirror against core's
`parseRequirement` and `validateProfileMap` over 18 strings and they agree
exactly. Nothing re-runs that. Core can change the split order tomorrow and the
suite will not notice, because the suite tests the mirror against a literal
vocabulary, not against core.

A permanent parity test has to live outside the renderer — a runtime core import
in a renderer test is the thing AGENTS.md §7 forbids. Core's own suite could
hold it, or a node-side test directory. I did not add it, and it is the weakest
point in a duplication that this ticket makes larger.

**Nobody has used the editor.** Typecheck, tests and boot pass; no one has typed
an invalid requirement into a field and watched the error appear, or saved a
profile change and confirmed tickets re-gate. There is no renderer component
test harness in this repo.

## What kanmer-verify should run

The 27 unit tests; the parity script against a rebuilt core; typecheck, build,
boot smoke; and — if anyone can — open Settings → Profiles, type `impact` into a
boundary and confirm the field goes red and Save disables.
