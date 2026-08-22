# Plan

1. Take GUI-122 on its own worktree and branch, based on the GUI-118 branch.
2. Fetch and merge the current CORE-043 head (`7654a281`) into the branch;
   resolve conflicts while preserving GUI-119 provider propagation.
3. Run focused GUI/provider/connect/index-sync rails plus typecheck, build,
   scripts, and diff checks; record exact outputs.
4. Refresh the GUI-118 cumulative packet, open a PR targeting GUI-118, and
   stop at Review for an independent reviewer.
