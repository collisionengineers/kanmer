# CORE-082 checklist

- [x] Confirm exact cumulative base a1a4fe629d71d149b64fd3e57979a196176b875a and clean dedicated worktree.
- [x] Preserve all inherited IO lock assertions and board-sync assertions.
- [x] Implement PID-reuse-safe owner identity with fail-closed unknown/live behavior.
- [x] Implement bounded malformed-stale lock recovery without weakening uncertain/live protection.
- [x] Exclude board lock, owner-marker, and stale/quarantine artifacts from Git synchronization.
- [x] Add deterministic lock ownership/recovery regressions.
- [x] Add deterministic Git synchronization/ignore regressions.
- [x] Run focused core IO and GUI Git tests with exact exit codes.
- [x] Run relevant build/typecheck/plugin/scripts/diff rails with first failures preserved.
- [x] Write post-implementation report with findings dispositions and INCONCLUSIVE boundaries.
- [x] Record commit/PR traceability and prepare the Implementing→Review handoff.
- [ ] Post-merge proof on main (Review/merge/verify/cleanup are outside this author lane).
