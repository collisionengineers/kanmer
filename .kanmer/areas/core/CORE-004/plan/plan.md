# Plan

`parseDocPath` validates **every** segment, not just the first: the top level
must be a known type (an unknown one is rejected with the valid list, because
silently accepting `reserch/` would create a document satisfying no gate that
nobody would ever find), and no segment may be `.`, `..` or contain a separator.

A bare type resolves to the folder's index — `research` → `research/research.md`
— so v2-shaped calls keep working and the migration is a *move* rather than a
rewrite of every caller.

Folders are created on first write. A chore is not born with nine empty
directories; that is asserted, not just intended.

Gate satisfaction is "≥1 markdown anywhere beneath the folder", recursively.
`reference/`, `scratch/` and `assets/` are excluded by construction: inputs and
provisional notes are not evidence.
