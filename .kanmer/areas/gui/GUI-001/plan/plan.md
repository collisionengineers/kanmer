# Plan

`renameBoardBranch(boardRoot, to)` returns `{ ok, from, error }` rather than
throwing, because three of its four outcomes are things the user needs told
without the operation being undone:

| Outcome | ok | error |
|---|---|---|
| renamed, pushed, old remote deleted | true | null |
| renamed, no `origin` configured | true | null |
| renamed, push or delete failed | true | the warning |
| the name is taken, or HEAD is detached | false | the reason |

The taken-name case must not use `git branch -M`. Forcing would overwrite
whatever that branch is, and a board branch is the one thing in the repo with no
second copy.

Two call sites, because the setting is global and worktrees are not:

- `applyGitPreferences` handles projects currently open, and emits `CH.gitStatus`
  so the Settings pane updates without a reopen.
- `ensureBoardWorktree` handles everything else on next open. This is the one
  that matters; the handler is just the fast path.

A failed rename keeps `ctx.syncStatus.branch` on the *old* name and sets
`paused`. Reporting the requested name after a failure is precisely the lie that
caused the original bug.

The Settings control becomes a button. On-blur was acceptable when the write was
a string in a JSON file; it is not acceptable now that blurring a half-typed
field pushes a branch and deletes one from the remote. The pending-change hint
spells out both effects before the click.

Two adjacent defects in the same handler get fixed rather than stepped around:

- Interval changes never re-armed the timers, so turning automatic sync on did
  nothing until reopen. This is almost certainly what made autosync look inert
  earlier in this session.
- The autosync checkbox passed the edited branch field into the same call, so
  toggling sync could apply a name the user had not committed to.

Testing drives real Git against a bare origin. The bug is entirely about which
refs exist afterwards, and mocking `execFile` would only assert that this file
calls the commands this file calls.
