## OPERATOR ANSWER — 2026-08-16

**Question 1 ("is 'no board found' fatal, or degraded?") is ANSWERED by the
operator. Chosen: option (c) — throw, PLUS an explicit `--init` opt-in.**

The operator selected this preview as the intended behaviour:

```
$ kanmer-mcp            # no --root, no board anywhere
Error: no Kanmer board found. Tried:
  C:\proj\.kanmer
  C:\proj\.worktrees\*\.kanmer
  C:\.kanmer
 Pass --root <board>, set KANMER_ROOT,
 or pass --init to create one here.
```

What this settles, concretely:

- **Not-found is fatal.** No silent boot into a rootless session. The error names
  **every path tried**, in order, and names all three recoveries.
- **Bootstrapping survives behind an explicit opt-in.** `--init` (and/or
  `KANMER_INIT=1`) is what permits creating a board where none was found. Today
  `write()` → `ensureInit()` → `store.init()` creates `<cwd>/.kanmer` lazily; that
  implicit path is what `kanmer-setup` relies on to onboard a board-less repo, and
  it must now be reached only through the opt-in, never by accident.
- **`kanmer-setup` is affected.** It onboards repos that have no board yet, so it
  must pass the opt-in. Check the skill and any GUI call path that expects lazy
  creation, and update them in this ticket — a fatal resolver plus a setup flow
  that assumes lazy creation is a broken product, not two tickets.
- The `tried` list in the error is the same list that goes in the `tried`
  provenance field. One source, two surfaces.

The planner may now tick open question 1 citing this note. The remaining
questions were settled in the scheduling note beside this one.

**This ticket is now fully unblocked and is the head of lane A.**
