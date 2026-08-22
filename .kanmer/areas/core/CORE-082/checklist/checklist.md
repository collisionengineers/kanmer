# CORE-082 checklist

- [ ] Confirm exact cumulative base a1a4fe629d71d149b64fd3e57979a196176b875a and clean dedicated worktree.
- [ ] Preserve all inherited IO lock assertions and board-sync assertions.
- [ ] Implement PID-reuse-safe owner identity with fail-closed unknown/live behavior.
- [ ] Implement bounded malformed-stale lock recovery without weakening uncertain/live protection.
- [ ] Exclude board lock, owner-marker, and stale/quarantine artifacts from Git synchronization.
- [ ] Add deterministic lock ownership/recovery regressions.
- [ ] Add deterministic Git synchronization/ignore regressions.
- [ ] Run focused core IO and GUI Git tests with exact exit codes.
- [ ] Run relevant build/typecheck/plugin/scripts/diff rails with first failures preserved.
- [ ] Write post-implementation report with findings dispositions and INCONCLUSIVE boundaries.
- [ ] Record commit/PR traceability and move Implementing→Review only after get_doc_gates.
- [ ] Leave post-merge proof unchecked; review/merge/verify/cleanup are outside this author lane.
