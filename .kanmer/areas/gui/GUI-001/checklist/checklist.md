# Checklist

- [x] `git branch -m` so the history moves with the name
- [x] worktree path unchanged
- [x] new branch pushed before the old remote is deleted
- [x] remote failures are warnings, not rollbacks
- [x] taken name refused, never forced
- [x] detached HEAD refused with a message
- [x] no `origin` handled
- [x] open projects migrated by `applyGitPreferences`
- [x] closed projects reconciled on next open
- [x] failed rename reports the branch the worktree is really on
- [x] `CH.gitStatus` pushed to the renderer
- [x] sync timers re-armed when the interval changes
- [x] rename is an explicit button with the consequences stated
- [x] autosync toggle no longer carries the edited branch field
