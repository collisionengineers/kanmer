# Post-implementation report

The rename now moves the branch instead of abandoning it, and the two silent
holes on either side of it are closed.

The reconciliation in `ensureBoardWorktree` is the part that actually fixes this
for most users. Renaming reaches open projects; every other project on the
machine is repaired the next time it is opened.

**For review — the old remote branch is deleted.** FRD-020 R5 specifies it and
the push-first ordering makes it safe for the person doing the rename, but a
teammate still on the old name will find their branch gone. That is inherent to
renaming a shared branch rather than a defect, and the UI now states it before
the click. If that trade is wrong, the place to change it is the `push origin
--delete` in `renameBoardBranch`, and the rest of the fix stands either way.

**Also for review — two out-of-ticket fixes.** The timer re-arm and the
autosync-toggle branch leak are not GUI-001. They are in the function GUI-001
rewrites, both silent, and the timer one is the likely explanation for automatic
sync appearing to do nothing earlier in this session. Fixing them separately
would have meant touching the same handler twice.

**Not done:** `removeBoardWorktree` is still dead code. It is plausibly the
remains of a delete-and-recreate design, which is the approach that loses
commits. Deleting it is a separate cleanup and not something to slip into a bug
fix.

**Not covered by tests:** the remote-failure warning paths. Simulating a push
that fails after a successful local rename needs an origin that rejects writes
mid-test; the branches are three lines each and their behaviour is visible in
the return shape, so this is a deliberate gap rather than an oversight.
