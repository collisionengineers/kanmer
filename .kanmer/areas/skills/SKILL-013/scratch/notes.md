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

## Pre-existing defect found while rebasing — NOT fixed here, needs a ticket

`origin/main` currently carries **two** ADR-0013s:

- `docs/architecture/adr/ADR-0013-hosts-own-their-registration-file.md` — from
  `26c8960`, the commit whose entire job was *"renumber the duplicate ADR-0012"*.
- `docs/architecture/adr/ADR-0013-staleness-by-content-not-version.md` — added by
  CORE-023 (`3e9ee2c`, #54), which was in flight at the same time and picked the
  same next-free number.

So the duplicate-ADR-number defect was fixed and immediately recreated, by two
tickets that could not see each other's choice. It is the same class of bug as
the one this ticket is fixing one tier down — two copies of a value with no
mechanism keeping them apart — and it will recur every time two tickets are in
flight, which on this board is always.

**Not fixed here, deliberately.** Renumbering one of them means rewriting a
just-merged ticket's ADR path, and `refs` on closed tickets point at it. That is
someone's ticket, not a drive-by.

SKILL-013 took **ADR-0014** — the next genuinely free number — rather than adding
a third 0013.

Worth a ticket: `verify:skills` or a sibling rail check could assert that no two
files in `docs/architecture/adr/` share a number. It is three lines and it is the
only thing that would have caught this.
