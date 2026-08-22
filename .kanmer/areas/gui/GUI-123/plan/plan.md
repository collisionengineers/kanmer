# Plan

1. Take GUI-123 on its own branch/worktree based on GUI-122.
2. Merge the GUI-120 merge commit `37740379552e241f200bb181a2ca0e9d3be32ece`
   into the GUI-123 branch, resolving conflicts without dropping GUI-119.
3. Run the focused provider/connect/index-sync/remote-manager tests plus
   typecheck, build, scripts, docs, and diff checks.
4. Refresh GUI-122's cumulative packet, open a PR targeting GUI-122, and stop
   at Review for an independent reviewer.
