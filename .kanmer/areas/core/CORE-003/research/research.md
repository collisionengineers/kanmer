# Profiles — research

The v2 gate model attached one document set to an *area*. Area is where work
lives, not what kind of work it is, so a one-line chore in `core` faced exactly
the pipeline a new subsystem did. Two things followed, both observed:

- trivial tickets stalled at gates that had nothing to say about them, or
- agents wrote junk documents to clear them — a `research.md` reading "no
  research needed" satisfies the gate and destroys the signal.

The second is worse: it converts an enforcement mechanism into noise, and the
noise then trains the next agent.

Profiles move the requirement from *where* to *what kind*. The shipped four
answer "what evidence does this kind of work owe?": a feature earns the full
pipeline because it changes what the product is; a fix owes where it landed and
what changed; a chore owes a plan and a proof; a spike's research **is** the
deliverable.

**The engine mostly already existed.** `evaluateGates` computed leave/enter
thresholds such that a move is checked against every boundary it crosses, so
FRD-002 G2 came for free. Only the *source* of the rules changed.

## Shared context

Phase 2 was implemented as one coherent change — the six items touch the same
three files (`types.ts`, `store.ts`, `board.ts`) and their schemas depend on
each other, so splitting the *code* would have meant six broken intermediate
states. They are separate tickets because they are separate decisions, each with
its own ADR and its own way of being wrong. The commit is `cb39080`.
