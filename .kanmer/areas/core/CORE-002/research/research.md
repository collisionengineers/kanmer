# Fixed stages — research

The v2 board let each project define its own stages. On a real four-stage board
the shipped doc gates referenced `researching` and `planning`, which did not
exist there, so `evaluateGates` computed a threshold of -1 and every one of
those gates silently passed. The pipeline looked enforced and was not — the
worst failure mode available, because nothing reports it.

Three consequences drove the decision (ADR-0002):

1. A gate can only be trusted if the stage it names is guaranteed to exist.
2. Skills had to resolve stage ids defensively (`list_board` before every move)
   because they could not assume `implementing` was a thing.
3. `kanmer-setup` had to propose a stage set and then explain it.

Fixing the set removes all three at once. The cost is real and knowingly paid:
customisation goes away. The trade is variance for reliability.

Researching and Planning merge into Preparing because the distinction was never
enforced by anything — the documents' own ordering already expressed it.

## Shared context

Phase 2 was implemented as one coherent change — the six items touch the same
three files (`types.ts`, `store.ts`, `board.ts`) and their schemas depend on
each other, so splitting the *code* would have meant six broken intermediate
states. They are separate tickets because they are separate decisions, each with
its own ADR and its own way of being wrong. The commit is `cb39080`.
