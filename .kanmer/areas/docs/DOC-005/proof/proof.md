# Proof

PR [#26](https://github.com/collisionengineers/kanmer/pull/26), merged
(`1df633e`). Verified on the merged base. **Last ticket of the v3 roadmap.**

## The rule is where it must be

`verify:agents-block` → **26/26**. §0 sits after the `kanmer:instructions:end`
marker, confirmed by reading the file in order rather than trusting the check —
inside the markers it would be silently overwritten the next time setup runs.

## The stretch works from both roots

The bug that mattered: the first version resolved the board from the script's
own root, so it found nothing when run from a per-ticket worktree — the normal
case.

Run from the **ticket worktree** during development and from the **main
checkout** after merge, both produce the same real output:

```
## Since v0.2.0
### gui
- GUI-007, GUI-010, GUI-015, GUI-016, GUI-017   (4 with PR links)
### skills
- SKILL-002 … SKILL-007                          (5 with PR links)

_11 tickets across 2 areas. Draft — edit before shipping._
```

Drawn entirely from `stageEntered.done` and `prs` — committed board data, not
git log. Tickets with no `done` stamp are excluded rather than inferred from
`updated`, which changes on any edit.

## Rail

core 139, gui 184, `verify:agents-block` 26/26.

## Not proven

**The counts in the rule are a snapshot.** "60 backfilled, 26 collapsed" is true
today and nothing regenerates it. A dated statement of fact seemed better than a
generated paragraph that becomes a third thing to keep in sync — arguable.

**Nobody has followed the rule from a cold start.** It describes what the last
sixteen tickets did, written by the agent that did them. Whether it reads
clearly to someone arriving without that context is untested, and cannot be
tested by the person who wrote it.

**`release:notes` is not wired into `release.mjs`.** Deliberate — notes need a
human edit — but it must be remembered, like `plugin:check` and `check:manual`.
That is now three rail steps in a repo with no CI to enforce them.
