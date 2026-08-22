# CORE-046 open questions

## Resolved

- [x] What stale-lock ownership transition is required? Use a unique same-directory atomic quarantine/rename of the exact stale path; only the successful renamer removes its quarantine inode.
- [x] Which IPv6 ranges are in scope? Reject 64:ff9b:1::/48, 100:0:0:1::/64, and 5f00::/16, preserving all mapped and prior special-use checks.
- [x] What is the implementation base? CORE-045 head 1234264b292e574d38f276b91592ea0b8bef9361, branch core-046-lock-reclaim-race-ipv6, worktree .worktrees/core-046.

## Parked (explicitly deferred)

- Live DNS rebinding between classification and socket connection is INCONCLUSIVE: the existing bounded lookup/fetch seam cannot prove kernel-level connection binding; no broader resolver is introduced in this remediation.
- PID reuse and an exact crash between quarantine and cleanup are INCONCLUSIVE: stale recovery remains conservative and fail-closed, while deterministic tests cover concurrent reclaim ownership.
