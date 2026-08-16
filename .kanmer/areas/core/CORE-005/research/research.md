# Typed proof — research

"Proof" alone does not say what would convince anyone. UI work wants pixels;
logic wants test output; an operational change wants a command log. Naming the
flavour lets `kanmer-verify` know what to capture instead of guessing.

Separating **type** from **source** is the other half. v2's proof implicitly
meant "on merged main", which is right by default but wrong for the minority of
tickets whose evidence only exists in a deployed environment. Making the
environment an explicit opt-in (`proof:visual@staging`) means trivial tickets
never wait on a release cycle to satisfy a gate.

The hard call is what happens when a declared flavour is not met. A `visual`
proof with no image is *probably* wrong — but an image check cannot tell a
screenshot from a decorative logo, and a proof doc that embeds evidence by
reference is legitimate. So it warns and never blocks: warnings keep the human
judging what machines judge badly.

## Shared context

Phase 2 was implemented as one coherent change — the six items touch the same
three files (`types.ts`, `store.ts`, `board.ts`) and their schemas depend on
each other, so splitting the *code* would have meant six broken intermediate
states. They are separate tickets because they are separate decisions, each with
its own ADR and its own way of being wrong. The commit is `cb39080`.
