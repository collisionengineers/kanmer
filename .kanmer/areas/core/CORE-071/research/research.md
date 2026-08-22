# Research

CORE-071 originally identified stale snapshot writes in managed `.gitignore`
reconciliation. The cumulative implementation at `c8ee9a4e` now uses the
append-only `O_APPEND` merge from CORE-074: existing human/process lines are
never rewritten, and missing or re-invalidated managed rules are appended.
