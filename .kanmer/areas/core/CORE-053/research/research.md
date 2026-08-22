# Research

PR #173 review found that the claimant-marker cleanup branch catches a lock-read failure and attempts to remove the marker, but its `finally` always rethrows the earlier read error. If marker removal fails (for example a transient Windows EBUSY), the cleanup error is discarded and the marker can remain, making later claimants believe the current process still owns the lock. Reuse the existing `withExclusiveFileLock` cleanup path and error-surfacing conventions; add a deterministic injected-failure regression. The child must preserve CORE-051/CORE-045 cumulative traceability.
