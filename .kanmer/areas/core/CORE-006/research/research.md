# Priority removal — research

Priority was a per-ticket enum that nothing enforced and nobody maintained. On a
real board it decayed into noise: everything urgent, or everything medium. The
ordering that actually mattered was already expressed twice over — by the manual
`order` key the human drags, and by `blocks:` edges.

Horizon groups (FRD-001) cover the real need — "what matters now" — as a
cross-cutting, shared, visible thing rather than a per-ticket label.

There is a precedent to copy exactly: `due` was removed the same way in v2.

## Shared context

Phase 2 was implemented as one coherent change — the six items touch the same
three files (`types.ts`, `store.ts`, `board.ts`) and their schemas depend on
each other, so splitting the *code* would have meant six broken intermediate
states. They are separate tickets because they are separate decisions, each with
its own ADR and its own way of being wrong. The commit is `cb39080`.
