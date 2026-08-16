# Open questions — GUI-078

*The open questions. Not scratch — these **block** the ticket at three real gates; scratch is a notepad and is never gated.*

Three came up. All three are answerable from the code and the governing docs, so
none goes to the operator — but each is recorded with its reason, because each
one is a place where the cheap answer and the right answer differ.

- [x] **Port `getGateStatus`'s fake gate logic, or delete it?** — **Delete it.**
      It hardcodes `"plan.md required before leaving Planning"` against a stage
      that no longer exists, and indexes `board.statuses.slice(3)` into a
      seven-element list. Porting it means reimplementing per-profile gate
      evaluation inside a fake, which is a maintenance trap and is FRD-023 R1's
      "derive, don't restate" in a place that cannot derive.

      Taken as a default rather than escalated: the `ProjectClient` interface
      decides whether the method must exist, and the demo's job is to return a
      *plausible* value, not to be a second gate engine. It returns an empty map
      — no gate blocks anything in the demo — and says so in a comment.

- [x] **Should `DocModel.profiles` mirror `DEFAULT_PROFILES`, or be invented?**
      — **Mirror them**, by importing from `@kanmer/core` rather than retyping.
      `@kanmer/core` is already a devDependency of this package and `demo.tsx`
      already imports its types. A hand-copied profile table is the same class of
      bug this whole ticket is fixing: a second copy that drifts.

      The one caveat, and the reason this was a question at all: the demo is
      *seed data*, and importing live defaults means the demo changes when the
      defaults change. That is the correct direction here — a design system
      demonstrating the wrong profile table is worse than one that moves.

- [x] **What should `getFormat` return?** — **3.** It currently returns `2`,
      which the compiler accepts and which would make a consumer's migration
      banner appear permanently against a board that needs no migration.

      Trivial, and recorded only because it is the clearest example of the
      ticket's premise: fixing the twelve type errors would not have touched this
      line, and the demo would have compiled while lying.

## Parked (explicitly deferred)

- **`packages/ui` has no tests at all.** No `*.test.ts` anywhere in the package,
  so nothing but the compiler will notice the next drift — and the compiler only
  started noticing once [[GUI-067]] put the workspace in the rail.

  Safe to defer because GUI-067 delivers the compiler coverage, which is the
  larger half, and because a test harness for a design system is a real piece of
  work rather than a line in a fix. Reopens if `@kanmer/ui` gains logic of its
  own — today it is re-exports plus this one fake, and a fake that typechecks
  against the real interface is most of what a test would assert.
