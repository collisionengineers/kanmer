# Plan

1. Dry run. Read the report in full — mapping counts, the `needs-restage` list,
   document moves, priority and profile counts, blockers.
2. Only if blockers are empty and `needs-restage` is empty, apply.
3. Compare the applied report against the dry-run report. They must match; that
   is the criterion, not "it did not throw".
4. Prove the board is *workable*, not merely converted: move a real ticket
   across a real gate.
5. Commit the board so the migration is revertable.

Not doing: the GUI migration prompt (that is GUI-005/4.1). This run goes through
the core function directly, which is the same code path the prompt will call.
