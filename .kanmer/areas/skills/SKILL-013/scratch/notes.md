**Operator decision, 2026-08-16 — the Review-skipping question is answered.**

> `chore` → Done in one jump: **keep.** `spike`: **keep.** `fix`: **change** —
> a fix that opened a PR should not merge unreviewed. `feature`: unchanged.

So `fix` gains a gated `enter-review`. Three things follow, and the third is the
one that can go wrong:

1. This is a **profile change** and needs its own ADR — the ticket already says
   so. It changes what every existing board demands of every `fix`.
2. It must reach existing boards, which means the [[SKILL-012]] lesson applies:
   editing `DEFAULT_PROFILES` alone reaches **new boards only**, because every
   board written by setup or migration carries its own `profiles:` block. The
   resolve-time injection in `board.ts` is the working precedent.
3. **`collapsesPipeline` counts gated boundaries.** Giving `fix` an
   `enter-review` takes it from 2 gated boundaries to 3, which is the intended
   effect on implementing → done — but every other multi-stage `fix` move must
   be re-measured, not assumed. This is the exact mechanism ADR-0011's second
   limit is about, and this ticket amends that ADR in the same pass.

Measure the before and after on all four profiles and put the table in `proof`,
the way SKILL-012 did. An assertion here is worth nothing; SKILL-012 produced two
wrong claims about this same machinery before measurement caught them.
