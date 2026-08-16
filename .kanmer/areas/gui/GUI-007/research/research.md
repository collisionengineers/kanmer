# The Profiles editor — research

## What exists

`ProfilesTab` renders the resolved model read-only, and says so in a comment:
"the editor is GUI-007; profiles are edited in `board.yml` until it lands." So
the read path, the IPC (`getDocModel`) and the table are all in place. This
ticket adds writing.

## Three things are editable, and they are not equally risky

**Profiles** (`board.profiles`) — profile → boundary → requirement strings.
Changing one **re-gates every ticket using it, immediately**. `update_item`'s
tool description already says so about changing a ticket's profile; the same is
true, at larger blast radius, of changing the profile itself. A board with 102
tickets can have dozens re-blocked by one edit.

**Area default profiles** (`area.defaultProfile`) — affects only tickets with no
explicit profile.

**Proof types** (`board.proofTypes`) — the vocabulary `proof:visual` validates
against. Removing one invalidates any requirement naming it.

## The validation duplication, and why it is the third

The renderer may only `import type` from core (AGENTS.md §7), so
`validateProfileMap` cannot be called here. Its rules must be restated:

- boundary must be one of the five
- requirement type must be a known doc type or `governing-doc`
- only `proof` takes a `:type` suffix
- proof type must be declared on the board
- `@env` must name a declared environment

That makes three deliberate core↔renderer duplications, after
`lib/board.ts blockedIds` vs `computeBlockedIds` and `Settings.tsx
validateDraft()` vs `assertUniquePrefixes`. The ticket says to put it in
`renderer/src/lib/` where vitest reaches it, and to note the pairing in
AGENTS.md §7 — both are the mitigation for a duplication that cannot be
avoided.

## The requirement grammar is the fiddly part

`parseRequirement` splits `@` first, then `:`, then `/`. Order matters: a path
containing `@` would otherwise read as an environment. The mirror has to split
in the same order or it will accept strings core rejects — and the failure mode
is a board saved with a requirement no gate can satisfy.

## The save is a whole-board write

There is no `setProfiles`; `setBoard` replaces the board. So the editor edits a
draft and writes it whole, which means it must not drop fields it does not
understand. `structuredClone` of the read board, patched, is the safe shape —
the same approach `reconcileBoardDraft` already takes.

## What a wrong save does

`setBoard` funnels through core's validation, so a genuinely invalid board is
rejected. But a *valid* board with the wrong requirements silently re-gates
tickets. Blocking a bad save is core's job; showing what will change is the
editor's, and that is the part that has no equivalent today.
