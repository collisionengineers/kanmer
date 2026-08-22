# CORE-082 implementation plan

## Base and governing constraints

Branch from exact cumulative CORE-026 head `a1a4fe629d71d149b64fd3e57979a196176b875a` on `origin/core-026-project-declared-sources`. Keep the PR stacked on that feature branch. FRD-027 and ADR-0020 remain governing; no product-contract rewrite is in scope.

## Ordered work

1. Inspect the inherited lock and board-sync implementation/tests at the recorded base; retain all existing assertions and record the first baseline failures if any.
2. Add a process-owner identity contract that distinguishes a reused PID from the lock owner. Identity mismatch must permit stale recovery only after the same atomic inode/revalidation checks already in place; identity unavailable, live, fresh, or uncertain records remain fail-closed.
3. Add safe malformed-stale recovery. Parse only an unambiguous PID/identity shape; never reclaim arbitrary malformed or live-owner data merely because it is old. Preserve quarantine, retry, marker cleanup, and surfaced error behavior.
4. Extend board Git synchronization's ignore set for board lock files, owner markers, and stale/quarantine artifacts. Prove with the real ignore/check path that ordinary board tickets/data still sync and operational artifacts do not.
5. Add deterministic regressions for PID reuse, malformed stale recovery, active/live lock preservation, and every new Git-ignore pattern. Do not remove or weaken inherited coverage.
6. Regenerate the committed plugin artifact only if the deterministic repository build requires it, then run focused/full feasible rails, write the report, and prepare a stacked Review PR.

## Out of scope and evidence limits

No source-fetch changes, GUI/provider changes outside board Git ignore, migration redesign, parent merge/verification, or live packaged Windows/multi-machine PID-reuse claim. Any external/live boundary remains INCONCLUSIVE.
